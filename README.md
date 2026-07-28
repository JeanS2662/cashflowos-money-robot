# CashFlowOS AI Agents — your Money Robot 🤖💰

> **You're not learning AI. You're hiring a robot employee.**
> It watches your business river, files your paperwork, and asks before it touches money.
> Today you hire it. Tomorrow you train it. Then it works for you forever.

Your whole business on one phone screen — a **mobile AI HQ** (dashboard + add-to-home-screen app), a **Telegram Jarvis** you can text, and **AI Employees that ask before they act**.

Everyone at the **Cashflow OS 2-Day Challenge** ships this identical starter on Day 1 — live dashboard, phone app, Telegram bot, and a working receipt agent — then makes it their own on Day 2 by turning **4 knobs** on a locked, safe skeleton.

---

## 🖐️ The one rule (say it with your hand — LATAR)

Every robot in here works the same 5 steps:

1. **LOOK** 👀 — it watches your stuff
2. **ASSESS** 🤔 — "something needs doing"
3. **ASK** 🙋 — it raises its hand: "Boss, can I?"
4. **ACT** ⚡ — only after your YES, and only **once**
5. **RECORD** 📝 — everything goes in the diary (the audit trail)

## 🎚️ The dial, not the leash

A good employee doesn't ask permission to staple paper — but they **must** ask before spending your money.

- 🟢 **Small + reversible → it just does it**, then tells you (file a RM45 receipt, back up a photo). There's an undo.
- 🟡 **Consequential → it asks first** (RM269 is over your RM200 line → 🙋 it buzzes you).
- 🔴 **Never-ever** (move money, delete records, message a customer alone) — the robot literally *can't*. It's welded shut.

**The RM200 line is a DIAL you set** (`EXPENSE_APPROVAL_THRESHOLD`). New robot → dial low. Trusted robot → dial up. *You don't approve everything — you set the dial.*

---

## 🚀 Quickstart — the OYEN order

Four letters, in order. By **lunch on Day 1** you're through O, E and N.

### The easy way (with the Chrome extension)
Paste this into Claude, turn the Chrome extension ON, and it walks you through every click:

```
You're my hands-on setup co-pilot for CashFlowOS AI Agents — my "Money Robot" web app.
I've never coded. Use the Chrome extension to open pages and do the clicks WITH me,
ONE step at a time. Never type my passwords or secret keys — stop and let me do those.
Start by opening https://github.com/claude-malaysia-glcc/cashflowos-ai-agents and
helping me click "Use this template" to make my own copy. Then take me through
O (database) → E (deploy + phone app) → N (bot) → Y (daily brief), one step at a time.
```

### The manual way (4 steps)

**O — Organize** (give it a memory)
1. Click **Use this template** on `github.com/claude-malaysia-glcc/cashflowos-ai-agents` → make your own repo → clone it.
2. `npm install`, then `cp .env.example .env`.
3. Make a **free** Supabase project. Open the **SQL Editor**, paste all of `supabase/schema.sql`, click **Run** (this builds your 5 tables + your private photo Vault, and seeds demo data so no tab is empty).
4. In `.env`, fill `SUPABASE_URL` (Settings → Data API → Project URL, **base URL only**) and `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys → service_role → Reveal). Also make up an `APP_PASSCODE` — that's your app's door lock.

**E — Expose** (give it a face + put it on your phone)
5. `npm run dev` → open `localhost:3000` → enter your passcode → you should see 10 tabs and the **Dashboard funnel** (Views → Leads → Appointments → Closed → Nurture) with a money row underneath.
6. Deploy on Vercel: import your repo, add **every** variable from your `.env`, deploy.
7. Open your live URL on your phone → **Add to Home Screen** (iPhone: Share → Add to Home Screen · Android: Install app). Your business is now an app with a lock on the door.

**N — Navigate** (give it a mouth + its first robot)
8. Telegram: `@BotFather` → `/newbot` for a token · `@userinfobot` for your numeric ID.
9. In **Vercel** add `ANTHROPIC_API_KEY` + the Telegram keys + a made-up `CRON_SECRET` → **Redeploy** (env changes need a redeploy).
10. `npm run webhook:set -- https://YOUR-APP.vercel.app` → press **Start** in your bot → send `/help` to see everything it can do, then ask it *"how much cash in this week?"*. The **Expense agent is already ON**: send a small receipt (auto-files ✅) and one over RM200 (it asks 🙋). Full capability list below in **🤖 Meet Jarvis**.

**Y — Yield** (give it an alarm clock)
11. Your daily brief is scheduled (`vercel.json` — every morning it texts you the funnel + the money + what needs your YES). One cron slot used; the second is reserved on purpose (Vercel Hobby allows two).

---

## 🤖 Meet Jarvis — the agentic Telegram bot

Jarvis isn't just a money Q&A bot anymore. It now answers a wide range of ops questions **and** can take safe actions through the same approval engine that files your receipts.

Send `/help` any time for its capability card:

