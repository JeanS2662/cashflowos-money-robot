import { supabase, supabaseConfigured } from '@/lib/supabase'
import { rm } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import ApproveButtons from '@/app/_components/ApproveButtons'

export const dynamic = 'force-dynamic'

// One waiting proposal.
type Pending = {
  id: number
  agent_key: string
  payload: any
  proposed_at: string
  expires_at: string
  expired: boolean
}

// One line in the audit feed.
type HistItem = { when: string; agent: string; outcome: string; note: string }

// Turn a proposal's immutable payload into one calm human line.
function describePayload(p: any): string {
  if (!p || typeof p !== 'object') return 'A proposed action.'
  if (p.note) return String(p.note)
  const bits: string[] = []
  if (p.merchant) bits.push(String(p.merchant))
  if (p.amount != null && Number(p.amount) > 0) bits.push(rm(Number(p.amount)))
  if (p.category) bits.push(String(p.category))
  if (p.text) return String(p.text)
  return bits.length ? bits.join(' · ') : 'A proposed action.'
}

// Map any status/outcome word to one of the .pill colour classes in globals.css.
function pill(word: string): string {
  const w = (word || '').toLowerCase()
  if (['executed', 'ok', 'done', 'approved'].includes(w)) return 'executed'
  if (['rejected', 'failed', 'expired'].includes(w)) return w
  if (w === 'undone') return 'nurture'
  if (w === 'escalated') return 'pending'
  return 'open'
}

async function getPending(): Promise<Pending[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase
    .from('agent_actions')
    .select('id, agent_key, payload, proposed_at, expires_at')
    .eq('status', 'proposed')
    .order('proposed_at', { ascending: false })
  if (error) {
    console.error('[CFO] could not read proposals:', error.message)
    return []
  }
  const now = Date.now()
  // Lazily show expired ones (no sweeper cron) — the claim would refuse them anyway.
  return (data ?? []).map(r => ({ ...r, expired: new Date(r.expires_at).getTime() <= now })) as Pending[]
}

async function getHistory(): Promise<HistItem[]> {
  if (!supabaseConfigured) return []
  const [runsRes, actionsRes] = await Promise.all([
    supabase
      .from('agent_runs')
      .select('agent_key, outcome, finished_at, started_at, detail')
      .order('started_at', { ascending: false })
      .limit(40),
    supabase
      .from('agent_actions')
      .select('agent_key, status, payload, decided_at, executed_at, proposed_at')
      .neq('status', 'proposed')
      .order('proposed_at', { ascending: false })
      .limit(40),
  ])

  const items: HistItem[] = []
  for (const r of runsRes.data ?? []) {
    items.push({
      when: r.finished_at || r.started_at,
      agent: r.agent_key,
      outcome: r.outcome || 'ran',
      note: (r.detail && (r.detail.title || r.detail.reversal_record_id != null))
        ? (r.detail.title || `reversal record #${r.detail.reversal_record_id}`)
        : 'agent run',
    })
  }
  for (const a of actionsRes.data ?? []) {
    items.push({
      when: a.decided_at || a.executed_at || a.proposed_at,
      agent: a.agent_key,
      outcome: a.status,
      note: describePayload(a.payload),
    })
  }
  // Newest first; keep it to a readable feed.
  return items
    .filter(i => i.when)
    .sort((x, y) => new Date(y.when).getTime() - new Date(x.when).getTime())
    .slice(0, 30)
}

export default async function Approvals() {
  const [pending, history] = await Promise.all([getPending(), getHistory()])
  const live = pending.filter(p => !p.expired)

  return (
    <>
      <h1 className="ph">Approvals 🙋</h1>
      <p className="cap">What your robots want to do — approve or reject here, or from Telegram. Same decision either way.</p>

      {/* ---- Pending: the "needs your YES" list ---- */}
      <p className="rowlabel">Pending{live.length ? ` (${live.length})` : ''}</p>
      {!supabaseConfigured ? (
        <Empty />
      ) : pending.length === 0 ? (
        <div className="empty">All clear — nothing is waiting for your YES right now. 🎉</div>
      ) : (
        pending.map(p => (
          <div className="agent-card" key={p.id}>
            <p className="ac-name">
              <span>{describePayload(p.payload)}</span>
              {p.expired ? (
                <span className="pill expired">expired</span>
              ) : (
                <span className="pill proposed">needs your YES</span>
              )}
            </p>
            <p className="ac-role">
              From <b>{p.agent_key}</b> · proposed {new Date(p.proposed_at).toLocaleString('en-MY')}
            </p>
            {p.expired ? (
              <p className="ac-lastrun">This one timed out — it can no longer be approved. Ask the robot to propose again.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                <ApproveButtons id={p.id} />
              </div>
            )}
          </div>
        ))
      )}

      {/* ---- History: the audit feed (the Activity view) ---- */}
      <p className="rowlabel" style={{ marginTop: 28 }}>History</p>
      {!supabaseConfigured ? null : history.length === 0 ? (
        <div className="empty">No activity yet — approved, rejected, and auto-filed actions show up here.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>When</th>
              <th>Robot</th>
              <th>What</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td data-label="When">{new Date(h.when).toLocaleString('en-MY')}</td>
                <td data-label="Robot">{h.agent}</td>
                <td data-label="What">{h.note}</td>
                <td data-label="Outcome">
                  <span className={`pill ${pill(h.outcome)}`}>{h.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
