// 👉 This is your Calendar tab — everything in the business that has a DATE, on one
// timeline. It invents nothing and owns no category of its own: it reads the ONE
// `records` table and shows every row that has a due_date, whatever tab that row
// normally lives on (money in, money out, tasks, content).
// Month grid on desktop, day-by-day list on phones — same data, CSS swaps them.
import Link from 'next/link'
import { getRecords, rm, todayISO, type Rec } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import Stat from '@/app/_components/Stat'

export const dynamic = 'force-dynamic'

// The four kinds of row that carry a date worth putting on a calendar, and what
// "finished" means for each. Finished rows stay visible but greyed out, so the
// calendar reads as a record of what happened as well as what's coming.
// Adding a 5th kind later = one line here (plus a colour in globals.css).
const KINDS = {
  cash_in: { label: 'Money in', ico: '💰', done: ['paid', 'done', 'closed', 'reversed'] },
  cash_out: { label: 'Money out', ico: '🧾', done: ['paid', 'done', 'closed', 'reversed'] },
  task: { label: 'Task', ico: '✅', done: ['done', 'closed'] },
  content: { label: 'Content', ico: '📣', done: ['posted', 'published', 'done'] },
} as const

type Kind = keyof typeof KINDS
const ON_CALENDAR = Object.keys(KINDS) as Kind[]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_CHIPS = 3 // per day cell before we collapse the rest into "+n more"

// ── Dates ────────────────────────────────────────────────────────────────────
// All date maths runs on YYYY-MM-DD strings in UTC, so a row never slides a day
// because the server and your phone sit in different timezones.
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const asDate = (iso: string) => new Date(iso + 'T00:00:00Z')

