# Robot Safety School 🔒

> *"A strong robot with no rules is dangerous."*
> Your CashFlowOS robot is powerful — it reads your money, files your paperwork, buzzes your
> phone. This page is the 5 rules that keep it safe, plus the locks on the doors.
> **Good news: all of this is already built.** This checklist is so you can *see* it and
> *trust* it — not homework you have to wire yourself.

---

## The 5 Rules (the ones that matter most)

### 1. The Golden Rule lives in the CODE, not a promise 📜
> **ASK before SPEND or SEND.**
The robot doesn't "try to remember" to ask. Anything over your threshold, anything
customer-facing, becomes a **proposal** that physically waits for your YES. No YES = no action.
It's not a policy — it's how the machine is wired.
- [ ] I understand: a proposal with no approval never runs. Ever.

### 2. Some things are NEVER autonomous — welded shut 🔴
Three actions do **not exist** in any executor, so the robot can't do them even if tricked
or even if you accidentally approve:
- **Move money** (pay, transfer, refund) — you do that yourself, always.
- **Delete** anything — "undo" makes a *reversal* entry; nothing is ever hard-deleted.
- **Message a customer on its own** — it *drafts*; YOU press send.
- [ ] I understand: these aren't "ask harder" — they're not built at all.

### 3. The secret key stays on the server 🗝️
Your Supabase `service_role` key is a master key to your whole database. It lives **only**
on the server (`lib/supabase.ts` starts with `import 'server-only'` — the build itself
refuses to let that key reach a phone or browser).
- [ ] I never paste the `service_role` key into a page, a chat, or the front-end.
- [ ] I checked: `grep -r service_role .next/static` finds **nothing** after a build.

### 4. Approvals are tight: one id · one expiry · once · never changed 🎫
Every proposal is a ticket with four guards:
- **One id** — the approval is tied to that exact proposal, nothing else.
- **One expiry** — old proposals go stale and are refused (no approving yesterday's ask).
- **Once** — the claim-check means the first Approve wins; every later tap gets "already handled."
- **Never changed** — the payload is frozen when created. Want a different amount? That's a
  **new proposal**, not an edit. (You can't approve RM200 and have it spend RM2,000.)
- [ ] I understand: approving twice can't act twice.

### 5. The doors are locked 🚪
| Door | The lock |
|------|----------|
| Your app pages | **Passcode gate** (`proxy.ts`) — a lock on the door. No passcode, no entry. |
| The Telegram bot | **Allowlist** — only your numeric Telegram id(s) can command or approve. Wrong id → refused + the id is echoed to you. |
| The webhook | **Secret header** — Telegram must send the right secret or it's ignored. |
| The daily cron | **Fail-closed** — no `CRON_SECRET`, or wrong one → 401. It can spend/credit, so it never runs open. |
| The photo Vault | **Private bucket** — no public URLs. Photos are shown only via short-lived signed links the server makes. |
- [ ] All five locks are on.

---

## Setup safety checklist (do this once, when you deploy) ☑️

- [ ] **`APP_PASSCODE` is set** and it's not "1234" or "password". This is your front-door lock.
- [ ] **`service_role` key** is in Vercel env only — never committed, never in the browser.
- [ ] **`TELEGRAM_ALLOWED_USER_IDS`** contains only ids you trust (yours, your team's).
- [ ] **`TELEGRAM_WEBHOOK_SECRET`** is a long random string, set in Vercel *and* on the webhook.
- [ ] **`CRON_SECRET`** is set (required — the daily brief won't run without it, on purpose).
- [ ] **`.env` is git-ignored** — I never committed my keys. (Check: `git status` shows no `.env`.)
- [ ] My Supabase Storage `vault` bucket is **private** (public = off).
- [ ] I set my **threshold** (`EXPENSE_APPROVAL_THRESHOLD`) where I actually want the 🟢/🟡 line.

---

## If a key ever leaks 🔥

Pasted a key in the wrong chat? Committed `.env` by accident? Don't panic — **rotate it.**
1. In Supabase / Anthropic / Telegram, **generate a new key** (this instantly kills the old one).
2. Update the value in **Vercel env** → **Redeploy** (env changes need a redeploy).
3. If it was `TELEGRAM_BOT_TOKEN`, re-run `npm run webhook:set`.
A leaked-and-rotated key is a non-event. A leaked-and-ignored key is the whole problem.

---

> **The reassurance to say out loud:** *"Even if someone got my phone, they'd hit a passcode.
> Even if they got past that, the robot can't move my money or delete my data — those aren't
> built. And every single thing it does is written in the diary."* That's a safe robot.
>
> Now go try to break it → `red-team-checklist.md`.
