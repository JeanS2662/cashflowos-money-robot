# The AI C-Suite Blueprint — your one-page take-home

> The webinar bonus, made real. This is the org chart for the version of your business where **you're the CEO and AI runs the departments** — but every head **recommends, you decide**. It's the same rule your CashFlowOS robots already follow (🟢 auto only for small/reversible, 🟡 ask-first for anything that costs money or touches a customer, 🔴 never move money or delete). Fill the canvas at the bottom and you have your operating structure on one page.

---

## The core rule: recommend-only heads

You don't hire an AI "CEO." You hire **4 department heads that gather the facts, grill the numbers, and hand you ONE clear recommendation** — then wait for your YES. You stay the single point of judgment. Nothing with money impact or a customer's name on it executes without you.

This is **graduated autonomy** applied to your org, not just to one receipt:

- 🟢 **Head decides alone** — small, reversible, no customer sees it (file a receipt, draft a post, tag a lead, pull a report).
- 🟡 **Head recommends, you approve** — spend over your threshold, anything a customer receives, any status change with money impact.
- 🔴 **Never delegated to any head** — move money, sign contracts, delete records, hit send on a customer message. The head **drafts**; a human sends.

---

## The org chart

```
                         ┌──────────────────────┐
                         │        YOU (CEO)      │
                         │  the only YES that    │
                         │  moves money/customers│
                         └──────────┬───────────┘
                                    │  recommendations up ▲   decisions down ▼
        ┌───────────────┬───────────┴───────────┬───────────────┐
        │               │                       │               │
 ┌──────┴──────┐ ┌──────┴──────┐        ┌───────┴──────┐ ┌──────┴───────┐
 │  HEAD OF    │ │  HEAD OF    │        │   HEAD OF    │ │   HEAD OF    │
 │   SALES     │ │  MARKETING  │        │   FINANCE    │ │     OPS      │
 │    🎯       │ │     📣       │        │     💰        │ │     ⚙️        │
 └──────┬──────┘ └──────┬──────┘        └───────┬──────┘ └──────┬───────┘
        │               │                       │               │
   Leads · pipeline  Content · ads         Cash · invoices   Tasks · docs
   follow-ups         calendar · reach     receipts · owes   receipts · SOPs
```

Each head reads the **same `records` spine** your CashFlowOS app already keeps. They don't need new data — they need a lens on the data you're already capturing.

---

## The 4 heads — what each one watches, recommends, and must ask before

| Head | Watches (reads from `records`) | 🟢 Decides alone | 🟡 Recommends → you approve | 🔴 Never |
|------|-------------------------------|------------------|-----------------------------|----------|
| **Sales 🎯** | `lead` + `customer` rows, funnel stages, last-touch dates | Tag/score a lead, move a stage internally, **draft** a follow-up | Send a follow-up to a real person; discount/offer changes | Send any DM/message itself; promise a price |
| **Marketing 📣** | `content` rows (format, platform, views), the funnel top | **Draft** a post/reel/ad, schedule internally, suggest topics | Publish anything customer-facing; spend on ads | Hit "post" / "boost" on its own |
| **Finance 💰** | `cash_in` / `cash_out`, overdue receivables, "who owes me" | File a receipt under threshold, produce a cash summary | Spend over your threshold; **draft** an invoice chase | Move money, pay a bill, delete a record |
| **Ops ⚙️** | `task` + `doc` rows, due dates, overdue flags | File/label a doc, flag an overdue task, back up a photo | Change a status with money impact; reassign work | Delete anything; email a customer |

> **The dial (your one knob per head):** the line between 🟢 and 🟡 is a **threshold** you set — a Ringgit amount, a "is a customer on the other end?" test, or a reversibility test. Set it low while you're learning to trust a head; raise it as its recommendations prove right. That's the whole game: *the dial, not the leash.*

---

## Escalation rules — when a head must stop and come to you

A head **escalates to you (🙋) instead of acting** whenever ANY of these is true:

1. **Money over the line** — spend, refund, or price change above the head's threshold.
2. **A customer would receive it** — any outbound message, invoice, or public post. Draft it; you send.
3. **The robot is unsure** — low confidence, a missing field (amount/date), or conflicting data → *"⚠️ unsure, double-check"* and ask.
4. **It failed twice** — never guess a third time on a money question. Flag you, log it, stop.
5. **It's outside the head's tools** — a legal/tax/HR judgment call, a new vendor, a contract. Not its lane → yours.
6. **Two heads disagree** — e.g. Marketing wants to spend, Finance flags cash is tight → the conflict comes to you, the CEO, with both cases.

Everything that IS executed — 🟢 auto or 🟡 approved — lands in the **audit trail** (your Approvals → History). You review the trail, not every action. That's what makes it a team and not a to-do list.

---

## ✏️ The canvas — fill this in (this IS the take-home)

Write it by hand, or paste it into Claude Code and let it interview you.

**My business:** ______________________  **My CEO threshold rule (the dial):** _______________________
*(e.g. "auto anything under RM200 and reversible; ask me for everything above or customer-facing")*

| Head | In MY business, this head watches… | It may do ALONE (🟢) | It must ASK me first (🟡) | It may NEVER (🔴) | Where the data lives |
|------|-------------------------------------|----------------------|---------------------------|--------------------|----------------------|
| **Sales 🎯** | | | | move money / send unbidden | `records` `category=lead/customer` |
| **Marketing 📣** | | | | post / spend on its own | `records` `category=content` |
| **Finance 💰** | | | | move money / delete | `records` `category=cash_in/cash_out` |
| **Ops ⚙️** | | | | delete / email customers | `records` `category=task/doc` |

**My top escalation triggers (when ANY head must stop and ask me):**
1. ______________________________________________
2. ______________________________________________
3. ______________________________________________

**The FIRST head I'll actually turn on (start with one):** ______________________
**Why this one first:** _________________________________________________________
**How I'll know it's earning its keep in 2 weeks:** _____________________________

---

## From canvas to code (how this maps onto your CashFlowOS repo)

Each head is just an **agent** in `agents/`:

- Its watch-list = the **WHEN** + **LOOK-AT** knobs in `definition.ts`.
- Its recommendation = the **SUGGEST** knob in `prompt.ts`.
- Its 🟡 line = the **ASK-BEFORE** knob (your threshold).
- Its 🔴 actions **don't exist in the executor at all** — that's the safety, not a setting.

The `agents/gallery/` folder already ships one filled example per department (Overdue-Invoice Chaser = Finance, Cold-Lead Follow-up = Sales, Content Approval = Marketing, and more). Copy the head closest to your canvas, change the 4 👉 knobs, add one line to `agents/registry.ts`, and that department head is live — recommend-only, exactly as drawn above.

> **The one-line summary to remember:** *You're the CEO. Your 4 AI heads do the reading and hand you one recommendation each. You keep every YES that spends money or touches a customer. The dial is how much you let them handle alone — and it only turns up as trust goes up.*
