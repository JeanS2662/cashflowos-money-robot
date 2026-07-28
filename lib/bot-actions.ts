import 'server-only'
import { randomUUID } from 'crypto'
import type { Rec } from './records'
import { rm } from './records'
import { runAutopilot, proposeAndNotify } from './actions'

// 🔒 Don't edit — this keeps your robot safe.
// The Jarvis bot's WRITE hands (V2). Where lib/bot-tools.ts only READS, these
// tools ACT — but every one of them goes through the SAME approval engine the
// photo pipeline uses (lib/actions.ts), so the autonomy dial applies exactly:
//   🟢 small + reversible (add a task/lead, a small expense) → autopilot: it runs
//      once, then tells you, with a /undo escape hatch.
//   🟡 money / pipeline truth (log income, mark an invoice paid, move a lead,
//      a big expense) → propose: Approve/Reject buttons go to Telegram; nothing
//      happens until you tap ✅.
//   🔴 message a customer / move money / delete → NOT a tool. It does not exist.
// Nothing here writes a row directly — it all funnels through runAutopilot /
// proposeAndNotify, which is the only once-only execution path.

// The tool schemas handed to Claude alongside the read tools. Claude picks one
// when the owner asks to add/log/mark/update something.
export const BOT_ACTION_TOOLS = [
  {
    name: 'log_expense',
    description:
      'Record a business expense (cash out) from what the owner typed (no photo). At or under the ' +
      'auto-file threshold it files itself (🟢, undoable); over it, it asks the owner to approve (🟡). ' +
      'Use for "log RM45 Grab", "I spent 1200 on Facebook ads".',
    input_schema: {
      type: 'object' as const,
      properties: {
        merchant: { type: 'string', description: 'Who it was paid to (Grab, Adobe, Maybank…).' },
        amount: { type: 'number', description: 'Amount in RM.' },
        category: { type: 'string', description: 'Optional label (Meals, Software, Ads…).' },
      },
      required: ['merchant', 'amount'],
    },
  },
  {
    name: 'add_task',
    description:
      'Add an open task/to-do. Reversible, so it just does it (🟢) and gives an /undo. ' +
      'Use for "add task: chase supplier Friday", "remind me to call the printer".',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'What the task is.' },
        due_date: { type: 'string', description: 'Optional YYYY-MM-DD deadline.' },
        owner: { type: 'string', description: 'Optional person responsible.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_lead',
    description:
      'Add a new lead to the pipeline. Reversible, so it just does it (🟢) with an /undo. ' +
      'Use for "add lead Angela, RM8000, ig", "new lead: Koperasi ABC".',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Lead / person / company name.' },
        value: { type: 'number', description: 'Optional deal value in RM.' },
        stage: {
          type: 'string',
          enum: ['new', 'contacted', 'appointment', 'closed', 'nurture'],
          description: 'Optional starting stage. Default new.',
        },
        source: { type: 'string', description: 'Optional where it came from (ig, referral, ad).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'log_cash_in',
    description:
      'Record money coming IN / an invoice raised. Because it changes the money picture it always ' +
      'asks first (🟡 Approve). Use for "log RM5000 from Koochester", "invoice ABC 3200".',
    input_schema: {
      type: 'object' as const,
      properties: {
        source: { type: 'string', description: 'Who it is from / what it is for.' },
        amount: { type: 'number', description: 'Amount in RM.' },
        customer: { type: 'string', description: 'Optional customer name.' },
      },
      required: ['source', 'amount'],
    },
  },
  {
    name: 'mark_invoice_paid',
    description:
      'Mark an existing unpaid invoice (cash_in) as PAID. Money truth → asks first (🟡 Approve). ' +
      'Give the customer name or invoice title; if it is unclear which one, I will list the matches. ' +
      'Use for "mark Angela\'s invoice paid", "the ABC invoice is settled".',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoice: { type: 'string', description: 'Customer name or invoice title to match.' },
      },
      required: ['invoice'],
    },
  },
  {
    name: 'update_lead_status',
    description:
      'Move a lead to a new pipeline stage. Pipeline truth → asks first (🟡 Approve). ' +
      'Use for "move Angela to appointment", "mark Koochester closed".',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead: { type: 'string', description: 'Lead / customer name to match.' },
        stage: {
          type: 'string',
          enum: ['new', 'contacted', 'appointment', 'closed', 'nurture'],
          description: 'The stage to move them to.',
        },
      },
      required: ['lead', 'stage'],
    },
  },
]

export const ACTION_TOOL_NAMES = new Set(BOT_ACTION_TOOLS.map(t => t.name))

