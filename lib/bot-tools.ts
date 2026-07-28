import 'server-only'
import type { Rec } from './records'
import { rm, todayISO, getFunnel } from './records'

// 🔒 Don't edit — this keeps your robot safe.
// The Jarvis bot's HANDS. Instead of dumping your whole table into the prompt,
// Claude picks ONE of these small tools, the server runs it against your records,
// and the result comes back grounded. This IS the foundational agent loop:
//   Claude decides → the server runs the tool → Claude reads the result → answers.
// Cheaper (no full-table dumps), and money answers are always grounded in a real
// query, never guessed.
//
// Every tool here is READ-ONLY. None of them writes a row, sends a message, or
// moves money — Jarvis answers questions; it never acts. (Acting is the HITL
// engine's job, behind an approval.)

// The tool schema handed to Claude. `escalate` is the human escape hatch: Claude
// calls it (instead of guessing) when the user is stuck, frustrated, or asks for
// something outside these read tools.
export const BOT_TOOLS = [
  {
    name: 'get_cash_summary',
    description:
      'Get cash in, cash out, net, and how much is still owed to the owner, for a time window. ' +
      'Use this for ANY money total question ("how much cash in this week?", "what\'s my net this month?", "who owes me?").',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month', 'all'],
          description: 'week = last 7 days, month = last 30 days, all = everything. Default all.',
        },
      },
    },
  },
  {
    name: 'list_overdue',
    description:
      'List everything past its due date and not yet done/paid — overdue invoices, tasks, follow-ups.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_funnel',
    description:
      'The whole-business funnel/pipeline: Views → Leads → Appointments → Closed → Nurture, with ' +
      'stage-to-stage conversion %, plus total open-pipeline RM value. Use for "how\'s my pipeline?", ' +
      '"pipeline value?", "how many leads / appointments?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_leads',
    description:
      'List leads, optionally filtered by stage. Each lead has a deal value (RM), stage, and next step. ' +
      'Use for "show me open leads", "who\'s at appointment stage?", "what did we close?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        stage: {
          type: 'string',
          enum: ['new', 'contacted', 'appointment', 'closed', 'nurture', 'open'],
          description: 'Optional. "open" = still in play (new/contacted/appointment). Omit for all.',
        },
      },
    },
  },
  {
    name: 'list_owed',
    description:
      'List unpaid money owed TO the owner (unpaid cash_in / invoices), each with how many days ' +
      'past due, plus the total outstanding. Use for "who owes me?", "total outstanding?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_overdue_invoices',
    description:
      'Only the OVERDUE invoices (unpaid cash_in already past its due date), sorted most-late first, ' +
      'each flagged with how many days late. Use for "overdue invoices", "who\'s late paying me?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'tasks_due',
    description:
      'Open tasks, optionally within a time window, sorted by deadline, with the owner from meta. ' +
      'Use for "what\'s due this week?", "what tasks are open?", "what\'s due today?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        window: {
          type: 'string',
          enum: ['today', 'week', 'all'],
          description: 'today = due on/before today, week = next 7 days, all = every open task. Default week.',
        },
      },
    },
  },
  {
    name: 'content_status',
    description:
      'Content pipeline: what is posted, scheduled, or still a draft — with platform/format and ' +
      '(for posted) views. Use for "what\'s scheduled?", "what content is coming up?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'who_to_followup',
    description:
      'People (customers + quiet leads) who have gone silent, ranked by how long since last contact, ' +
      'with their next step. Use for "who do I need to follow up with?", "who should I chase?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pending_vs_won',
    description:
      'Money split: RM already won (closed leads + paid cash_in) vs RM still pending (open pipeline + ' +
      'unpaid invoices), with counts. Use for "how much is pending vs won?", "what\'s in the pipeline value?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'attention_today',
    description:
      'The daily triage in one call: overdue invoices + tasks due today + proposals waiting for a YES. ' +
      'Use for "what needs my attention today?", "what should I look at?".',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'draft_followup',
    description:
      'Pull one person\'s context (last contact, company, deal, next step) so you can COMPOSE a short, ' +
      'friendly follow-up message for the OWNER to copy and send themselves. Use for "draft a follow-up ' +
      'for <name>", "write <name> a nudge". You draft the text in your reply — you NEVER send it, and you ' +
      'must never claim it was sent.',
    input_schema: {
      type: 'object' as const,
      properties: { name: { type: 'string', description: 'The person / customer / lead name to draft for.' } },
      required: ['name'],
    },
  },
  {
    name: 'search_records',
    description:
      'Find records whose title, notes, or details match a search word. Optionally filter to one ' +
      'category (cash_in, cash_out, lead, customer, content, task, doc).',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The word or name to look for.' },
        category: {
          type: 'string',
          enum: ['cash_in', 'cash_out', 'lead', 'customer', 'content', 'task', 'doc'],
          description: 'Optional — restrict the search to one category.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'escalate',
    description:
      'Flag the human owner and stop. Use this — instead of guessing — when the user is frustrated, ' +
      'asks to talk to a human, wants something these read tools cannot do, or you have already tried ' +
      'twice and failed. Never invent an answer for a money question you cannot ground in a tool result.',
    input_schema: {
      type: 'object' as const,
      properties: { reason: { type: 'string', description: 'One short line on why you are escalating.' } },
      required: ['reason'],
    },
  },
]

