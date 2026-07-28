# 🧾 Expense Filer — my-agent.md  (Finance · the graduated-autonomy worked example)

> This is the one that ships **ON**. It's the clearest demo of "the dial, not the leash":
> the threshold knob is what slides an action between 🟢 autopilot and 🟡 ask-first.

**Name:** Expense Filer
**Owner (who it works for):** The business owner
**Approver (whose YES it needs):** The owner — but ONLY above the threshold

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`on_photo`

> Fires when a receipt/invoice photo or PDF lands in Telegram (the Vault pipeline reads it).

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> The structured amount/merchant/date the vision reader pulled off the photo (see `lib/vision.ts`).

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A one-line expense entry: *"RM45 · Meals · Starbucks · 2026-07-23 → file to Cash Out?"*

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **The threshold is the dial.** Below `EXPENSE_APPROVAL_THRESHOLD` (default RM200) and the robot
> is confident → 🟢 file it and just tell you (with a `/undo-<id>` escape hatch). Above the
> threshold, OR the robot is unsure of the amount → 🟡 ask first.

---

## The autonomy dial — this agent lives on ALL THREE
- 🟢 **AUTOPILOT** (`amount ≤ threshold` AND confidence high): auto-file to Cash Out + notify
  *"✅ Filed RM45 · Meals — reply /undo-<id> within 24h to reverse"*. **This is what makes it an agent, not a form.**
- 🟡 **ASK-FIRST** (`amount > threshold`, e.g. RM269 > RM200 — OR ⚠️ robot unsure of the amount): proposal + Approve/Reject buttons.
- 🔴 **NEVER**: move money · delete a record · message anyone. `/undo` writes a **reversal** entry — a soft undo, never a hard delete.

> **Golden rule:** filing an expense is internal + reversible, so small ones autopilot. Nothing
> is ever sent to a customer, and nothing is ever hard-deleted.
