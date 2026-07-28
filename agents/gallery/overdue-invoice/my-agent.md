# 💸 Overdue-Invoice Chaser — my-agent.md  (Finance · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Overdue-Invoice Chaser
**Owner (who it works for):** The business owner / finance
**Approver (whose YES it needs):** The owner (before any chase goes out)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`daily`

> Once a day, in the morning brief run.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `cash_in` records still marked unpaid whose due date is **more than 7 days** past.
> (`rows.filter(r => r.category === 'cash_in' && r.status !== 'paid' && daysPast(r.due_date) > 7)`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A short, polite chase: *"Chase {customer} for {RM amount}? draft ↓"* — with the invoice
> number, amount, and how many days overdue, ready to paste into WhatsApp/email.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask before sending.** It drafts the chase; the owner presses send.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — chasing a customer is never autopilot)
- 🟡 **ASK-FIRST**: draft every chase and wait for the owner's YES
- 🔴 **NEVER**: move money · delete the invoice · **auto-send the chase to the customer**

> **Golden rule:** the chase is **drafted for you to send**. The robot never messages the customer.
