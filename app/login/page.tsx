'use client'
import { useState } from 'react'

// The lock screen. One passcode field, friendly copy. On success the server sets
// the session cookie and we send you to your HQ. This page is EXCLUDED from the
// passcode gate in proxy.ts (you can't log in through a locked login page).
export default function Login() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok) {
        window.location.href = '/'
        return
      }
      if (body.reason === 'no_passcode_set') {
        setError("No passcode is set yet, so there's nothing to unlock — just open the app.")
      } else {
        setError("That code didn't match. Try again.")
      }
    } catch {
      setError('Something went wrong reaching the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 8 }}>
          <span className="logo" aria-hidden="true">🤖</span> CashFlowOS AI Agents
        </div>
        <h1 className="ph" style={{ fontSize: 18 }}>Enter your passcode</h1>
        <p className="cap" style={{ margin: '4px 0 16px' }}>
          A lock on the door, not bank-grade security — just enough to keep your numbers private.
        </p>
        <input
          className="login-input"
          type="password"
          inputMode="text"
          autoComplete="current-password"
          placeholder="Passcode"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          autoFocus
        />
        {error ? <p className="login-error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy || !passcode} style={{ width: '100%', marginTop: 12 }}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
