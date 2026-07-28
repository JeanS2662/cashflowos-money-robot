'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 👉 The desktop sidebar tabs, grouped under micro-cap section labels.
//    Adding a tab? Add ONE line to the right group here, add the SAME tab to
//    BottomNav.tsx (bottom bar or the More sheet, so it shows on phones too),
//    and create app/<name>/page.tsx.
//    See docs/add-a-tab-prompt.md for the copy-paste prompt that does all three.
export const NAV_GROUPS: { label: string; tabs: { href: string; label: string }[] }[] = [
  { label: 'Overview', tabs: [
    { href: '/', label: 'Dashboard' },
  ] },
  { label: 'Money', tabs: [
    { href: '/cash-in', label: 'Cash In' },
    { href: '/cash-out', label: 'Cash Out' },
  ] },
  { label: 'Pipeline', tabs: [
    { href: '/leads', label: 'Leads' },
    { href: '/customers', label: 'Customers' },
  ] },
  { label: 'Work', tabs: [
    { href: '/content', label: 'Content' },
    { href: '/tasks', label: 'Tasks' },
  ] },
  { label: 'Robot', tabs: [
    { href: '/approvals', label: 'Approvals' },
    { href: '/employees', label: 'AI Employees' },
    { href: '/vault', label: 'Vault' },
  ] },
]

// Flat list kept for anything that wants every tab in one array.
export const TABS = NAV_GROUPS.flatMap(g => g.tabs)

// `pendingCount` is an optional seam: pass it (from a server component that
// already knows the number) to show the clay 🙋 badge on Approvals. We never
// fetch here — a client nav must stay free of its own server round-trips.
export default function Nav({ pendingCount }: { pendingCount?: number }) {
  const path = usePathname()
  return (
    <nav className="nav">
      {NAV_GROUPS.map(group => (
        <div className="nav-group" key={group.label}>
          <p className="nav-label">{group.label}</p>
          {group.tabs.map(t => (
            <Link key={t.href} href={t.href} className={path === t.href ? 'active' : ''}>
              <span>{t.label}</span>
              {t.href === '/approvals' && pendingCount ? (
                <span className="nav-badge" aria-label={`${pendingCount} pending`}>{pendingCount}</span>
              ) : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
