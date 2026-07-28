import { Fragment } from 'react'
import type { Funnel } from '@/lib/records'

// The whole-business river on the Dashboard: Views → Leads → Appointments →
// Closed → Nurture, each with its count, and the stage-to-stage conversion %
// shown BETWEEN each pair. Pure presentation — the numbers come from
// getFunnel() (lib/records.ts). Styles: .funnel / .fseg / .fconv in globals.css.
const STAGES = [
  { label: 'Views', cls: 'views' },
  { label: 'Leads', cls: 'leads' },
  { label: 'Appointments', cls: 'appts' },
  { label: 'Closed', cls: 'closed' },
  { label: 'Nurture', cls: 'nurture' },
] as const

export default function FunnelBar({ funnel }: { funnel: Funnel }) {
  const values = [funnel.views, funnel.leads, funnel.appointments, funnel.closed, funnel.nurture]
  return (
    <div className="funnel">
      <h2>The Funnel — your whole business as one river</h2>
      <div className="funnel-bar">
        {STAGES.map((s, i) => (
          <Fragment key={s.cls}>
            <div className={`fseg ${s.cls}`}>
              <div className="fbar" />
              <div className="fnum">{values[i]}</div>
              <div className="flabel">{s.label}</div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="fconv" aria-label={`${funnel.pct[i]}% convert to ${STAGES[i + 1].label}`}>
                <span className="p">{funnel.pct[i]}%</span>
                <span className="arw" aria-hidden="true">▶</span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
