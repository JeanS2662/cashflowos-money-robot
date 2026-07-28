// 🔒 DON'T EDIT — this is what keeps your robot safe.
//
// The Expense Filer shares the Vault's deterministic file-a-receipt funnel
// (fileReceipt in agents/registry.ts). A receipt with a real amount becomes a
// `cash_out` row. Whether it got here via 🟢 autopilot or an approved 🟡 proposal,
// it runs through that ONE function exactly once (the CAS in lib/actions.ts).
//
// 🔴 NEVER-zone: no send, no money movement, no delete. Filing an expense is an
//    internal, reversible row — /undo posts a reversal, never a hard delete.

import { EXECUTORS } from '@/agents/registry'

export const execute = (payload: any) => EXECUTORS['expense'](payload)
