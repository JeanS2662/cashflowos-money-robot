import 'server-only'
import { supabase, supabaseConfigured } from './supabase'

// 🔒 Don't edit — this keeps your robot safe.
// The audit trail writer. EVERY agent invocation — autopilot, approved, rejected,
// undone — drops one row here. It's a LEAF module (imports only supabase) so both
// the executors (agents/registry.ts) and the HITL engine (lib/actions.ts) can call
// it without creating an import cycle. Never throws — a failed log must never take
// down the action it was recording.

const nowISO = () => new Date().toISOString()

// One line in the Activity feed. `outcome` is a short verb the Employees tab +
// Approvals History render as a pill: ok | rejected | failed | escalated | undone | noop.
export async function logRun(
  agentKey: string,
  outcome: string,
  detail: Record<string, any> = {},
): Promise<void> {
  if (!supabaseConfigured) return
  const { error } = await supabase.from('agent_runs').insert({
    agent_key: agentKey,
    started_at: nowISO(),
    finished_at: nowISO(),
    outcome,
    detail,
  })
  if (error) console.error('[CFO] logRun failed:', error.message)
}
