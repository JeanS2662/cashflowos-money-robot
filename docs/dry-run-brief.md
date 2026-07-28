# CashFlowOS AI Agents — Dry-Run Brief for Yong

**Repo:** https://github.com/claude-malaysia-glcc/cashflowos-starter (Use this template → your own copy)
**Your job:** be a paying founder at the **Cashflow OS 2-Day Challenge** and build the whole **Money Robot** A→Z — twice (Day 1 ships it; Day 2 you build your own agent + try to break it). Find the walls *before* the room of 7 founders does.
**Time budget:** ~2h for a clean Day-1 run, ~1h for Day-2. Log everything — your confusion is the bug.

> **What's different from GLCC (read this):** CashFlowOS is **mobile-first + passcode-locked** and it has **AI Employees that ask before they act**. Expect: a **/login passcode gate**, **10 tabs**, a **Dashboard funnel** (Views → Leads → Appointments → Closed → Nurture) over a money row, an **Add-to-Home-Screen phone app**, a **Telegram bot that files receipts** (the Expense agent ships **ON**), and an **Approvals tab** with ✅/❌ buttons. There is **ONE** daily cron, not two.

---

## 0 · Mindset

You are roleplaying a **founder who has never coded and never deployed anything**. That's the real room.
- **Don't use developer shortcuts.** If the step says "tap the button," tap it.
- **Your "wait, which key?" moment is a finding** — write it down even if you recover in 20s.
- **Time each phase.** Slow = a finding.
- **Do Day 1 on your phone as much as possible** — the whole promise is "your business in your pocket."

---

## 1 · Before you start — accounts + machine (all free)

