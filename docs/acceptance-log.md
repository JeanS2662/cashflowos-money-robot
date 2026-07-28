# Acceptance Log — CashFlowOS AI Agents

Walk of **BUILD-SPEC §10** acceptance tests, run at the Final Integration step.

- **Date:** 2026-07-23
- **Machine:** macOS 26 (Darwin 25.3) · **Node v24.12.0** · npm 11.6.2 · Next.js 16.2.6 (Turbopack)
- **How to read this:** each test is marked **PASS**, **PARTIAL**, or **NEEDS LIVE KEYS (dry-run)**.
  - **PASS** = verified here, end-to-end, with no external keys.
  - **PARTIAL** = the part that *can* be checked without live keys passed; the remainder (real DB / device / CI Node matrix) is called out.
  - **NEEDS LIVE KEYS** = only exercisable with real Telegram + Supabase + Anthropic; the code-paths were verified by reading, and the exact runtime check is handed to the Yong dry-run (`docs/dry-run-brief.md`).
- Anything needing live services is deliberately deferred — a starter repo ships without keys, and the two riskiest paths (the photo race matrix + the bot loop) are what the human tester exercises.

---

## Hard gates (run first, and again at the end)

| Gate | Result | Evidence |
|---|---|---|
| `npm run build` clean | ✅ **PASS** | `✓ Compiled successfully in 1360ms` · `Finished TypeScript` · all **16 routes** compile (incl. `/api/telegram`, `/api/cron-daily`, `/manifest.webmanifest`). The `[CFO] SUPABASE… not set` lines are the *calm-degradation logging* during static gen, not errors. |
| `npx tsc --noEmit` | ✅ **PASS** | Exit code **0**, no diagnostics. |
| `grep -r service_role .next/static` | ✅ **PASS** (empty) | No match in `.next/static`; also empty across `.next/server/app`. The service_role key never reaches a client bundle. |
| `import 'server-only'` in `lib/supabase.ts` | ✅ **PASS** | Line 1 of `lib/supabase.ts`; also on `lib/actions.ts`, `lib/vision.ts`, `lib/bot-tools.ts`. |

---

## The 11 acceptance tests

### 1 · Build clean on Node 20 + latest (26); all routes compile — ⚠️ **PARTIAL**
Built **clean on Node v24.12.0** (this machine), TypeScript clean, all 16 routes compiled. `package.json` pins `engines.node >= 20` and adds no `@vercel/functions` (uses `next/server` `after()`). The **Node 20 + 26 matrix** cannot run on this single-Node box — it is the D5 / CI step. **Action for Yong:** confirm `node -v` ≥ 20 builds clean on the class machines (Homebrew installs 26 — also fine).

### 2 · Fresh clone + placeholder env → connect banner instantly, nothing hangs/500s — ✅ **PASS**
Booted `next start` with **no Supabase env**. `GET /` → **HTTP 200 in 0.077s** (not the ~7s hang the canary guards against). HTML contained the `Supabase not connected — add SUPABASE_URL …` banner; the funnel + money row rendered without a crash. `getRecords()` short-circuits on `!supabaseConfigured` (returns `[]` instantly).

### 3 · Wrong (anon) Supabase key → "use service_role" banner (not an empty dashboard) — ✅ **PASS**
Booted with `SUPABASE_SERVICE_ROLE_KEY=sb_publishable_…` (anon/publishable format) + a real-shaped URL. `GET /` rendered the **"That looks like the anon / publishable key — the dashboard needs the service_role (secret) key"** banner, and did **not** fall through to the "not connected" placeholder banner (`supabaseKeyRole()` correctly returned `anon`). Note: the banner logic short-circuits *before* any query, so a real anon key on a correct URL surfaces the banner fast; the ~7s seen here was only my deliberately-unreachable fake URL hitting the 4s query cap on the dashboard's own data reads.

### 4 · Passcode: wrong rejected; right → cookie; the 3 excluded paths reachable without the cookie; every page locked — ✅ **PASS**
Booted with `APP_PASSCODE` set. No-cookie probes:

| Path | Result | Meaning |
|---|---|---|
| `/` , `/cash-in` | **307 → /login** | pages locked ✓ |
| `/login` | 200 | login reachable ✓ |
| `/api/telegram` | 200 | **excluded** — webhook reachable ✓ |
| `/api/cron-daily` | **401** | **excluded** from the gate, then hit by its *own* fail-closed Bearer guard (a 401, not a 307-to-login, proves both) ✓ |
| `/manifest.webmanifest` | 200 | **excluded** — PWA install never locked ✓ |
| `/manifest.json` | 404 | belt-and-braces *exclusion* (not gated); nothing served there, real manifest is `.webmanifest` ✓ |
| `/icons/icon-192.png` | 200 | excluded ✓ |

