'use client'

// The tiny interactive leaf on the Approvals tab. It CANNOT import lib/actions.ts
// (that's server-only) — it calls the 'use server' wrapper in app/approvals/actions.ts
// instead. One claim implementation, two front doors (here + Telegram).
import { useState, useTransition } from 'react'
import { approveAction, rejectAction } from '@/app/approvals/actions'

export default function ApproveButtons({ id }: { id: number }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)

  // Once decided, replace the buttons with the result line (no re-tapping).
  if (done) return <p className="decided">{done}</p>

  const decide = (fn: (id: number) => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      try {
        const r = await fn(id)
        setDone(r.message)
      } catch {
        setDone('Something went wrong — refresh and try again.')
      }
    })

  return (
    <div className="btnrow">
      <button className="btn" disabled={pending} onClick={() => decide(approveAction)}>
        {pending ? '…' : '✅ Approve'}
      </button>
      <button className="btn ghost" disabled={pending} onClick={() => decide(rejectAction)}>
        ❌ Reject
      </button>
    </div>
  )
}
