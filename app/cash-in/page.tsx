// 👉 This is your Cash In tab — money coming IN. Safe to edit the columns/labels.
// It reads the ONE `records` table, filtered to category='cash_in'. Copy this file's
// shape when you add your own money tab.
import { getRecords, rm, m, todayISO } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import Stat from '@/app/_components/Stat'

export const dynamic = 'force-dynamic'

// A cash-in row counts as "waiting" (not yet in the bank) if its status is one of
// these. Anything else (paid/received) is money that already landed.
const WAITING = ['waiting', 'unpaid', 'overdue', 'pending']

export default async function CashIn() {
  const all = await getRecords()
  const rows = all.filter(r => r.category === 'cash_in')

  const isWaiting = (r: (typeof rows)[number]) => WAITING.includes((r.status || '').toLowerCase())
  // Overdue = still waiting AND the due date is in the past. We flag it, but never
  // change the stored status — the robot only surfaces it, the human decides.
  const isOverdue = (r: (typeof rows)[number]) =>
    isWaiting(r) && !!r.due_date && r.due_date < todayISO()

  const paid = rows.filter(r => !isWaiting(r)).reduce((s, r) => s + Number(r.amount || 0), 0)
  const waiting = rows.filter(isWaiting).reduce((s, r) => s + Number(r.amount || 0), 0)

  // Show the money still waiting first (that's what needs chasing), then the rest.
  const sorted = [...rows].sort((a, b) => Number(isWaiting(b)) - Number(isWaiting(a)))

  return (
    <>
      <h1 className="ph">Cash In 💰</h1>
      <p className="cap">Money coming in — paid vs waiting.</p>

      <div className="grid">
        <Stat label="Paid" value={rm(paid)} />
        <Stat label="Waiting" value={rm(waiting)} yes={waiting > 0} />
        <Stat label="Total tracked" value={rm(paid + waiting)} />
      </div>

      {all.length === 0 ? (
        <Empty />
      ) : rows.length === 0 ? (
        <Empty label="money-in" />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>What</th>
              <th>From</th>
              <th>Status</th>
              <th>Due</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const overdue = isOverdue(r)
              // An overdue row wears the red "overdue" pill even though its stored
              // status is still "waiting" — clearer for the human at a glance.
              const shownStatus = overdue ? 'overdue' : (r.status || '—')
              return (
                <tr key={r.id}>
                  <td data-label="What">{r.title}</td>
                  <td data-label="From">{m(r, 'customer')}</td>
                  <td data-label="Status">
                    <span className={`pill ${shownStatus}`}>{shownStatus}</span>
                  </td>
                  <td data-label="Due">{r.due_date || '—'}</td>
                  <td data-label="Amount">{rm(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
