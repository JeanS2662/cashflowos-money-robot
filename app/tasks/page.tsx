// 👉 This is a normal tab — safe to tweak. It reads the ONE `records` table,
// filters to category==='task', and lists your ops to-dos with overdue ones
// flagged red. Copy this file's shape (see docs/add-a-tab-prompt.md) for new tabs.
import { getRecords, todayISO } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import Stat from '@/app/_components/Stat'

export const dynamic = 'force-dynamic'

// Your ops to-dos. category==='task'. Anything past its due_date and not done is
// flagged as overdue (red). Sorted soonest-due first; undated tasks sink last.
export default async function Tasks() {
  const today = todayISO()
  const all = await getRecords()
  const rows = all
    .filter(r => r.category === 'task')
    .sort((a, b) => ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1))

  const isOverdue = (r: (typeof rows)[number]) =>
    !!r.due_date && r.due_date < today && (r.status || '').toLowerCase() !== 'done'

  const overdue = rows.filter(isOverdue).length
  const open = rows.filter(r => (r.status || '').toLowerCase() !== 'done').length
  const done = rows.filter(r => (r.status || '').toLowerCase() === 'done').length

  return (
    <>
      <h1 className="ph">Tasks ✅</h1>
      <p className="cap">Your ops to-dos, with overdue ones flagged.</p>

      <div className="grid">
        <Stat label="Open" value={open} />
        <Stat label="Overdue" value={overdue} yes={overdue > 0} />
        <Stat label="Done" value={done} />
      </div>

      {rows.length === 0 ? (
        <Empty label="tasks" />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Task</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const od = isOverdue(r)
              const status = (r.status || '').toLowerCase()
              return (
                <tr key={r.id}>
                  <td data-label="Task">{r.title}</td>
                  <td data-label="Due" style={od ? { color: 'var(--rust)' } : undefined}>
                    {r.due_date ?? '—'}
                  </td>
                  <td data-label="Status">
                    <span className={`pill ${od ? 'overdue' : status}`}>
                      {od ? 'overdue' : r.status || '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
