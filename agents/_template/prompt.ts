// 👉 THIS FILE IS YOURS TO EDIT — it holds the 4th knob: SUGGEST (the words).
//
// This is the ONLY place you write what the robot says. Keep it a DRAFT for a
// human to read and send — never a message that goes out on its own. The engine
// puts this text in front of you (in Telegram or the Approvals tab); YOU press send.
//
// Tip: pull real fields off the row so the draft is specific ("RM1,200", the name)
// — a specific draft is one you can send as-is. `m(row, 'key')` reads meta safely.

import type { Rec } from '@/lib/records'
import { rm, m } from '@/lib/records'

// 👉 CHANGE THIS — the draft. Return plain text; the human reviews it, then sends.
export function suggest(row: Rec): string {
  const who = row.title || 'this contact'
  const amount = row.amount ? ` (${rm(row.amount)})` : ''
  return (
    `Draft follow-up for ${who}${amount}:\n\n` +
    `Hi ${who}, just checking in — are you still keen to move forward? ` +
    `Happy to answer any questions. — (your name)\n\n` +
    `Last touch: ${m(row, 'last_touch')}. Reply here to send it yourself.`
  )
}