| Thing | Why | Watch out |
|---|---|---|
| **GitHub** | your copy of the code + deploy | Use **"Use this template"**, not a clone of the original (you can't push to the original). |
| **Supabase** | your database + private photo **Vault** bucket | Free tier = **max 2 projects**/org. The schema also makes a **`vault` storage bucket** — if it doesn't appear, make one named `vault` (Public **OFF**), 2 clicks. |
| **Vercel** | the live site | Sign in **with GitHub**. Free **Hobby** = **max 2 crons**; this repo uses **exactly 1** (2nd reserved on purpose). |
| **Anthropic Console** | the key for the photo reader + Jarvis bot | **Must have credit** (~USD $5 / RM23) or every AI surface shows a calm "add your key," and the bot won't answer. |
| **Telegram** (phone) | where the bot + receipt filing live | You'll message **@BotFather** (make a bot) and **@userinfobot** (your numeric id). |

**Day-0 green-light self-check:** `node -v` ≥ **20** AND `claude --version` both print a version, and your Anthropic key has credit. (Homebrew installs Node 26 — fine.)

**Map of the class → this brief:**

| Class block | This brief |
|---|---|
| D1 · O·Organize (Supabase) | Phase 2 |
| D1 · E·Expose (dashboard + 📱 Add to Home Screen) | Phase 3–4 |
| D1 · N·Navigate (Telegram + the Expense agent already ON) | Phase 5 |
| D1 · Everyone builds the **Vault** photo agent + tests approve/reject/double-tap | Phase 6 |
| D1 · Y·Yield (the daily brief cron) | Phase 7 |
| D2 · Swap a **Gallery** agent to your industry (the 4 knobs) | Phase 8 |
| D2 · **Red-team** — try to break the approvals | Phase 9 |

---

# DAY 1 — Robot LIVE + your first AI Employee

### Phase 1 — Get the code ⏱️ ~5 min
- GitHub → open the repo → **Use this template → Create a new repository** → name it `cashflowos-yourname` → clone **your** copy.
- ✅ **Pass:** you have a folder that is **your** repo.
- ⚠️ **Watch:** cloning the *original* (not your template copy) → you can't push in Phase 4.

### Phase 2 — O · Supabase ⏱️ ~15 min
1. Supabase → **New project** → region **Singapore** → save the DB password.
2. **SQL Editor → New query →** paste **all** of `supabase/schema.sql` → **Run**.
3. Copy **Project URL** (Settings → Data API → Project URL — the **base** URL, *not* `…/rest/v1`) and the **service_role** key (Settings → API Keys → service_role → **Reveal**).
- ✅ **Pass:** schema ran; it seeds **20 demo rows** so no tab is empty, **1 pending approval**, and a **`vault` bucket**.
- ⚠️ **Watch — the #1 trap:** copying the **anon / publishable** key instead of **service_role**. If the app later looks empty, it's almost always this — and the app *tells you* ("that looks like the anon key") rather than showing a silent empty dashboard. Note how many clicks it took to find the service_role key.
- ⚠️ Re-running the SQL is **safe** (never duplicates/deletes). A new empty `meta`/`counters` column is expected.

### Phase 3 — E · Run it locally + the passcode ⏱️ ~15 min
```bash
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```
Fill in `.env`: the two Supabase values **and** invent an **`APP_PASSCODE`** (your door lock). Then:
```bash
npm run dev               # http://localhost:3000
```
- ✅ **Pass — you're asked for the passcode at `/login`, then the app renders REAL data:**
  - **10 tabs** (bottom bar on the phone; sidebar on desktop): Dashboard · Cash In · Cash Out · Leads · Customers · Content · Tasks · Approvals · AI Employees · Vault.
  - **Dashboard funnel** shows **Views 12,000 → Leads 2 → Appointments 1 → Closed 1 → Nurture 1**, with **conversion %** between stages (Leads→Appts **50%**, Appts→Closed **100%**, Closed→Nurture **100%**; Views→Leads shows **0%** — that's correct: 2 leads against 12k views rounds to 0).
  - **The money row:** Cash In **RM 10,600** · Cash Out **RM 533** · Net **RM 10,067** · Who Owes Me **RM 5,600** · **🙋 Needs your YES = 1**.
  - **Approvals** tab shows **1 pending** proposal (a **RM269 Office Depot** expense — over the RM200 line).
- ⚠️ **Watch — REGRESSION CANARY #1:** open `localhost:3000` **before** filling Supabase → you must get the **"Supabase not connected" banner instantly**. **If any page takes ~7 seconds, log it loudly** — that hang is the exact regression this starter fixed.
- ⚠️ **Watch:** no passcode set at all → the app must show a **calm setup note**, not lock you out and not crash.

### Phase 4 — Deploy to Vercel + 📱 Add to Home Screen ⏱️ ~20 min
```bash
git add -A && git commit -m "my cashflowos build" && git push
```
1. Vercel → **Add New → Project** → import your repo.
2. **Before deploying**, add **every** line from your `.env` (exact names). `CRON_SECRET` is **required** — invent a long random string.
3. Deploy → open the live URL on your **phone** → enter the passcode → **Add to Home Screen** (iPhone: Share → Add to Home Screen · Android: Install app).
- ✅ **Pass:** the icon installs; opening it launches **full-screen** (no browser bars); the same 10 tabs + funnel show.
- ⚠️ **Watch — REGRESSION CANARY #2 (mobile):** at phone width there must be a **bottom tab bar** and **no left-right (horizontal) scroll** on any tab. Tables become stacked cards. A sideways-scrolling page = a finding.
- ⚠️ **Watch:** env-var name typos / forgetting to **Redeploy** after adding vars → broken live site.
- ⚠️ **Watch — REGRESSION CANARY #3 (the locked-door fire):** on the **live** site, opening `…/manifest.webmanifest` must load the manifest (JSON) **without** asking for the passcode — if it redirects to `/login`, Add-to-Home-Screen silently breaks. Same for `/api/telegram` (should load a small JSON status, not `/login`).

### Phase 5 — N · Telegram + the Expense agent (ships ON) ⏱️ ~20 min
1. `@BotFather` → `/newbot` → token · `@userinfobot` → your numeric id.
2. In **Vercel**, add `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_USER_IDS` (your id), `OWNER_CHAT_ID` (your id) → **Redeploy**.
3. `npm run webhook:set -- https://YOUR-APP.vercel.app` → `npm run webhook:info` ("last_error_message" should be empty).
4. Open the bot → press **Start** → text **"how much cash in this week?"**
- ✅ **Pass (the bot's brain + hands):** it answers grounded in your data (it should reach for a tool, not dump the whole table).
- ✅ **Pass (graduated autonomy — the money shot):** send a photo of a **small receipt (≤ RM200)** → the robot **auto-files it 🟢** and replies *"✅ Filed RM45 · Meals — reply /undo-<id> within 24h"*. Send a receipt **over RM200** → it **asks first 🟡** with **✅ Approve / ❌ Reject** buttons. Tap **Approve** → it files it and confirms. This is the whole "dial, not leash" idea — verify both behaviours.
- ⚠️ **Watch — REGRESSION CANARY #4 (bot speed):** a bot reply should land in **≤ ~5s**. A ~19s hang is the old bot-memory regression → log it.
- ⚠️ **Watch — REGRESSION CANARY #5 (calm no-key states):** **before** you add `ANTHROPIC_API_KEY` (or if it has no credit): texting the bot must reply a **calm "add your ANTHROPIC_API_KEY" message** (never a spinner, never a red error); sending a photo must degrade calmly too. Never a crash.
- ⚠️ **Watch:** **"Not authorized (your id: …)"** = your numeric id isn't in `TELEGRAM_ALLOWED_USER_IDS`. You **must press Start** once.

### Phase 6 — Everyone builds the **Vault** photo agent + tests it ⏱️ ~30 min
The whole room files a receipt through the same Human-In-The-Loop rails. Send a receipt photo, then run the **once-only** checks:
- ✅ **Pass:** an over-threshold receipt makes **1 proposal** → **Approve** creates **exactly one** Cash Out row **and** one Vault file + an audit line in **Approvals → History**.
- ✅ **Pass (double-tap):** tap **Approve twice fast** → the second tap says **"Already handled"** and there is still **exactly one** row. (No double-spend, ever.)
- ✅ **Pass (reject):** on a new receipt, tap **Reject** → **nothing** is stored, and it's logged.
- ✅ **Pass (same photo again):** re-send the identical photo → **"Already filed"**, and it does **not** spend another vision read.
- ✅ **Pass (in-app parity):** the same **Approve/Reject** on the **Approvals tab** does the same thing, and it **strips the buttons** off the Telegram message too.
- ⚠️ **Watch:** a PDF should be handled calmly (it becomes a "file this document?" ask, not a crash).

### Phase 7 — Y · The daily brief cron ⏱️ ~10 min
- `vercel.json` schedules **ONE** cron (`/api/cron-daily`, 09:00 MYT). **Vercel → Cron Jobs must list exactly 1** (the 2nd Hobby slot is reserved on purpose — *not* a bug).
- Test now: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-APP.vercel.app/api/cron-daily` → a Telegram brief lands showing **the funnel + the money + what needs your YES** (mirrors the Dashboard).
- ✅ **Pass:** hitting it **without** the Bearer secret returns **401** (it can spend credit, so it fails closed).
- ⚠️ **Watch:** `OWNER_CHAT_ID` must be a **single** id, no commas. No brief = check that + press Start again.

> ### ✅ Day-1 gate (all true): live URL · **locked** phone app (passcode + full-screen install) · **no 7s hang, no horizontal scroll, calm no-key states** · live Jarvis · the **Expense agent auto-files small / asks big** · the **Vault** agent built + approve/reject/double-tap tested · 1 daily brief. If any regression canary trips, that's a **🔴 finding**.

---

# DAY 2 — Your own AI Employee + break it + sell it

### Phase 8 — Swap a Gallery agent to YOUR industry (the 4 knobs) ⏱️ ~40 min
1. Open `agents/gallery/` → pick the agent closest to your business (Finance Overdue-Invoice Chaser, Sales Cold-Lead, Marketing Content Approval, HR Leave/Claim, Insurance Renewal Nudge, Real-Estate Viewing Follow-up).
2. In Claude Code, paste **the one prompt** (verbatim from `agents/_template/README.md`):
   > `Copy agents/_template into agents/<my-agent-name>, fill it from my my-agent.md — change ONLY the four 👉 knobs — and add my agent's one line to agents/registry.ts. Show me the diff before applying.`
3. Review the diff, apply, redeploy.
- ✅ **Pass:** the diff changes **only the 4 `👉` knobs** (in `definition.ts` + `prompt.ts`) **plus one added line** in `registry.ts` — **`executor.ts` is untouched**. Your new agent appears on the **AI Employees** tab, and (for a `daily` agent) the next cron drafts a proposal for it.
- ⚠️ **Watch:** every gallery agent **drafts** the customer message for **you** to send — none send on their own. Confirm the result says "draft ready … nothing was sent."
- ⚠️ **Watch:** if Claude edits `executor.ts` or any 🔒 file, stop and log it — the skeleton is supposed to be un-editable-by-accident.

### Phase 9 — Red-team the approvals (try to break it) ⏱️ ~20 min
Prove the safety rails hold. Each should **refuse safely and leave the audit trail intact**:

| Attack | Expected |
|---|---|
| **Double-tap** Approve on one proposal | second tap "already handled"; **one** action runs |
| **Edited amount** — expect to change a proposal's number then approve | you **can't**; the payload is immutable — a changed amount needs a **new proposal** |
| **Wrong person** — a Telegram id **not** on the allowlist taps a button | **refused + the id is echoed back** |
| **Expired** — approve a proposal after its expiry | **refused** (expiry is checked inside the claim) |
| **Replayed webhook** — the same Telegram update arrives twice | processed **once** (deduped) |
| **Reject** then try to approve the same one | second action refused — already decided |
| **Move money / delete a record / auto-message a customer** | **no button, no command, no code path exists** for it — 🔴 zone is welded shut |

- ✅ **Pass:** every row above behaves as "Expected." A failed executor surfaces in **Approvals → History** + Telegram — it never silently retries.
- Full list: `docs/red-team-checklist.md` + `docs/security-checklist.md`.

> ### ✅ Day-2 pass rubric (all true): your own industry agent (swapped, not built from scratch) · a trigger → an AI proposal → **one action that pauses for approval** · **approve AND reject** tested · **survives the red-team** · saved result + audit line · a Telegram interaction · the daily brief. *A static dashboard or a fake chatbot does NOT pass.*

---

## The regression canaries (the 5 that must never come back)

| # | Canary | The pass |
|---|---|---|
| 1 | **Instant connect banner** | Placeholder/no Supabase → the "not connected" banner appears **instantly**, never a ~7s hang. |
| 2 | **No horizontal scroll / mobile app** | 375px phone width → bottom tab bar, tables→cards, **zero** sideways scroll; installs full-screen. |
| 3 | **Calm no-key states** | No `ANTHROPIC_API_KEY` → every AI surface (bot text, photo, cron narrative) shows a calm "add your key" and returns 200 — **never a spinner, never a red 500**. |
| 4 | **Locked-door exclusions** | On the live site, `/manifest.webmanifest`, `/api/telegram`, `/api/cron-daily` load **without** the passcode; every *page* redirects to `/login` without the cookie. A locked webhook = class-day fire. |
| 5 | **Bot ≤ ~5s + once-only** | Bot replies in ≤ ~5s (not ~19s); double-tap Approve files **exactly one** row. |

---

## Success checklist — tick every box

**Day 1**
- [ ] Used **Use this template** → my own repo, cloned
- [ ] Supabase project made, `schema.sql` ran (20 rows + 1 pending approval + `vault` bucket), **service_role** key copied (not anon)
- [ ] `npm run dev` → **/login** asks for passcode → 10 tabs render
- [ ] Dashboard shows **Cash In RM 10,600 · Cash Out RM 533 · Net RM 10,067 · Owed RM 5,600 · 🙋 1** and the **5-stage funnel**
- [ ] Pages load **instantly** (no 7s hang); no-key AI surfaces are calm
- [ ] Deployed to Vercel (all env incl. **CRON_SECRET**); **Add to Home Screen** installs full-screen; **no horizontal scroll**
- [ ] `/manifest.webmanifest` + `/api/telegram` reachable **without** login
- [ ] Bot answers "cash in this week?" in ≤5s; **small receipt auto-files 🟢, big receipt asks 🟡**
- [ ] Vault agent: **approve = 1 row · double-tap = 1 row · reject = nothing · same photo = "already filed"**
- [ ] Vercel shows **exactly 1 cron**; `/api/cron-daily` → **401 without** the secret, brief **with** it

**Day 2**
- [ ] Swapped a Gallery agent via the one prompt — diff = **only the 4 knobs + 1 registry line**, `executor.ts` untouched
- [ ] My agent drafts (never sends) a customer message
- [ ] Red-team: double-tap, wrong-id, expired, replayed update, reject-then-approve all **refuse safely**
- [ ] There is **no** path to move money / delete / auto-message a customer

**Overall pass = a never-deployed founder could do all of this in the two sessions without getting stuck.**

---

## Known traps (confirm whether they still bite)

1. **service_role vs anon key** → the app should say "that looks like the anon key," not show a silent empty dashboard. *(How hard was service_role to find?)*
2. **7-second hang** if Supabase isn't wired → must be an **instant banner**. Any 7s = regression.
3. **Passcode locks a door it shouldn't** → `/manifest.webmanifest` or `/api/telegram` redirecting to `/login` = broken install / dead webhook.
4. **Horizontal scroll on the phone** → any tab that scrolls sideways at 375px.
5. **Add-to-Home-Screen doesn't go full-screen** (opens in Safari with bars) → manifest/icons issue.
6. **Anthropic key with no credit** → bot + photo reader error instead of a calm message.
7. **~19s bot reply** → the old bot-memory hang.
8. **`vault` bucket missing** → the app should show a calm "create a bucket named vault" banner, not crash the Vault tab.
9. **Vercel env typos / forgot to Redeploy** → broken live site.
10. **CRON_SECRET missing** → `/api/cron-daily` returns 401 (this is correct/fail-closed, not a bug) — but the daily brief won't fire until it's set in Vercel.
11. **Two crons** → Hobby caps at 2; this repo ships **1** on purpose. Seeing 1 is correct; a frequency warning = flag.
12. **Windows PowerShell** → `Copy-Item .env.example .env`; `npm run import` should behave the same as on Mac (pure Node). Note any difference.

If you hit something **not** on this list — that's the gold. Flag it clearly.

---

## How to log a finding (copy per issue)

> **#** (number them)
> **Day/Phase:** D1-P5 etc.
> **Step:** what you were doing
> **Expected:** what this brief said
> **Actual:** what happened (paste exact error text)
> **Severity:** 🔴 blocker / 🟠 confusing-but-recovered / 🟡 cosmetic
> **Time lost:** ~X min
> **Screenshot:** attach — every error and every "wait, what?" is gold

Keep one running note and send it to Kingsley. If a 🔴 blocker stops you >10 min, screenshot + message him rather than burning an hour — a blocker that stops **you** will stop the whole room.

---

## Appendix — what "working" data looks like (the 20 seed rows)

- **Cash In (3):** Acme retainer **RM5,000** (paid) · Invoice #014 Lai **RM2,400** (waiting/overdue) · Invoice #015 Cendana **RM3,200** (waiting). → Cash In **10,600**, Owed **5,600**.
- **Cash Out (3):** Meta Ads **RM450** · Lunch **RM45** (🟢 auto-filed) · Notion **RM38**. → Cash Out **533**.
- **Leads — one per funnel stage:** Daniel Tan (**new**) · Aisha Rahman (**contacted**) · Keith Lim (**appointment**) · Beta Trading (**closed**) · Mei Wong (**nurture**). → funnel Leads 2 · Appts 1 · Closed 1 · Nurture 1.
- **Customers (2):** Beta Trading · Caremetic (owes RM1,500).
- **Content (3):** a reel (**12,000 views** → the funnel's Views) · a carousel · an **ad**.
- **Tasks (2):** Follow up Keith · Send July invoices (**overdue**).
- **Doc (1):** SSM registration cert.
- **1 pending approval:** RM269 Office Depot expense (**> RM200** → the classic 🟡 "ask first" demo → 🙋 count = 1).

If your Dashboard reads **Cash In RM 10,600 · Cash Out RM 533 · Net RM 10,067 · Owed RM 5,600 · 🙋 1** and the funnel shows **12,000 → 2 → 1 → 1 → 1**, the data layer is wired correctly.
