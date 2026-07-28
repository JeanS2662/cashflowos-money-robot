import 'server-only'
import { randomUUID } from 'crypto'
import { supabase, supabaseConfigured } from './supabase'
import { rm } from './records'
import { logRun } from './runs'
import { sendWithButtons, editMessageReplyMarkup, type InlineKeyboard } from './telegram'
import { EXECUTORS } from '@/agents/registry'

// 🔒 Don't edit — this keeps your robot safe.
// The Human-In-The-Loop heart. Every action a robot wants to take passes through
// here: it's PROPOSED, then a human (or the autopilot dial) decides, then it's
// CLAIMED and executed exactly once. No YES = no action. Fail closed everywhere.

export type ActionRow = {
  id: number
  agent_key: string
  idempotency_key: string
  payload: any
  status: string
  proposed_at: string
  expires_at: string
  decided_at: string | null
  executed_at: string | null
  approver_chat_id: number | null
  result: any
  error: string | null
  notify_chat_id: number | null
  notify_message_id: number | null
}

const nowISO = () => new Date().toISOString()
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

// ------------------------------------------------------------
// propose() — create a pending proposal (the 🟡 ASK-FIRST path).
//
// MANDATED implementation: supabase-js does NOT translate .insert() into
// "ON CONFLICT DO NOTHING". A duplicate idempotency_key would throw a Postgres
// 23505 through PostgREST and CRASH the webhook on Telegram's first retry. So we
// .upsert(..., { ignoreDuplicates: true }) and treat 0 returned rows as "already
// proposed" — return null calmly, no error, no duplicate message.
// ------------------------------------------------------------
export async function propose(args: {
  agentKey: string
  idempotencyKey: string
  payload: any
  expiresInH?: number
}): Promise<ActionRow | null> {
  if (!supabaseConfigured) return null
  const { agentKey, idempotencyKey, payload, expiresInH = 24 } = args
  const { data, error } = await supabase
    .from('agent_actions')
    .upsert(
      {
        agent_key: agentKey,
        idempotency_key: idempotencyKey,
        payload,                       // written ONCE, never updated (immutable)
        status: 'proposed',
        proposed_at: nowISO(),
        expires_at: hoursFromNow(expiresInH),
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    )
    .select()
  if (error) {
    console.error('[CFO] propose failed:', error.message)
    return null
  }
  // 0 rows ⇒ a row with this idempotency_key already existed ⇒ duplicate.
  if (!data || data.length === 0) return null
  return data[0] as ActionRow
}

// ------------------------------------------------------------
// claim() — THE CLAIM-CHECK PATTERN.
//
// One atomic CAS UPDATE. It flips a still-'proposed', not-yet-expired row to the
// target state and RETURNS it. Because the WHERE clause is checked inside the
// single UPDATE statement, two racing taps can't both win: exactly one gets the
// row back, the other gets 0 rows. Expiry is checked HERE (lazy expiry — no
// sweeper cron). NEVER SELECT-then-UPDATE.
//
//   0 rows returned ⇒ lost the race / already handled / expired
//                   ⇒ caller replies "already handled" and does nothing.
//
// `to` is 'executing' (approve → about to run) or 'rejected' (decline → run
// nothing). Both use the identical guarded shape.
// ------------------------------------------------------------
export async function claim(
  id: number,
  approverChatId: number | null,
  to: 'executing' | 'rejected',
): Promise<ActionRow | null> {
  if (!supabaseConfigured) return null
  const { data, error } = await supabase
    .from('agent_actions')
    .update({ status: to, decided_at: nowISO(), approver_chat_id: approverChatId })
    .eq('id', id)
    .eq('status', 'proposed')          // must still be proposed …
    .gt('expires_at', nowISO())        // … and not expired — both inside the one UPDATE
    .select()
  if (error) {
    console.error('[CFO] claim failed:', error.message)
    return null
  }
  if (!data || data.length === 0) return null   // already handled / expired / lost the race
  return data[0] as ActionRow
}

// ------------------------------------------------------------
// executeClaimed() — run the deterministic executor for a row we JUST claimed.
//
// ONE execution implementation, called from every front door (Telegram tap, in-app
// Approve button, and the 🟢 autopilot path) so an action can only ever run through
// this single funnel. The caller MUST have already won the CAS (claim → 'executing')
// before calling this. Success ⇒ markExecuted; a throw ⇒ markFailed (a failed action
// never silently retries — it surfaces in Activity + Telegram).
// ------------------------------------------------------------
export async function executeClaimed(
  row: ActionRow,
): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const executor = EXECUTORS[row.agent_key]
    if (!executor) throw new Error(`no executor registered for "${row.agent_key}"`)
    const result = await executor(row.payload)
    await markExecuted(row.id, result)
    return { ok: true, result }
  } catch (e: any) {
    const msg = String(e?.message || e)
    await markFailed(row.id, msg)
    console.error('[CFO] executor failed:', e)
    return { ok: false, error: msg }
  }
}

