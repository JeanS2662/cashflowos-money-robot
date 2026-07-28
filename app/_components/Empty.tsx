// Shown when a tab has no records yet (server component — no secrets here).
// Pass a `label` to make the message specific to the tab, or leave it for the
// default "wire your database" nudge.
export default function Empty({ label }: { label?: string }) {
  return (
    <div className="empty">
      {label ? (
        <>Nothing here yet{label ? ` — no ${label} to show.` : '.'}<br /></>
      ) : null}
      No records yet — run the SQL from <code>supabase/schema.sql</code> in your Supabase
      SQL editor (the O step), wire your <code>.env</code> (the E step), then refresh.
    </div>
  )
}
