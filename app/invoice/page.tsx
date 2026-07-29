// 👉 This is your Invoice tab — who has paid you and who hasn't. Safe to edit the
// columns/labels. It reads the ONE `records` table: the same cash_in rows the Cash In
// tab uses, narrowed to the ones that are actually invoices.
import { getRecords, rm, m, todayISO, type Rec } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import Stat from '@/app/_components/Stat'

export const dynamic = 'force-dynamic'

// Settled = the money landed. Anything NOT in this list is still owed to you.
// This is deliberately the SAME list the bot and the 8am Telegram brief use
// (lib/bot-tools.ts, app/api/cron-daily/route.ts) — so this tab and your morning
// message can never quote different numbers at each other.
const PAID = new Set(['paid', 'done', 'closed', 'reversed'])

// What counts as an invoice. The title test catches the ones you typed by hand
// ("Invoice #014 — Lai Holdings"); the customer test catches the ones the bot logs
// for you, which it titles from free text (see lib/bot-actions.ts) and would
// otherwise never appear here.
const isInvoice = (r: Rec) =>
  r.category === 'cash_in' && (/invoice/i.test(r.title || '') || !!m(r, 'customer'))

// The invoice number lives inside the title, so we read it out for its own column.
// Display only — nothing is written back to the database.
const invoiceNo = (title: string) => {
  const hit = (title || '').match(/#\s*(\d+)/)
  return hit ? `#${hit[1]}` : '—'
}

// Prefer the stored customer; fall back to whatever follows the em-dash in the title.
const who = (r: Rec) => m(r, 'customer') || (r.title || '').split('—')[1]?.trim() || '—'

export default async function Invoice() {
  const all = await getRecords()
  const rows = all.filter(isInvoice)

  const isUnpaid = (r: Rec) => !PAID.has((r.status || '').toLowerCase())
  // Overdue = still unpaid AND the due date has passed. We only flag it here —
  // the stored status is never changed. The robot surfaces, the human decides.
  const isOverdue = (r: Rec) => isUnpaid(r) && !!r.due_date && r.due_date < todayISO()

  const total = (list: Rec[]) => list.reduce((s, r) => s + Number(r.amount || 0), 0)
  const paid = total(rows.filter(r => !isUnpaid(r)))
  const unpaid = total(rows.filter(isUnpaid))
  const overdue = total(rows.filter(isOverdue))

  // Worst first: overdue, then unpaid, then settled — oldest due date leads each
  // group, because that's the order you'd actually work the phone in.
  const rank = (r: Rec) => (isOverdue(r) ? 0 : isUnpaid(r) ? 1 : 2)
  const sorted = [...rows].sort(
    (a, b) => rank(a) - rank(b) || (a.due_date || '').localeCompare(b.due_date || ''),
  )

  return (
    <>
      <h1 className="ph">Invoice 🧾</h1>
      <p className="cap">Who has paid you, and who still owes.</p>

      <div className="grid">
        <Stat label="Paid" value={rm(paid)} />
        <Stat label="Unpaid" value={rm(unpaid)} yes={unpaid > 0} />
        <Stat label="Overdue" value={rm(overdue)} yes={overdue > 0} />
        <Stat label="Total invoiced" value={rm(paid + unpaid)} />
      </div>

      {all.length === 0 ? (
        <Empty />
      ) : rows.length === 0 ? (
        <Empty label="invoices" />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>No.</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Due</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              // An overdue row wears the red "overdue" pill even though its stored
              // status still says waiting/pending — clearer for the human at a glance.
              const shownStatus = isOverdue(r) ? 'overdue' : (r.status || '—')
              return (
                <tr key={r.id}>
                  <td data-label="No.">{invoiceNo(r.title)}</td>
                  <td data-label="Customer">{who(r)}</td>
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