// A calm, one-line human summary of an executor result — used in the Telegram
// confirmation and the in-app toast so both front doors say the same thing.
export function summarizeResult(result: any): string {
  if (!result || typeof result !== 'object') return 'Done ✅'
  if (result.kind === 'draft') {
    return `📝 Draft ready (${result.channel || 'manual'}) — open the app to review &amp; send. Nothing was sent.`
  }
  if (result.kind === 'expense') {
    return `✅ Filed ${rm(result.amount)} · ${result.category || 'expense'}${
      result.record_id ? ` (record #${result.record_id})` : ''
    }`
  }
  if (result.kind === 'doc') {
    return `✅ Filed to your Vault${result.record_id ? ` (record #${result.record_id})` : ''}`
  }
  // V2 — the Jarvis action tools (writeRecord).
  if (result.kind === 'record_created') {
    const noun = result.category === 'task' ? 'task' : result.category === 'lead' ? 'lead' : result.category === 'cash_in' ? 'income' : 'record'
    return `✅ Added ${noun}: ${result.title}${result.record_id ? ` (#${result.record_id})` : ''}`
  }
  if (result.kind === 'record_updated') {
    return `✅ Updated ${result.title} → ${result.status}${result.record_id ? ` (#${result.record_id})` : ''}`
  }
  return 'Done ✅'
}

// After the executor succeeds, stamp the row done with its result.
export async function markExecuted(id: number, result: any): Promise<void> {
  if (!supabaseConfigured) return
  const { error } = await supabase
    .from('agent_actions')
    .update({ status: 'executed', executed_at: nowISO(), result })
    .eq('id', id)
  if (error) console.error('[CFO] markExecuted failed:', error.message)
}

// If the executor throws, record the failure. A failed action NEVER silently
// retries — it surfaces in Activity + Telegram so a human sees it.
export async function markFailed(id: number, errorText: string): Promise<void> {
  if (!supabaseConfigured) return
  const { error } = await supabase
    .from('agent_actions')
    .update({ status: 'failed', error: errorText })
    .eq('id', id)
  if (error) console.error('[CFO] markFailed failed:', error.message)
}

// ------------------------------------------------------------
// runAutopilot() — the 🟢 AUTOPILOT path (small / reversible actions).
//
// This is what makes it an AGENT, not a form: no human tap, but it STILL goes
// through the exact same claim-check → execute → record trail so it can only run
// ONCE. We insert the action pre-decided (approver_chat_id stays null = "the
// robot decided"), claim it, run the deterministic executor, and stamp the
// result. Idempotency: a stable key on the payload (e.g. a photo's sha256) means
// the same event can't autopilot twice — a duplicate returns null calmly.
// ------------------------------------------------------------
export async function runAutopilot(
  agentKey: string,
  payload: any,
): Promise<{ row: ActionRow; result: any } | null> {
  if (!supabaseConfigured) return null
  const idempotencyKey: string =
    payload?.idempotencyKey || payload?.sha256 || randomUUID()

  // Insert pre-decided (still 'proposed' so the identical claim-check applies;
  // decided_at set + approver null marks it auto-approved by the robot).
  const { data, error } = await supabase
    .from('agent_actions')
    .upsert(
      {
        agent_key: agentKey,
        idempotency_key: idempotencyKey,
        payload,
        status: 'proposed',
        proposed_at: nowISO(),
        decided_at: nowISO(),
        expires_at: hoursFromNow(1),
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    )
    .select()
  if (error) {
    console.error('[CFO] runAutopilot insert failed:', error.message)
    return null
  }
  if (!data || data.length === 0) return null   // duplicate event — already autopiloted

  const row = data[0] as ActionRow
  const claimed = await claim(row.id, null, 'executing')
  if (!claimed) return null                       // lost a race — someone else took it

  const outcome = await executeClaimed(claimed)   // the SAME once-only funnel as approvals
  if (!outcome.ok) return null                    // already recorded as 'failed'
  return { row: claimed, result: outcome.result }
}

// ------------------------------------------------------------
// attachNotify() — remember WHICH Telegram message carries this action's buttons.
//
// sendWithButtons() returns the message_id; we store it (with the chat id) on the
// agent_actions row. The IN-APP approve path then uses these to editMessageReplyMarkup
// and strip the buttons from Telegram — so a proposal decided in the app can't still
// be tapped in the chat (UX only; the CAS is the real guard). Best-effort; never throws.
// ------------------------------------------------------------
export async function attachNotify(
  actionId: number,
  chatId: number | string,
  messageId: number,
): Promise<void> {
  if (!supabaseConfigured) return
  const { error } = await supabase
    .from('agent_actions')
    .update({ notify_chat_id: Number(chatId), notify_message_id: messageId })
    .eq('id', actionId)
  if (error) console.error('[CFO] attachNotify failed:', error.message)
}

// ------------------------------------------------------------
// proposeAndNotify() — the 🟡 ASK-FIRST wiring in one call: create the proposal,
// send the Approve/Reject buttons to Telegram, and remember the message so either
// front door can later strip them. Returns the row (or null on a duplicate/no-op).
// ------------------------------------------------------------
export async function proposeAndNotify(args: {
  agentKey: string
  idempotencyKey: string
  payload: any
  chatId: number | string
  text: string
  expiresInH?: number
}): Promise<ActionRow | null> {
  const row = await propose(args)
  if (!row) return null // duplicate — already proposed, don't send a second message
  const keyboard: InlineKeyboard = [
    [
      { text: '✅ Approve', callback_data: `apr:${row.id}` },
      { text: '❌ Reject', callback_data: `rej:${row.id}` },
    ],
  ]
  const messageId = await sendWithButtons(args.chatId, args.text, keyboard)
  if (messageId != null) await attachNotify(row.id, args.chatId, messageId)
  return row
}

// ------------------------------------------------------------
// undoAction() — the /undo-<id> soft reversal (owner-only, ≤24h).
//
// SOFT by design: it NEVER deletes. It posts a REVERSAL records row (a negative
// entry that nets the money back out) and stamps the original action as undone.
// Guards fail closed: only an already-'executed' action, only within 24h, only once.
// This is what makes 🟢 autopilot safe — a wrong auto-file is one reply away from
// being reversed, with the whole trail intact.
// ------------------------------------------------------------
export async function undoAction(
  actionId: number,
): Promise<{ ok: boolean; message: string }> {
  if (!supabaseConfigured) return { ok: false, message: 'Not connected to your database yet.' }

  const { data: rows, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', actionId)
  if (error) {
    console.error('[CFO] undo lookup failed:', error.message)
    return { ok: false, message: 'Could not look that up — try again in a moment.' }
  }
  const action = rows?.[0] as ActionRow | undefined
  if (!action) return { ok: false, message: `No action #${actionId} found.` }
  if (action.status !== 'executed') {
    return { ok: false, message: `Action #${actionId} isn't in a state that can be undone (it's "${action.status}").` }
  }
  if ((action.result as any)?.undone) {
    return { ok: false, message: `Action #${actionId} was already reversed.` }
  }
  const executedAt = action.executed_at ? new Date(action.executed_at).getTime() : 0
  if (!executedAt || Date.now() - executedAt > 24 * 3600_000) {
    return { ok: false, message: `Too late to undo #${actionId} — the 24-hour window has passed.` }
  }
  const recordId = (action.result as any)?.record_id
  if (!recordId) {
    return { ok: false, message: `Nothing to reverse for #${actionId} (no record was created).` }
  }

  // Read the original row so the reversal mirrors it (soft — we don't touch it).
  const { data: origRows } = await supabase.from('records').select('*').eq('id', recordId)
  const orig = origRows?.[0]
  if (!orig) return { ok: false, message: `The original record for #${actionId} is gone — nothing to reverse.` }

  // 1) Post the reversal (a negative mirror so the totals net to zero).
  const { data: revRows, error: revErr } = await supabase
    .from('records')
    .insert({
      title: `Reversal — ${orig.title}`,
      status: 'reversed',
      amount: -Number(orig.amount || 0),
      category: orig.category,
      due_date: orig.due_date,
      notes: `Undo of action #${actionId}`,
      meta: { reverses_record_id: orig.id, reverses_action_id: actionId, auto: 'undo' },
    })
    .select()
  if (revErr) {
    console.error('[CFO] undo reversal insert failed:', revErr.message)
    return { ok: false, message: 'Could not post the reversal — try again.' }
  }
  const reversalId = revRows?.[0]?.id ?? null

  // 2) Stamp the action undone (into result — there's no meta column on agent_actions).
  await supabase
    .from('agent_actions')
    .update({
      result: { ...(action.result || {}), undone: true, undone_at: nowISO(), reversal_record_id: reversalId },
    })
    .eq('id', actionId)

  await logRun(action.agent_key, 'undone', { action_id: actionId, reversal_record_id: reversalId, original: orig.id })
  return { ok: true, message: `↩️ Reversed #${actionId} — posted reversal record #${reversalId}. Nothing was deleted.` }
}
