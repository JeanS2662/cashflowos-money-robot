// 👉 THIS FILE IS YOURS TO READ (and tweak the filter) — the Vault's 3 knobs.
//
// The Vault is the Day-1 build-together agent: a photo/PDF lands in Telegram and it
// files the receipt/doc for you. Its LIVE wiring is the ack-first pipeline inside
// app/api/telegram/route.ts (runVaultPipeline) — this file names the same knobs in
// one place so you can see WHEN it wakes, what it LOOKS AT, and when it must ASK.
// The threshold knob (🟢 vs 🟡) is the EXPENSE_APPROVAL_THRESHOLD env var.

import type { Rec } from '@/lib/records'
import { suggest } from './prompt'

export type WhenTrigger = 'on_photo' | 'on_new_record' | 'daily'

export const definition = {
  // WHEN — a photo or PDF arrives in Telegram.
  key: 'vault',
  when: 'on_photo' as WhenTrigger,

  // LOOK-AT — the Vault reads the FILE (via lib/vision.ts), not existing rows. This
  // filter is what the Vault tab shows: everything it has filed (docs + receipts).
  lookAt: (rows: Rec[]) => rows.filter((r) => r.meta?.source === 'vault'),

  // ASK-BEFORE — the dial. A small, confident expense (≤ EXPENSE_APPROVAL_THRESHOLD)
  // is 🟢 autopilot; anything bigger, or a low-confidence read, is 🟡 ask-first.
  // A plain document (no amount) is filed straight to the Vault.
  askBefore: (row: Rec) => {
    const limit = Number(process.env.EXPENSE_APPROVAL_THRESHOLD) || 200
    const amount = Number(row.amount || 0)
    return amount > limit // over the limit ⇒ ask; at/under ⇒ autopilot
  },

  // SUGGEST — the words shown on the proposal (kept in prompt.ts).
  suggest,
}