const sum = (rows: Rec[]) => rows.reduce((s, r) => s + Number(r.amount || 0), 0)
const PAID = new Set(['paid', 'done', 'closed', 'reversed'])
// A lead that has left the open pipeline (won or dropped) — excluded from pipeline value.
const CLOSED_LOST = new Set(['closed', 'nurture', 'lost', 'reversed'])
// Whole days a due date is past today (>=0).
const daysLate = (due: string, today: string) =>
  Math.max(0, Math.floor((Date.parse(today) - Date.parse(due)) / 86_400_000))

// ------------------------------------------------------------
// runBotTool() — execute ONE tool against the already-fetched records. Returns a
// compact JSON string (the caller wraps it in <<<DATA…DATA>>> as untrusted data).
// `escalate` returns a sentinel the loop watches for. Never throws.
// ------------------------------------------------------------
export function runBotTool(name: string, input: any, rows: Rec[]): string {
  try {
    if (name === 'escalate') {
      return JSON.stringify({ escalated: true, reason: String(input?.reason || 'flagged') })
    }

    if (name === 'get_cash_summary') {
      const period: 'week' | 'month' | 'all' =
        input?.period === 'week' || input?.period === 'month' ? input.period : 'all'
      const days = period === 'week' ? 7 : period === 'month' ? 30 : Infinity
      const since = Date.now() - days * 86_400_000
      const inWindow = (r: Rec) =>
        !Number.isFinite(days) || new Date(r.created_at).getTime() >= since

      const cashIn = sum(rows.filter(r => r.category === 'cash_in' && inWindow(r)))
      const cashOut = sum(rows.filter(r => r.category === 'cash_out' && inWindow(r)))
      // "Who owes me" = cash_in still unpaid — outstanding regardless of the window.
      const owed = sum(rows.filter(r => r.category === 'cash_in' && !PAID.has((r.status || '').toLowerCase())))
      return JSON.stringify({
        period,
        cash_in: cashIn,
        cash_out: cashOut,
        net: cashIn - cashOut,
        owed_to_you: owed,
        display: {
          cash_in: rm(cashIn),
          cash_out: rm(cashOut),
          net: rm(cashIn - cashOut),
          owed_to_you: rm(owed),
        },
      })
    }

    if (name === 'list_overdue') {
      const today = todayISO()
      const overdue = rows
        .filter(r => r.due_date && r.due_date < today && !PAID.has((r.status || '').toLowerCase()))
        .map(r => ({
          title: r.title,
          category: r.category,
          amount: r.amount,
          due_date: r.due_date,
          status: r.status,
        }))
      return JSON.stringify({ count: overdue.length, overdue })
    }

    if (name === 'search_records') {
      const q = String(input?.query || '').toLowerCase().trim()
      const cat = input?.category
      const hits = rows
        .filter(r => (cat ? r.category === cat : true))
        .filter(r => {
          if (!q) return true
          const hay = `${r.title} ${r.notes || ''} ${JSON.stringify(r.meta || {})}`.toLowerCase()
          return hay.includes(q)
        })
        .slice(0, 25)
        .map(r => ({
          title: r.title,
          category: r.category,
          status: r.status,
          amount: r.amount,
          due_date: r.due_date,
          ...r.meta,
        }))
      return JSON.stringify({ count: hits.length, results: hits })
    }

    if (name === 'get_funnel') {
      const f = getFunnel(rows)
      const openLeads = rows.filter(r => r.category === 'lead' && !CLOSED_LOST.has((r.status || '').toLowerCase()))
      const pipelineValue = sum(openLeads)
      return JSON.stringify({
        funnel: {
          views: f.views, leads: f.leads, appointments: f.appointments,
          closed: f.closed, nurture: f.nurture,
        },
        conversion_pct: f.pct,
        open_pipeline_value: pipelineValue,
        display: { open_pipeline_value: rm(pipelineValue) },
      })
    }

    if (name === 'list_leads') {
      const stage = String(input?.stage || '').toLowerCase()
      const leads = rows.filter(r => r.category === 'lead')
      const pick =
        stage === 'open'
          ? leads.filter(r => ['new', 'contacted', 'appointment'].includes((r.status || '').toLowerCase()))
          : stage
            ? leads.filter(r => (r.status || '').toLowerCase() === stage)
            : leads
      const out = pick
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .map(r => ({
          name: r.meta?.customer || r.title,
          stage: r.status,
          value: r.amount,
          value_display: rm(r.amount),
          next: r.meta?.next || null,
          due_date: r.due_date,
        }))
      return JSON.stringify({ count: out.length, total_value: rm(sum(pick)), leads: out })
    }

    if (name === 'list_owed' || name === 'list_overdue_invoices') {
      const today = todayISO()
      const onlyOverdue = name === 'list_overdue_invoices'
      const unpaid = rows.filter(
        r => r.category === 'cash_in' && !PAID.has((r.status || '').toLowerCase()),
      )
      const picked = onlyOverdue ? unpaid.filter(r => r.due_date && r.due_date < today) : unpaid
      const out = picked
        .map(r => ({
          who: r.meta?.customer || r.title,
          title: r.title,
          amount: r.amount,
          amount_display: rm(r.amount),
          due_date: r.due_date,
          days_late: r.due_date && r.due_date < today ? daysLate(r.due_date, today) : 0,
        }))
        .sort((a, b) => b.days_late - a.days_late)
      return JSON.stringify({
        count: out.length,
        total_outstanding: rm(sum(picked)),
        [onlyOverdue ? 'overdue_invoices' : 'owed']: out,
      })
    }

    if (name === 'tasks_due') {
      const today = todayISO()
      const window: 'today' | 'week' | 'all' =
        input?.window === 'today' || input?.window === 'all' ? input.window : 'week'
      const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
      const openTasks = rows.filter(r => r.category === 'task' && !PAID.has((r.status || '').toLowerCase()))
      const picked = openTasks.filter(r => {
        if (window === 'all') return true
        if (!r.due_date) return false // undated tasks only show in the 'all' window
        if (window === 'today') return r.due_date <= today
        return r.due_date <= weekAhead
      })
      const out = picked
        .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
        .map(r => ({ task: r.title, due_date: r.due_date, owner: r.meta?.owner || null, status: r.status }))
      return JSON.stringify({ window, count: out.length, tasks: out })
    }

    if (name === 'content_status') {
      const content = rows.filter(r => r.category === 'content')
      const byState = (s: string) =>
        content
          .filter(r => (r.status || '').toLowerCase() === s)
          .map(r => ({
            title: r.title,
            platform: r.meta?.platform || null,
            format: r.meta?.format || null,
            views: r.meta?.views ?? null,
            scheduled_for: r.due_date,
          }))
      return JSON.stringify({
        posted: byState('posted'),
        scheduled: byState('scheduled'),
        draft: byState('draft'),
      })
    }

    if (name === 'who_to_followup') {
      const today = Date.parse(todayISO())
      const people = rows.filter(
        r =>
          r.category === 'customer' ||
          (r.category === 'lead' && ['contacted', 'nurture'].includes((r.status || '').toLowerCase())),
      )
      const out = people
        .map(r => {
          // Accept either meta key — last_contact (new) or last_touch (V1/real data).
          const last = r.meta?.last_contact || r.meta?.last_touch || r.created_at?.slice(0, 10) || null
          const days = last ? Math.floor((today - Date.parse(last)) / 86_400_000) : 999
          return {
            name: r.meta?.customer || r.title,
            company: r.meta?.company || null,
            last_contact: last,
            days_since_contact: days,
            next: r.meta?.next || null,
          }
        })
        .sort((a, b) => b.days_since_contact - a.days_since_contact)
        .slice(0, 15)
      return JSON.stringify({ count: out.length, follow_up: out })
    }

    if (name === 'pending_vs_won') {
      const wonLeads = sum(rows.filter(r => r.category === 'lead' && (r.status || '').toLowerCase() === 'closed'))
      const paidIn = sum(rows.filter(r => r.category === 'cash_in' && PAID.has((r.status || '').toLowerCase())))
      const openPipe = sum(
        rows.filter(r => r.category === 'lead' && !CLOSED_LOST.has((r.status || '').toLowerCase())),
      )
      const unpaidIn = sum(rows.filter(r => r.category === 'cash_in' && !PAID.has((r.status || '').toLowerCase())))
      const won = wonLeads + paidIn
      const pending = openPipe + unpaidIn
      return JSON.stringify({
        won, pending,
        display: { won: rm(won), pending: rm(pending) },
        breakdown: {
          won: { closed_leads: rm(wonLeads), paid_invoices: rm(paidIn) },
          pending: { open_pipeline: rm(openPipe), unpaid_invoices: rm(unpaidIn) },
        },
      })
    }

    if (name === 'attention_today') {
      const today = todayISO()
      const overdueInv = rows
        .filter(r => r.category === 'cash_in' && !PAID.has((r.status || '').toLowerCase()) && r.due_date && r.due_date < today)
        .map(r => ({ what: r.title, who: r.meta?.customer || null, amount: rm(r.amount), days_late: daysLate(r.due_date!, today) }))
      const tasksToday = rows
        .filter(r => r.category === 'task' && !PAID.has((r.status || '').toLowerCase()) && r.due_date && r.due_date <= today)
        .map(r => ({ task: r.title, owner: r.meta?.owner || null, due_date: r.due_date }))
      return JSON.stringify({
        overdue_invoices: overdueInv,
        tasks_due_today: tasksToday,
        // waiting_approvals is filled by the caller (needs an async DB read); the
        // owner also sees them in the app + the morning brief.
        note: 'Proposals waiting for your YES are in the Approvals tab and your morning brief.',
        summary_counts: { overdue_invoices: overdueInv.length, tasks_due_today: tasksToday.length },
      })
    }

    if (name === 'draft_followup') {
      const q = String(input?.name || '').toLowerCase().trim()
      const person = rows.find(
        r =>
          (r.category === 'customer' || r.category === 'lead') &&
          (`${r.title} ${r.meta?.customer || ''} ${r.meta?.company || ''}`.toLowerCase().includes(q)),
      )
      if (!person) {
        return JSON.stringify({ found: false, note: `No customer or lead matching "${input?.name}". Ask the owner who they mean.` })
      }
      return JSON.stringify({
        found: true,
        name: person.meta?.customer || person.title,
        company: person.meta?.company || null,
        stage_or_status: person.status,
        deal_value: person.category === 'lead' ? rm(person.amount) : null,
        last_contact: person.meta?.last_contact || null,
        next_step: person.meta?.next || null,
        instruction:
          'Compose a SHORT, warm follow-up message (2-3 sentences) for the OWNER to copy and send. ' +
          'Do not include placeholders they must fill. NEVER say it has been sent — end your reply making clear ' +
          'it is a draft for them to send themselves.',
      })
    }

    return JSON.stringify({ error: `unknown tool "${name}"` })
  } catch (e: any) {
    // A tool must never crash the bot — degrade to a calm, grounded "couldn't run".
    console.error('[CFO] bot tool failed:', e)
    return JSON.stringify({ error: 'that lookup failed — try rephrasing' })
  }
}
