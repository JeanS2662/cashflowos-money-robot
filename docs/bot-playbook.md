# The Jarvis Playbook 🤖💬

> *"Don't just tell them Jarvis can do things — ask it, on stage, and watch it do them."*
> This is the facilitator's demo script: every question Jarvis answers, every action it can
> take, and what should happen on screen when you try it. Run the live demo off this page,
> or hand it to an attendee as "here's everything your robot can do."

**How to use this page:** each row below is a real tool wired into Jarvis. Type the "Try
asking" column into your bot (word-for-word or close — it understands natural phrasing).
The "Expect back" column tells you the *shape* of a correct reply — exact wording is
Claude's, exact numbers are your data, but the structure should match.

**Before you demo:** a fresh clone's seed data ships with leads spread across every funnel
stage, a couple of overdue invoices, a handful of tasks, quiet customers, and content in all
three states — so every question below should come back with a real, non-empty answer out
of the box. Nothing to fake.

---

## The zones, in one glance 🎚️

| Zone | Means | Bot behaviour |
|---|---|---|
| *(none)* | **READ** | Answers instantly. Nothing is written; nothing to approve. |
| 🟢 | **AUTOPILOT** | Writes it, then tells you — always with an `/undo-<id>` escape hatch (24h window). |
| 🟡 | **ASK-FIRST** | Sends ✅ Approve / ❌ Reject buttons and waits. Nothing happens until you tap. |
| ✍️ | **DRAFT-ONLY** | Hands you copy-paste text. There's no send button in its hands — it never messages a customer. |

Same dial as the rest of CashFlowOS — see [`docs/hitl-framework.md`](./hitl-framework.md) for the full LATAR framework this inherits.

---

## READ — ask it anything, answered instantly

No approval needed for any of these. They only read your `records` table and reply — grounded in a real query every time, so Jarvis never guesses a money number.

### 💰 Money

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "how much cash in this week?" / "...this month?" | `get_cash_summary(period)` | *"This week: cash in RM [x], cash out RM [y], net RM [z]. Owed to you: RM [w]."* |
| "who owes me?" / "total outstanding?" | `list_owed()` | A short list — customer, amount, days waiting — plus a running total. |
| "overdue invoices?" / "who's late paying me?" | `list_overdue_invoices()` | Same list, filtered to only past-due, latest-first: *"[Customer] — RM [amt] — [n] days late."* |

### 🏞️ Pipeline

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "pipeline value?" / "how's my funnel?" | `get_funnel()` | The full river — Views→Leads→Appointments→Closed→Nurture — with conversion % between each stage, plus total open-pipeline RM. |
| "open leads?" / "who's at appointment stage?" | `list_leads(stage?)` | Leads at that stage (or all), each with deal value, next step, and due date. |
| "pending vs won?" | `pending_vs_won()` | *"Won: RM [x] ([n] closed + paid) · Pending: RM [y] ([m] open leads + unpaid invoices)."* |

### ✅ Tasks

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "what's due this week?" / "what's due today?" | `tasks_due(window)` | Open tasks sorted by deadline, each with its owner: *"Fri — Chase supplier payment (you)."* |

### 📣 Content

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "what's scheduled?" | `content_status()` | Counts by state (posted / scheduled / draft) + what's coming up, with platform and views where posted. |

### 🤝 People

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "who do I follow up with?" / "who should I chase?" | `who_to_followup()` | Customers + quiet leads, ranked by days since last contact, each with a next step. |

### 🚨 Triage

| Try asking | Tool | Expect back (shape) |
|---|---|---|
| "what needs my attention today?" | `attention_today()` | One card: overdue invoices + tasks due today, plus a note pointing you to the Approvals tab for anything waiting your ✅. |

**Also in the toolbox** (not on the `/help` card, but always live):
- `search_records(query, category?)` — free-text search across titles/notes/meta. Try: *"find Acme."*
- `list_overdue()` — the broader legacy catch-all: anything past its due date, in any category (not just invoices).
- `escalate(reason)` — the human escape hatch. Jarvis calls this itself — instead of guessing — when a question is out of scope, or you seem stuck or frustrated. Reply: *"🙋 I'm flagging this to the owner…"*

**Chaining + memory — worth showing off live:**
- *"who do I need to chase, and how much do they owe me?"* → chains `who_to_followup()` then `list_owed()` (or `search_records()`) to answer both halves in one reply.
- *"cash in this week?"* → *"...and last month?"* → the second question resolves from the last few turns of `bot_memory` — no need to repeat context.

---

## ACT — things it can actually do, through the approval engine

Nothing here writes a row directly. Every one of these calls `propose()` (or the pre-decided 🟢 autopilot path) in `lib/actions.ts` — the exact same claim-check engine that files your receipts. One YES, one action, once.

| Tool | Try asking | Zone | What happens |
|---|---|---|---|
| `log_expense(merchant, amount, category?)` | *"log RM45 Grab"* / *"I spent 1200 on Facebook ads"* | 🟢 at/under your line · 🟡 over it | At/under `EXPENSE_APPROVAL_THRESHOLD`: files itself, replies with the amount + `/undo-<id>`. Over it: ✅/❌ buttons, waits for your tap. |
| `add_task(title, due_date?, owner?)` | *"add task: chase supplier Friday"* | 🟢 always | Adds the task, confirms it, + `/undo-<id>`. |
| `add_lead(name, value?, stage?, source?)` | *"add lead Angela, RM8000, ig"* | 🟢 always | Adds the lead to the pipeline (default stage: new), confirms it, + `/undo-<id>`. |
| `log_cash_in(source, amount, customer?)` | *"log RM5000 from Koochester"* | 🟡 always | Proposes the income entry — ✅/❌ buttons, waits. Approve → posts to Cash In. |
| `mark_invoice_paid(invoice)` | *"mark Angela's invoice paid"* | 🟡 always | Matches the unpaid invoice by name/title (asks you to pick if more than one matches) → proposes → Approve flips it to paid. |
| `update_lead_status(lead, stage)` | *"move Angela to appointment"* | 🟡 always | Matches the lead (asks you to pick if ambiguous) → proposes → Approve updates the pipeline stage. |
| `draft_followup(name)` | *"draft a follow-up for Angela"* | ✍️ draft-only, never sends | Pulls that person's context (last contact, deal, next step) and writes a short, ready-to-copy message **in the chat**. No row is written, nothing is sent — there's no send path in this tool at all. |

**Demo beats worth calling out live:**
- Double-tap ✅ **Approve** on the same proposal (or tap it in Telegram *and* the Approvals tab) — the second tap says *"already handled."* Same claim-check as the receipt flow: nothing double-writes, ever.
- Ask `mark_invoice_paid` (or `update_lead_status`) for a name that matches two rows — it lists the candidates and asks which one, instead of guessing.
- Send `/undo-<id>` on an autopiloted `add_task` / `add_lead` / small `log_expense` — a reversal posts, nothing is hard-deleted.
- Ask for a follow-up draft, then challenge the class to find a "send" call anywhere near `draft_followup` — there isn't one. That's the 🔴 zone: not "asks harder," just **doesn't exist**.

---

## The safety one-liner

> **AI proposes. You approve. Code executes — exactly once — and writes it down.**
> **The bot never messages your customers, never moves money, and never deletes.**

That's the whole contract. Every row above — READ or ACT, 🟢 🟡 or ✍️ — runs inside it.