```
💰 Money — "cash in this week?" · "who owes me?" · "overdue invoices?"
🏞️ Pipeline — "open leads?" · "pipeline value?" · "pending vs won?"
✅ Tasks — "what's due this week?" · "add task: chase supplier Friday"
📣 Content — "what's scheduled?"
🤝 People — "who do I follow up with?"
🚨 Triage — "what needs my attention today?"
```

And it can **DO** things, through the same dial as every robot in here:
- 🟢 **Small stuff it just does** — add a task, add a lead, log a small expense — always with an `/undo`.
- 🟡 **Money stuff it proposes** — log cash in, mark an invoice paid, move a lead's stage, an expense over your line — you tap ✅ Approve before anything writes.
- 🔴 **It never messages your customers.** Ask it to draft a follow-up and it hands you copy-paste text — there's no send button in its hands.

Ask it multi-part questions — *"who do I need to chase, and how much do they owe me?"* — and it chains tool calls to answer both halves. It remembers the last few turns too, so *"...and last month?"* just works.

Every question, every action, every zone, with example answers — that's the facilitator/demo script at **[`docs/bot-playbook.md`](./docs/bot-playbook.md)**.

---

## 📥 Feed it YOUR business

Day 1 you play with demo data. Then you drop in your own 10–20 rows.

**In Claude Code, just say:**
```
Here are my real business numbers [paste rows / drop your CSV]. Import them into my
Supabase records table using scripts/import.mjs. Show me what you'll import first,
and tell me in plain words anything you skipped.
```

**Or run it yourself:**
```bash
npm run import -- docs/sample-import.csv     # try the built-in sample first
npm run import -- my-numbers.csv             # then your own file
```

Model your file on **[`docs/sample-import.csv`](./docs/sample-import.csv)** — columns `title, category, amount, status, due_date, notes` (plus optional `customer, platform, format, views, potential, next`). The script forgives everyday words (`income` → `cash_in`, `expense` → `cash_out`), reads `RM 1,200` and `15/08/2026`, and **tells you in plain English why it skipped any bad row** — e.g. *"row 7 skipped: amount 'abc' isn't a number"*. Nothing is ever deleted.

**Add a whole new tab** with the copy-paste prompt in **[`docs/add-a-tab-prompt.md`](./docs/add-a-tab-prompt.md)** — it updates both the desktop sidebar and the mobile bottom nav.

---

## 🎛️ Build your OWN AI Employee — the 4 knobs

Every robot is the same machine with four knobs. The dangerous parts are welded shut, so you only ever change these:

| Knob | Question | Where |
|---|---|---|
| **WHEN** | does it wake up? | `definition.ts` 👉 |
| **WHAT** | does it look at? | `definition.ts` 👉 |
| **WHAT** | does it suggest? | `prompt.ts` 👉 |
| **WHEN** | must it ask you? | `definition.ts` 👉 |

Copy the skeleton and turn the knobs — the one prompt (verbatim from `agents/_template/README.md`):

```
Copy agents/_template into agents/<my-agent-name>, fill it from my my-agent.md —
change ONLY the four 👉 knobs — and add my agent's one line to agents/registry.ts.
Show me the diff before applying.
```

Pick a starting point from **`agents/gallery/`** — 7 filled examples across Finance, Sales, Marketing, HR, Insurance, and Real Estate. Every one of them **drafts** the message for you to send. None of them send on their own.

---

## 🔒 Safety, in one line

**AI proposes. You approve. Code executes — exactly once — and writes it down.**

The rails that keep it safe (see `docs/security-checklist.md`):
- **Golden Rule in code** — 🔴 actions (move money, delete, message customers) don't exist in any executor. Not even with approval.
- **One YES = one action** — double-tap Approve and the second tap says "already handled". No double-spend, ever.
- **Locked doors** — Telegram allowlist (fail-closed), webhook secret, fail-closed cron, private photo bucket, service_role key kept server-only.
- **A lock on the door** — the whole app sits behind a passcode. It's a lock, not a bank vault — but nothing is public.

Files you're meant to edit are marked **👉**. Files that keep your robot safe say **🔒 don't edit** at the top.

---

## 🗂️ What's in the box

```
app/            the 10 tabs + Telegram webhook + daily cron + passcode gate (proxy.ts)
lib/            the shared spine — Supabase, records, the CAS approval engine, vision
agents/         vault (photo→file) · expense (ships ON) · _template (your 4 knobs) · gallery (7)
scripts/        import.mjs · set-webhook.mjs · webhook-info.mjs   (all pure Node — Mac + Windows)
docs/           the framework, the canvas, the checklists, the bot playbook, the sell-it one-pager, sample CSV
supabase/       schema.sql — paste once, run once
```

The complete build contract lives in **[BUILD-SPEC-V2.md](./BUILD-SPEC-V2.md)**.

---
© Claude Malaysia · Use this template → make it yours. Your data stays in **your** Supabase and your gitignored `.env` — this repo is code only.
