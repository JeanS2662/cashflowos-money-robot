# 🧾 Expense Filer — the graduated-autonomy demo (ships ON)

This is the clearest demo of **"the dial, not the leash."** Same photo pipeline as
the Vault; the **threshold** is the one knob that slides an action between 🟢
autopilot and 🟡 ask-first.

**The knob:** `EXPENSE_APPROVAL_THRESHOLD` (env, default **RM200**).

---

## The two-photo demo (run this live)

### Photo A — a RM45 lunch receipt  → 🟢 AUTOPILOT
1. Snap the receipt, send it to your Telegram bot.
2. The Vault reads it: `amount 45 · confidence high`. **45 ≤ 200** → it files itself.
3. You get: **`✅ Filed RM45 · Meals — reply /undo-45 within 24h to reverse.`**
4. It's already in **Cash Out** + the **Vault** + the **Activity** feed. You didn't tap anything.

> This is what makes it an **agent, not a form** — a small, reversible action runs
> on its own and just tells you. Wrong? `/undo-<id>` posts a reversal (soft — never a delete).

### Photo B — a RM269 supplies receipt  → 🟡 ASK-FIRST
1. Send it. The Vault reads it: `amount 269 · confidence high`.
2. **269 > 200** → it does **not** file. You get a card:
   **`🧾 Receipt read: RM269 · … That's over your RM200 auto-file limit — file it to Cash Out?`**  `[✅ Approve] [❌ Reject]`
3. Tap ✅ → it files exactly once and confirms. Tap ❌ → nothing is stored, and it's logged.

### Bonus — a blurry receipt → 🟡 ASK, flagged "unsure"
If the robot can't read the total clearly, it forces the ask-path **regardless of
amount**, with **`⚠️ Robot unsure — double-check the amount`**. (The evaluation-loop teach:
never auto-file a number you're not sure of.)

---

## Slide the dial
- Set `EXPENSE_APPROVAL_THRESHOLD=0` → **everything** asks first (maximum leash).
- Set it to `500` → the RM269 receipt now autopilots too.
- Nothing else changes. That one number is the autonomy dial.

## Files
- `definition.ts` 👉 — the knobs (incl. `threshold()`).
- `executor.ts` 🔒 — the shared, once-only file-a-receipt funnel. Don't edit.
- The live pipeline: `app/api/telegram/route.ts` → `runVaultPipeline`.