export type BotActionCtx = { chatId: number; thresholdRM: number; rows: Rec[] }

// Find at most a few candidate rows by fuzzy name/title match within a category.
function matchRows(rows: Rec[], category: string, q: string, unpaidOnly = false): Rec[] {
  const needle = q.toLowerCase().trim()
  return rows.filter(r => {
    if (r.category !== category) return false
    if (unpaidOnly && ['paid', 'done', 'closed', 'reversed'].includes((r.status || '').toLowerCase())) return false
    const hay = `${r.title} ${r.meta?.customer || ''} ${r.meta?.company || ''}`.toLowerCase()
    return needle ? hay.includes(needle) : false
  })
}

// ------------------------------------------------------------
// runBotAction — execute ONE action tool. Returns a compact JSON string the loop
// feeds back to Claude (so Claude can phrase the final reply, including any /undo
// id or "tap Approve above"). Every write goes through the CAS engine; a duplicate
// or lost race degrades to a calm status. Never throws.
// ------------------------------------------------------------
export async function runBotAction(name: string, input: any, ctx: BotActionCtx): Promise<string> {
  const { chatId, thresholdRM, rows } = ctx
  try {
    // ---- 🟢/🟡 log_expense — mirrors the photo pipeline's dial, text-first. ----
    if (name === 'log_expense') {
      const amount = Number(input?.amount)
      const merchant = String(input?.merchant || '').trim()
      if (!Number.isFinite(amount) || amount <= 0) return JSON.stringify({ status: 'error', message: 'I need a positive amount to log.' })
      const payload = {
        kind: 'receipt', amount, merchant,
        category: input?.category || undefined,
        note: 'Logged via Jarvis (typed, no photo)',
        idempotencyKey: randomUUID(),
      }
      if (amount <= thresholdRM) {
        const done = await runAutopilot('expense', { ...payload, auto: true })
        if (!done) return JSON.stringify({ status: 'noop', message: 'That looked already handled — nothing double-filed.' })
        return JSON.stringify({
          status: 'filed', zone: 'green', record_id: done.row.id,
          filed: `${rm(done.result.amount)} · ${done.result.category || 'expense'}${merchant ? ' · ' + merchant : ''}`,
          undo: `/undo-${done.row.id}`,
          tell_user: 'Filed automatically because it is at/under the auto-file limit. Offer the /undo id.',
        })
      }
      const row = await proposeAndNotify({
        agentKey: 'expense', idempotencyKey: payload.idempotencyKey, payload, chatId,
        text: `🧾 Log expense <b>${rm(amount)}</b>${merchant ? ` · ${merchant}` : ''}? That is over your RM${thresholdRM} auto-file limit.`,
      })
      return JSON.stringify(
        row
          ? { status: 'proposed', zone: 'yellow', sent_buttons: true, tell_user: `Proposed a ${rm(amount)} expense — Approve/Reject buttons sent. Tell them to tap ✅.` }
          : { status: 'noop', message: 'Already waiting on your YES for this one.' },
      )
    }

    // ---- 🟢 add_task — reversible → autopilot. ----
    if (name === 'add_task') {
      const title = String(input?.title || '').trim()
      if (!title) return JSON.stringify({ status: 'error', message: 'What is the task?' })
      const done = await runAutopilot('add-task', {
        op: 'insert', category: 'task', title, status: 'open',
        due_date: input?.due_date || null,
        meta: { owner: input?.owner || undefined },
        idempotencyKey: randomUUID(),
      })
      if (!done) return JSON.stringify({ status: 'noop', message: 'Already added.' })
      return JSON.stringify({
        status: 'added', zone: 'green', record_id: done.row.id, task: title,
        due_date: input?.due_date || null, undo: `/undo-${done.row.id}`,
        tell_user: 'Added it (autopilot, reversible). Offer the /undo id.',
      })
    }

    // ---- 🟢 add_lead — reversible → autopilot. ----
    if (name === 'add_lead') {
      const nm = String(input?.name || '').trim()
      if (!nm) return JSON.stringify({ status: 'error', message: 'What is the lead name?' })
      const value = Number(input?.value)
      const done = await runAutopilot('add-lead', {
        op: 'insert', category: 'lead', title: nm,
        amount: Number.isFinite(value) ? value : 0,
        status: input?.stage || 'new',
        meta: { customer: nm, source: input?.source || undefined },
        idempotencyKey: randomUUID(),
      })
      if (!done) return JSON.stringify({ status: 'noop', message: 'Already added.' })
      return JSON.stringify({
        status: 'added', zone: 'green', record_id: done.row.id, lead: nm,
        value: Number.isFinite(value) ? rm(value) : null, stage: input?.stage || 'new',
        undo: `/undo-${done.row.id}`, tell_user: 'Added the lead (autopilot). Offer the /undo id.',
      })
    }

    // ---- 🟡 log_cash_in — money → ask first. ----
    if (name === 'log_cash_in') {
      const amount = Number(input?.amount)
      const source = String(input?.source || '').trim()
      if (!Number.isFinite(amount) || amount <= 0) return JSON.stringify({ status: 'error', message: 'I need a positive amount.' })
      const row = await proposeAndNotify({
        agentKey: 'log-cash-in',
        idempotencyKey: randomUUID(),
        payload: { op: 'insert', category: 'cash_in', title: source || 'Income', amount, status: 'pending', meta: { customer: input?.customer || undefined } },
        chatId,
        text: `💰 Log income <b>${rm(amount)}</b>${source ? ` from ${source}` : ''}? (Approve to add to Cash In.)`,
      })
      return JSON.stringify(
        row
          ? { status: 'proposed', zone: 'yellow', sent_buttons: true, tell_user: `Proposed ${rm(amount)} income — buttons sent. Tell them to tap ✅.` }
          : { status: 'noop', message: 'Already proposed.' },
      )
    }

    // ---- 🟡 mark_invoice_paid — resolve, then ask first. ----
    if (name === 'mark_invoice_paid') {
      const matches = matchRows(rows, 'cash_in', String(input?.invoice || ''), true)
      if (matches.length === 0) return JSON.stringify({ status: 'not_found', message: `No unpaid invoice matching "${input?.invoice}".` })
      if (matches.length > 1) {
        return JSON.stringify({ status: 'ambiguous', message: 'Which one?', candidates: matches.slice(0, 5).map(r => ({ id: r.id, title: r.title, who: r.meta?.customer || null, amount: rm(r.amount) })) })
      }
      const inv = matches[0]
      const row = await proposeAndNotify({
        agentKey: 'mark-paid',
        idempotencyKey: randomUUID(),
        payload: { op: 'update', record_id: inv.id, status: 'paid' },
        chatId,
        text: `💰 Mark <b>${inv.title}</b> (${rm(inv.amount)}) as <b>PAID</b>? (Approve to confirm.)`,
      })
      return JSON.stringify(
        row
          ? { status: 'proposed', zone: 'yellow', sent_buttons: true, record_id: inv.id, tell_user: `Proposed marking "${inv.title}" paid — buttons sent. Tell them to tap ✅.` }
          : { status: 'noop', message: 'Already proposed.' },
      )
    }

    // ---- 🟡 update_lead_status — resolve, then ask first. ----
    if (name === 'update_lead_status') {
      const stage = String(input?.stage || '').toLowerCase()
      const valid = ['new', 'contacted', 'appointment', 'closed', 'nurture']
      if (!valid.includes(stage)) return JSON.stringify({ status: 'error', message: `Stage must be one of ${valid.join(', ')}.` })
      const matches = matchRows(rows, 'lead', String(input?.lead || ''))
      if (matches.length === 0) return JSON.stringify({ status: 'not_found', message: `No lead matching "${input?.lead}".` })
      if (matches.length > 1) {
        return JSON.stringify({ status: 'ambiguous', message: 'Which lead?', candidates: matches.slice(0, 5).map(r => ({ id: r.id, name: r.meta?.customer || r.title, stage: r.status })) })
      }
      const lead = matches[0]
      const row = await proposeAndNotify({
        agentKey: 'lead-status',
        idempotencyKey: randomUUID(),
        payload: { op: 'update', record_id: lead.id, status: stage },
        chatId,
        text: `🎯 Move <b>${lead.meta?.customer || lead.title}</b> to <b>${stage}</b>? (Approve to update the pipeline.)`,
      })
      return JSON.stringify(
        row
          ? { status: 'proposed', zone: 'yellow', sent_buttons: true, record_id: lead.id, tell_user: `Proposed moving "${lead.meta?.customer || lead.title}" to ${stage} — buttons sent. Tell them to tap ✅.` }
          : { status: 'noop', message: 'Already proposed.' },
      )
    }

    return JSON.stringify({ status: 'error', message: `unknown action "${name}"` })
  } catch (e: any) {
    console.error('[CFO] bot action failed:', e)
    return JSON.stringify({ status: 'error', message: 'that action failed — try again or do it in the app' })
  }
}
