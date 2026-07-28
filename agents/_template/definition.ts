// 👉 THIS FILE IS YOURS TO EDIT — it holds 3 of the 4 knobs.
//
// An agent is just four knobs. Three live here (WHEN, LOOK-AT, ASK-BEFORE); the
// fourth (SUGGEST — the words it drafts) lives next door in prompt.ts. Change
// ONLY the lines marked `// 👉 CHANGE THIS`. Everything the robot is allowed to
// actually DO is in executor.ts — and that file is locked, on purpose.
//
// Copy this whole folder to agents/<your-name>, fill these knobs from your
// my-agent.md, then add one line to agents/registry.ts (see README.md).

import type { Rec } from '@/lib/records'
import { suggest } from './prompt'

// WHEN the robot wakes up. Only these three triggers exist:
//   'daily'         — the merged cron checks it once a day (§8). Most gallery agents.
//   'on_new_record' — fires when a matching record is created.
//   'on_photo'      — fires when a photo/PDF lands (the Vault pipeline).
export type WhenTrigger = 'on_photo' | 'on_new_record' | 'daily'

export type AgentDefinition = {
  key: string
  when: WhenTrigger
  // LOOK-AT: given every business row, return only the ones this robot cares about.
  lookAt: (rows: Rec[]) => Rec[]
  // ASK-BEFORE: return true when this row's action needs a human YES (🟡 ASK-FIRST),
  // false when it's small + reversible enough to autopilot (🟢). This IS the dial.
  askBefore: (row: Rec) => boolean
  // SUGGEST: the draft text — kept in prompt.ts so you edit words, not logic.
  suggest: (row: Rec) => string
}

export const definition: AgentDefinition = {
  // 👉 CHANGE THIS — a short unique key. Must match the line you add to registry.ts.
  key: 'my-agent',

  // 👉 CHANGE THIS — WHEN it wakes up: 'daily' | 'on_new_record' | 'on_photo'.
  when: 'daily',

  // 👉 CHANGE THIS — LOOK AT: which rows it reads. Example below = leads gone quiet.
  lookAt: (rows) =>
    rows.filter((r) => r.category === 'lead' && r.status !== 'closed'),

  // 👉 CHANGE THIS — ASK-BEFORE: when must it get a YES first?
  //    Return true  → 🟡 draft a proposal and wait (the safe default).
  //    Return false → 🟢 autopilot (only for small, reversible, non-customer actions).
  //    Anything that MESSAGES A CUSTOMER stays true — the robot only drafts; you send.
  askBefore: (_row) => true,

  // Wires the SUGGEST knob (prompt.ts) in. Leave this line as-is.
  suggest,
}
