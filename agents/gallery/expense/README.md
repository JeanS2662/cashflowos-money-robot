# Expense Filer 🧾 (Finance · the dial demo)

Snap a receipt and it files the expense to Cash Out: 🟢 auto-files when it's **at/under RM200** and sure (with a `/undo-<id>` escape hatch), 🟡 asks first when it's **over the threshold** (the RM269 moment) or unsure of the amount.
The threshold env `EXPENSE_APPROVAL_THRESHOLD` IS the autonomy dial — slide it to change what runs on autopilot. Never sends anyone a message; `/undo` writes a soft reversal, never a hard delete.
This is the filled worked example — the real code lives in `agents/expense/` and ships ON.