const addDays = (iso: string, n: number) => {
  const d = asDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return ymd(d)
}
const monthOf = (iso: string) => iso.slice(0, 7) // YYYY-MM
const shiftMonth = (mo: string, n: number) => {
  const [y, m] = mo.split('-').map(Number)
  return ymd(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7)
}
// Day 0 of the NEXT month is the last day of this one — handles Feb + leap years.
const daysInMonth = (mo: string) => {
  const [y, m] = mo.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
const lastDayOf = (mo: string) => `${mo}-${String(daysInMonth(mo)).padStart(2, '0')}`
// Weekday the 1st falls on, Monday = 0 (getUTCDay has Sunday = 0).
const firstWeekday = (mo: string) => (asDate(mo + '-01').getUTCDay() + 6) % 7
const monthTitle = (mo: string) =>
  asDate(mo + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayTitle = (iso: string) =>
  asDate(iso).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

// ?m= comes from the URL, so never trust it — anything that isn't a real
// YYYY-MM falls back to the current month instead of rendering NaN cells.
const safeMonth = (raw: string | undefined, fallback: string) => {
  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return fallback
  return raw
}

// One thing on one day. Flattened from a record so the render stays dumb.
type Ev = {
  id: number
  date: string
  title: string
  kind: Kind
  amount: number
  status: string
  done: boolean
  overdue: boolean
}

export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>
}) {
  const { m: monthParam } = await searchParams
  const all = await getRecords()
  const today = todayISO()
  const month = safeMonth(monthParam, monthOf(today))

  const isDone = (r: Rec, kind: Kind) =>
    (KINDS[kind].done as readonly string[]).includes((r.status || '').toLowerCase())

  const events: Ev[] = all
    .filter(r => !!r.due_date && ON_CALENDAR.includes(r.category as Kind))
    .map(r => {
      const kind = r.category as Kind
      const done = isDone(r, kind)
      return {
        id: r.id,
        date: r.due_date as string,
        title: r.title || '(untitled)',
        kind,
        amount: Number(r.amount || 0),
        status: r.status || '',
        done,
        // Overdue = still open AND the date has passed. We only flag it here —
        // the stored status is never rewritten. The human decides.
        overdue: !done && (r.due_date as string) < today,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))

  // The three counts are about YOUR next few weeks, not the month you happen to
  // be looking at — so paging back to March doesn't change what's urgent today.
  const weekEnd = addDays(today, 6)
  const monthEnd = lastDayOf(monthOf(today))
  const open = events.filter(e => !e.done)
  const overdueCount = open.filter(e => e.date < today).length
  const weekCount = open.filter(e => e.date >= today && e.date <= weekEnd).length
  const monthCount = open.filter(e => e.date >= today && e.date <= monthEnd).length

  // Bucket this month's events by day once; both views read the same map.
  const byDay = new Map<string, Ev[]>()
  for (const e of events) {
    if (monthOf(e.date) !== month) continue
    const bucket = byDay.get(e.date)
    if (bucket) bucket.push(e)
    else byDay.set(e.date, [e])
  }
  const monthCountShown = [...byDay.values()].reduce((n, list) => n + list.length, 0)

  // Grid cells = blank pads for the days before the 1st, then 1…n, then blank
  // pads so the last week is a full row (keeps the rounded corners square).
  const lead = firstWeekday(month)
  const total = daysInMonth(month)
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const dayISO = (n: number) => `${month}-${String(n).padStart(2, '0')}`

  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)

  return (
    <>
      <h1 className="ph">Calendar 📅</h1>
      <p className="cap">Everything with a date — money in, money out, tasks, content — on one timeline.</p>

      <div className="grid">
        <Stat label="Overdue" value={overdueCount} yes={overdueCount > 0} />
        <Stat label="Due in 7 days" value={weekCount} />
        <Stat label="Rest of this month" value={monthCount} />
      </div>

      <div className="cal-nav">
        <Link className="cal-arrow" href={`/calendar?m=${prev}`} aria-label="Previous month">←</Link>
        <p className="cal-month">{monthTitle(month)}</p>
        <Link className="cal-arrow" href={`/calendar?m=${next}`} aria-label="Next month">→</Link>
        {month !== monthOf(today) ? (
          <Link className="cal-today-link" href="/calendar">Today</Link>
        ) : null}
      </div>

      <ul className="cal-legend">
        {ON_CALENDAR.map(k => (
          <li key={k}>
            <span className={`cal-dot ${k}`} aria-hidden="true" />
            {KINDS[k].label}
          </li>
        ))}
      </ul>

      {all.length === 0 ? (
        <Empty />
      ) : (
        <>
          {monthCountShown === 0 ? (
            <p className="cal-none">Nothing dated in {monthTitle(month)}.</p>
          ) : null}

          {/* Desktop: the month grid. Hidden ≤768px. */}
          <div className="cal-grid">
            {WEEKDAYS.map(d => (
              <div className="cal-dow" key={d}>{d}</div>
            ))}
            {cells.map((n, i) => {
              if (n === null) return <div className="cal-day pad" key={`pad-${i}`} />
              const iso = dayISO(n)
              const list = byDay.get(iso) ?? []
              return (
                <div className={`cal-day${iso === today ? ' today' : ''}`} key={iso}>
                  <span className="cal-dnum">{n}</span>
                  {list.slice(0, MAX_CHIPS).map(e => (
                    <span
                      key={e.id}
                      className={`cal-chip ${e.kind}${e.overdue ? ' od' : ''}${e.done ? ' done' : ''}`}
                      title={`${KINDS[e.kind].label} · ${e.title}${e.amount ? ' · ' + rm(e.amount) : ''}`}
                    >
                      {KINDS[e.kind].ico} {e.title}
                    </span>
                  ))}
                  {list.length > MAX_CHIPS ? (
                    <span className="cal-more">+{list.length - MAX_CHIPS} more</span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Phone: the same month as a day-by-day list. Hidden on desktop. */}
          <div className="cal-list">
            {[...byDay.keys()].sort().map(iso => (
              <div className="cal-dayrow" key={iso}>
                <p className="cal-dhead">
                  {dayTitle(iso)}
                  {iso === today ? <span className="cal-todaytag">Today</span> : null}
                </p>
                {(byDay.get(iso) ?? []).map(e => {
                  // An overdue row wears the red pill even though its stored status
                  // still says "waiting" — clearer for the human at a glance.
                  const shown = e.overdue ? 'overdue' : (e.status || '—')
                  return (
                    <div
                      className={`cal-item ${e.kind}${e.overdue ? ' od' : ''}${e.done ? ' done' : ''}`}
                      key={e.id}
                    >
                      <span className="cal-ico" aria-hidden="true">{KINDS[e.kind].ico}</span>
                      <div>
                        <p className="cal-t">{e.title}</p>
                        <p className="cal-s">
                          <span>{KINDS[e.kind].label}</span>
                          {e.amount ? <span>· {rm(e.amount)}</span> : null}
                          <span className={`pill ${shown}`}>{shown}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
