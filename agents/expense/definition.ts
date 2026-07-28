// 👉 THIS FILE IS YOURS TO READ — the Expense Filer's knobs. It's the Vault's
// EXPENSE SPECIALISATION and the ships-ON demo of GRADUATED AUTONOMY ("the dial,
// not the leash"). Same on_photo pipeline as the Vault; the difference is the
// threshold decides 🟢 auto-file vs 🟡 ask-first.

import type { Rec } from '@/lib/records'

export type WhenTrigger = 'on_photo' | 'on_new_record' | 'daily'

// The one knob that IS the autonomy dial. Change EXPENSE_APPROVAL_THRESHOLD in your
// env (default RM200) to slide where 🟢 becomes 🟡 — no code change needed.
export function threshold(): number {
  const n = Number(process.env.EXPENSE_APPROVAL_THRESHOLD)
  return Number.isFinite(n) && n > 0 ? n : 200
}

export const definition = {
  key: 'expense',
  when: 'on_photo' as WhenTrigger,

  // LOOK-AT — the receipts it has filed (Cash Out rows the Vault created).
  lookAt: (rows: Rec[]) =>
    rows.filter((r) => r.category === 'cash_out' && r.meta?.source === 'vault'),

  // ASK-BEFORE — the dial. At/under the threshold AND confident ⇒ 🟢 autopilot.
  // Over it, OR the robot is unsure of the amount ⇒ 🟡 ask first.
  askBefore: (row: Rec) => Number(row.amount || 0) > threshold(),
}