Login: **wrong passcode → 401**, **right → 200** with `Set-Cookie: cfo_session=<nonce>.<hmac>; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=lax` — opaque (not the raw passcode). Re-requesting `/` **with the cookie → 200**. Timing-safe compare (`crypto.timingSafeEqual` over equal-length SHA-256 digests) confirmed in `app/api/login/route.ts`.

### 5 · Mobile 375px: bottom bar, no horizontal scroll, tables→cards; PWA installs; funnel renders 5 stages with non-zero seed %s — ⚠️ **PARTIAL**
Headless render at **375×812**:
- **No horizontal scroll:** `documentElement.scrollWidth - clientWidth === 0` on `/` (the densest page — 5-segment funnel + 5 stat tiles) **and** `/leads`. `box-sizing:border-box` + `min-width:0` on every flex child.
- **Bottom tab bar:** `.bottomnav` computed `display:flex` at ≤768px; desktop sidebar hidden.
- **Funnel:** all **5 segments** render; `manifest.webmanifest` serves as `application/manifest+json` with 192/512 + maskable icons, `display:standalone`, theme `#f59e0b`.
- **Tables→cards CSS** verified structurally (`.tbl` → block/stacked cards + `data-label` at ≤768px).
- **Needs live keys/device:** the funnel showing **non-zero seed numbers** (Views 12000 · Leads 2 · Appts 1 · Closed 1 · Nurture 1 — confirmed in `supabase/schema.sql` seeds) and the **physical Add-to-Home-Screen install** on iPhone Safari + Android Chrome require a live Supabase + real phones → Yong dry-run.

### 6 · Photo (above threshold) → propose → Approve/Reject/double-tap/dup/wrong-id/expired/replay — 🔑 **NEEDS LIVE KEYS (dry-run)**
Requires Telegram + Supabase + Anthropic. **Code-paths verified by reading:**
- **Approve = one atomic CAS** — `claim()` in `lib/actions.ts` is a single `UPDATE … WHERE id=$ AND status='proposed' AND expires_at>now() RETURNING *` ("the claim-check pattern"). 0 rows ⇒ "already handled". Never SELECT-then-UPDATE.
- **Double-tap ⇒ once** — second tap loses the CAS → `answerCallbackQuery('Already handled.')`, exactly one `records`/`vault_files` row.
- **Same photo again ⇒ zero vision spend** — sha256 lookup in `vault_files` before the vision call replies "Already filed" and returns.
- **Wrong Telegram id ⇒ refused + echoed** — `isAllowed(fromId)` fail-closed → `Not authorized (your id: …)`.
- **Expired ⇒ refused** — lazy expiry inside the same CAS (`expires_at>now()`), no sweeper.
- **Replayed `update_id` ⇒ single** — `tg_updates` upsert `ignoreDuplicates` at the top of POST; 0 rows ⇒ 200 no-op.
- **Ack-first** — pre-200 work is only {secret, allowlist, dedupe}; all heavy work in `after()` from `next/server`. `maxDuration = 60`.

### 6b · Photo (below threshold) ⇒ 🟢 autopilot + `/undo`; low-confidence ⇒ forced 🟡 — 🔑 **NEEDS LIVE KEYS (dry-run)**
Code verified: the dial `autopilot = isExpense && confidence==='high' && amount <= threshold()` → `runAutopilot('expense', …)` inserts pre-decided → same claim-check → executes once → notifies with `/undo-<id>`. `undoAction()` is a **soft reversal** (posts a negative mirror `records` row + stamps `result.undone`; owner-only; ≤24h; never deletes). Low-confidence (or missing amount/date) forces `confidence:'low'` in `lib/vision.ts` → the 🟡 ask-path with the *"⚠️ Robot unsure"* flag regardless of amount.

### 6c · Bot tool-loop: "cash in this week?" via `get_cash_summary`; "talk to a human" ⇒ escalation — 🔑 **NEEDS LIVE KEYS (dry-run)**
Code verified: `answerWithTools()` runs an Anthropic `tools` loop (≤4 rounds) over `BOT_TOOLS` = `get_cash_summary(period)` / `list_overdue()` / `search_records(query,category?)` / `escalate`. Tool results wrapped as untrusted `<<<DATA…DATA>>>`. `escalate` (frustrated / out-of-scope / failed-twice) ⇒ hand-off reply + `logRun('jarvis','escalated',…)`. No full-table dump.

