// 🔒 DON'T EDIT — this is what keeps your robot safe.
//
// The executor is the ONLY thing that can actually "do" the action, and it runs
// exactly once, AFTER a YES (or the 🟢 autopilot claim). It is deterministic: same
// payload in → same thing out. The whole point of locking it is that you can tune
// WHEN/LOOK-AT/SUGGEST/ASK-BEFORE all day (those 4 knobs) without ever being able
// to make the robot send a message to a customer or move money — because the code
// that would do that simply does not live here.
//
// 🔴 NEVER-zone (not built in, not even with approval): send to a customer, move
//    money, delete a record. This executor DRAFTS. A human sends. Always.
//
// Call shape the HITL engine depends on (agents/registry.ts): (payload) => Promise<any>
// The returned value is stored as the action's audit `result`.

import type { Rec } from '@/lib/records'

export type DraftPayload = {
  row?: Rec          // the record that triggered this (from LOOK-AT)
  text?: string      // the draft from the SUGGEST knob (prompt.ts)
  channel?: string   // where the human will send it (whatsapp/email/…) — a label, not a sender
}

// A finished DRAFT, handed back for a human to read and send. Note there is no
// network call here — nothing leaves the building. That's the safety guarantee.
export type DraftResult = {
  kind: 'draft'
  channel: string
  text: string
  ready_to_send: false   // always false — the robot never sends. You do.
  drafted_at: string
}

export async function execute(payload: DraftPayload): Promise<DraftResult> {
  const text = (payload?.text || '').trim() || '(no draft text was provided)'
  return {
    kind: 'draft',
    channel: payload?.channel || 'manual',
    text,
    ready_to_send: false,
    drafted_at: new Date().toISOString(),
  }
}
