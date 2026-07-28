// 👉 This is a normal tab — safe to tweak. It reads the ONE `records` table,
// filters to category==='content', and shows your marketing calendar. Copy this
// file's shape (see docs/add-a-tab-prompt.md) when you add your own tab.
import { getRecords, m } from '@/lib/records'
import Empty from '@/app/_components/Empty'
import Stat from '@/app/_components/Stat'

export const dynamic = 'force-dynamic'

// The marketing calendar. category==='content'. Posts, reels, carousels AND ads
// all live here — the kind is in `meta.format`, the channel in `meta.platform`.
// A content item moves draft → scheduled → posted (its `status`).
export default async function Content() {
  const all = await getRecords()
  const rows = all
    .filter(r => r.category === 'content')
    // Soonest date first; undated rows sink to the bottom.
    .sort((a, b) => ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1))

  const count = (s: string) => rows.filter(r => (r.status || '').toLowerCase() === s).length

  return (
    <>
      <h1 className="ph">Content 📣</h1>
      <p className="cap">Your marketing calendar — posts, reels, carousels & ads.</p>

      <div className="grid">
        <Stat label="Drafts" value={count('draft')} />
        <Stat label="Scheduled" value={count('scheduled')} />
        <Stat label="Posted" value={count('posted')} />
      </div>

      {rows.length === 0 ? (
        <Empty label="content" />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Title</th>
              <th>Format</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Date</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const status = (r.status || '').toLowerCase()
              return (
                <tr key={r.id}>
                  <td data-label="Title">{r.title}</td>
                  <td data-label="Format">{m(r, 'format')}</td>
                  <td data-label="Platform">{m(r, 'platform')}</td>
                  <td data-label="Status">
                    <span className={`pill ${status}`}>{r.status || '—'}</span>
                  </td>
                  <td data-label="Date">{r.due_date ?? '—'}</td>
                  <td data-label="Views">
                    {r.meta?.views != null ? Number(r.meta.views).toLocaleString('en-MY') : '—'}
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