### 7 · `/api/cron-daily` without Bearer ⇒ 401; with secret ⇒ digest+brief+proposals; `vercel.json` = 1 cron — ⚠️ **PARTIAL**
- **401 without secret ⇒ verified live** (HTTP 401 with no `CRON_SECRET` set — fail-closed `authed = !!secret && header === 'Bearer '+secret`).
- **`vercel.json` = exactly 1 cron ⇒ verified** (`/api/cron-daily @ 0 1 * * *`, with the "1 of 2 Hobby slots; 2nd reserved" comment).
- **With-secret digest+brief+sweep ⇒ needs live keys.** Code verified: the brief mirrors the Dashboard's two rows (`getFunnel()` + money row + 🙋 count/list), optional Jarvis-Oyen narrative only when a key is set, then the `SCHEDULED` registry sweep creates proposals only.

### 8 · No `ANTHROPIC_API_KEY` ⇒ calm 200 everywhere AI is touched; bot ≤ ~5s with a key — ⚠️ **PARTIAL**
- **Calm states verified live:** `GET /api/telegram` → `{"ok":true,…,"anthropicKeySet":false}` HTTP 200 (no spinner/500). `lib/vision.ts` degrades to `unsure()` with no key (no spend, no throw). The cron omits the narrative when the key is absent. The bot text path replies *"add your ANTHROPIC_API_KEY in the N step"* and returns 200.
- **Contract note:** the literal `{ok:false,reason:'no_api_key'}` JSON shape from §1 is realised as the same calm `{ok:false,reason:…}` convention on `/api/login`; the **AI webhooks correctly return 200 to Telegram + send the friendly reply instead** (a webhook returning `{ok:false}` would trigger Telegram retries). The *intent* ("never a spinner or 500") is fully met.
- **Needs live key:** the **≤5s bot reply latency** with a working key → Yong dry-run.

### 9 · `grep -r service_role .next/static` empty; `server-only` present — ✅ **PASS**
Both green (see Hard Gates). No service_role string in any client chunk; `import 'server-only'` guards the four server modules.

### 10 · `scripts/import.mjs` with a messy CSV ⇒ valid rows in, plain-English skip report, no crash — ✅ **PASS (macOS)**
Ran on a 9-row messy CSV (fake-but-present env, so it exercises validate → report → the calm network-fail branch):
- **Mapped** everyday words: `income`→`cash_in`, `demo`→`appointment` stage, `RM 5,000`→5000, forgave `05/08/2026` (DD/MM/YYYY).
- **Skipped with plain reasons:** *"row 3 skipped: no title"*, *"amount 'abc' isn't a number"*, *"category 'frobnicate' isn't one I know"*, *"date '31/31/2026' isn't a real date"*, plus a *"lead stage 'flibberstage' not recognised, set to 'new'"* note.
- **Calm degrade:** ended with *"⚠️ Couldn't reach Supabase (fetch failed). Nothing was imported."* — no stack trace, no crash.
- **Windows parity:** by code inspection only — pure Node (`node:fs`), explicit `\r\n` + UTF-8 BOM handling. A real Windows PowerShell run is a Yong dry-run item.

### 11 · Gallery swap: `_template` → a Sales agent changes ONLY the 4 knobs + one added `registry.ts` line — ✅ **PASS**
Copied `agents/_template` → a scratch "sales-followup" agent and applied the one-prompt knob edits. `diff` showed:
- **`definition.ts`** — only the `👉 CHANGE THIS` lines moved (`key`, `lookAt`); comments/structure intact.
- **`executor.ts`, `README.md`, `my-agent.md`** — **byte-identical** (the 🔒 locked executor stays locked).
Adding one line to `AGENTS`/`EXECUTORS` in `agents/registry.ts` completes the swap. The diff shape is exactly "only the 4 knobs + 1 registry line".

---

## Summary

| Bucket | Tests | Count |
|---|---|---|
| ✅ **PASS** (verified, no live keys) | 2, 3, 4, 9, 10, 11 | **6 / 11** |
| ⚠️ **PARTIAL** (no-key portion passed; remainder = CI Node matrix / live DB / device / live key) | 1, 5, 7, 8 | **4 / 11** |
| 🔑 **NEEDS LIVE KEYS** (code-paths read-verified; runtime handed to Yong) | 6 (+6b, 6c) | **1 / 11** |

**Both hard gates green:** build clean · `tsc` 0 · no service_role leak · `server-only` present.
**Nothing failed.** The only items not fully green are the ones that *cannot* be green without external services or a second Node/OS/device — all captured in `docs/dry-run-brief.md`.
