# 📸 The Vault — the Day-1 build-together agent

Send a receipt or PDF to your Telegram bot → the Vault reads it, files it, and either
files it on its own (🟢) or asks you first (🟡). This is the class's central
walkthrough of the **LATAR loop**: **LOOK 👀 → ASSESS 🤔 → ASK 🙋 → ACT ⚡ → RECORD 📝**.

The live code is the ack-first pipeline in `app/api/telegram/route.ts`
(`runVaultPipeline`). Here's every step, mapped to its LATAR letter.

---

## The pipeline, step by step (with the LATAR letter for each)

**ACK-FIRST (before any of this):** the webhook does only three cheap things —
checks the secret header, checks your Telegram id (fail-closed allowlist), and
records the `update_id` in `tg_updates` — then **returns `200` immediately**. All the
work below runs inside `after()` so Telegram never retries and never double-files.

| # | Step | LATAR |
|---|------|-------|
| 1 | Pick the file — largest photo size, or the document | 👀 **LOOK** |
| 2 | **Size guard**: reject > 8 MB *before* downloading (cheap) | 🤔 **ASSESS** |
| 3 | **MIME allowlist**: only JPG / PNG / PDF get read | 🤔 **ASSESS** |
| 4 | `getFile` → download the bytes NOW (the link expires ~1h) | 👀 **LOOK** |
| 5 | **sha256** the bytes; already in `vault_files`? → "already filed", stop (no vision spend) | 🤔 **ASSESS** |
| 6 | **Daily vision cap** (per chat, via `bot_memory`) — over it ⇒ friendly stop | 🤔 **ASSESS** |
| 7 | **ONE vision read** (`lib/vision.ts`) → a small structured form `{amount, merchant, date, confidence…}`, not an essay | 👀 **LOOK** + 🤔 **ASSESS** |
| 8 | **Server-side validation**: clamp the amount to sane RM bounds, force `confidence:'low'` if the amount/date are missing (never trust the model) | 🤔 **ASSESS** |
| 9 | Upload the original to the **private `vault` bucket** (signed-URL access only) | ⚡ **ACT** |
| 10 | **The dial** — 🟢 `amount ≤ threshold` AND confident ⇒ autopilot; 🟡 else ⇒ propose + buttons ("⚠️ robot unsure" if low-confidence) | 🙋 **ASK** |
| 11a | 🟢 **AUTOPILOT**: `runAutopilot` files it once + notifies you *"✅ Filed … reply /undo-&lt;id&gt;"* | ⚡ **ACT** + 📝 **RECORD** |
| 11b | 🟡 **ASK-FIRST**: `proposeAndNotify` sends ✅/❌ buttons; on your YES the executor files it once | 🙋 **ASK** → ⚡ **ACT** → 📝 **RECORD** |
| 12 | Every filed action writes a `records` row (+ a `vault_files` row) and an `agent_runs` audit line | 📝 **RECORD** |

---

## Why each guard exists (the safety story)

- **Ack-first** → Telegram retries un-acked webhooks; without the fast 200 + dedupe
  you'd file the same receipt several times.
- **Hash before vision** → a re-sent photo costs **zero** — we recognise the exact
  bytes and skip the paid read.
- **Daily cap** → a stuck or spammy sender can't run up your Anthropic bill.
- **Server-side validation** → the photo is **untrusted input**; we never file a
  number the model made up, and an unreadable total is forced to the 🟡 ask-path.
- **Private bucket + signed URLs** → filed files are never public; links die in ~1h.

## The knobs (what you're allowed to change)
- `definition.ts` 👉 — WHEN / LOOK-AT / ASK-BEFORE.
- `prompt.ts` 👉 — the words on the ask card.
- `executor.ts` 🔒 — the locked, once-only file-a-receipt funnel. Don't edit.
- **The dial** = `EXPENSE_APPROVAL_THRESHOLD` (env, default RM200).
