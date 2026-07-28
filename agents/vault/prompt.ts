// 👉 THIS FILE IS YOURS TO EDIT — the Vault's SUGGEST knob (the words on the card).
//
// This is the one-line summary the robot shows when it ASKS before filing (the 🟡
// path). Keep it a plain, checkable line — the human reads it and taps ✅ or ❌.
// The live proposal wording is built in the webhook (buildProposalText); this is
// the same idea in the knob shape so you can see where the words come from.

import type { Rec } from '@/lib/records'
import { rm, m } from '@/lib/records'

export function suggest(row: Rec): string {
  const amount = row.amount ? rm(row.amount) : 'an unclear amount'
  const merchant = m(row, 'merchant')
  return `🧾 File ${amount}${merchant !== '—' ? ` · ${merchant}` : ''} to Cash Out?`
}
