'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The slide-up "More" sheet for phones. Holds the tabs that don't fit on the
// bottom bar, so every one of the 10 sections stays reachable on a phone.
// Closes on a backdrop tap, on a link tap, or via the Close button.
export type MoreTab = { href: string; label: string; ico: string }

export default function MoreSheet({
  tabs,
  open,
  onClose,
}: {
  tabs: MoreTab[]
  open: boolean
  onClose: () => void
}) {
  const path = usePathname()
  if (!open) return null
  return (
    <div className="ms-backdrop" onClick={onClose} role="presentation">
      <div
        className="ms-panel"
        role="dialog"
        aria-modal="true"
        aria-label="More sections"
        onClick={e => e.stopPropagation()}
      >
        <div className="ms-handle" aria-hidden="true" />
        <p className="ms-title">All sections</p>
        <div className="ms-grid">
          {tabs.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className={path === t.href ? 'active' : ''}
              onClick={onClose}
            >
              <span className="ms-ico" aria-hidden="true">{t.ico}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
        <button type="button" className="ms-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
