// 🔒 DON'T EDIT — this is what keeps your robot safe.
//
// The Vault's executor is the shared, deterministic file-a-receipt funnel that
// lives in agents/registry.ts (fileReceipt). EVERY filed action — the 🟢 autopilot
// path AND an approved 🟡 proposal — runs through that ONE function exactly once
// (the CAS claim in lib/actions.ts guarantees once-only). This file just re-exports
// it so the Vault agent folder is self-contained.
//
// 🔴 NEVER-zone (not built in, not even with approval): send to a customer, move
//    money, delete a record. Filing a receipt writes an internal, reversible row —
//    that's why small ones can autopilot. /undo posts a REVERSAL, never a delete.

import { EXECUTORS } from '@/agents/registry'

// (payload) => Promise<any> — the returned value becomes the action's audit result.
export const execute = (payload: any) => EXECUTORS['vault'](payload)
