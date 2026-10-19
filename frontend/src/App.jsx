import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('parkingToken') || '')
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('parkingUser') || 'null') } catch { return null }
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slotId, setSlotId] = useState('')
  const [history, setHistory] = useState({ sessions: [], payments: [] })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`)
    return payload
  }, [token])

  const refreshHistory = useCallback(async () => {
    if (!token) return
    try {
      const result = await api('/api/history')
      setHistory(result.data || { sessions: [], payments: [] })
    } catch (err) {
      setError(err.message)
    }
  }, [api, token])

  useEffect(() => { refreshHistory() }, [refreshHistory])

  const run = async (action) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const message = await action()
      if (message) setNotice(message)
      await refreshHistory()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const login = (event) => {
    event.preventDefault()
    run(async () => {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('parkingToken', result.data.token)
      localStorage.setItem('parkingUser', JSON.stringify(result.data.user))
      setToken(result.data.token)
      setUser(result.data.user)
      setPassword('')
      return `Welcome back, ${result.data.user.name}.`
    })
  }

  const logout = () => {
    localStorage.removeItem('parkingToken')
    localStorage.removeItem('parkingUser')
    setToken('')
    setUser(null)
    setHistory({ sessions: [], payments: [] })
    setNotice('You have been logged out.')
    setError('')
  }

  const recordEntry = () => run(async () => {
    const result = await api('/api/sessions/entry', {
      method: 'POST',
      body: JSON.stringify({ slotId }),
    })
    setSlotId('')
    return `Entry recorded for slot ${result.data.session.slotId}.`
  })

  const recordExit = (sessionId) => run(async () => {
    const result = await api('/api/sessions/exit', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
    return `Exit recorded. Fee due: ₹${result.data.session.fee}.`
  })

  const pay = (sessionId, outcome = 'success') => run(async () => {
    const result = await api('/api/payments', {
      method: 'POST',
      body: JSON.stringify({ sessionId, outcome }),
    })
    if (!result.success) throw new Error(result.message || 'Payment failed')
    await api(`/api/sessions/${sessionId}/complete`, { method: 'POST', body: JSON.stringify({}) })
    return `Payment successful — ₹${result.data.payment.amount}. Receipt: ${result.data.payment.transactionReference}`
  })

  const activeSessions = history.sessions.filter((s) => s.status === 'ACTIVE')
  const unpaidSessions = history.sessions.filter((s) => s.status === 'AWAITING_PAYMENT' && s.paymentStatus !== 'PAID')

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Parkwise home"><span className="brand-mark">P</span><span>Parkwise</span></a>
        {token && <div className="account"><span>{user?.name || 'Customer'}</span><button className="button button-quiet" onClick={logout}>Log out</button></div>}
      </header>

      <section className="hero">
        <div className="eyebrow">QR-BASED VEHICLE PARKING</div>
        <h1>Parking, without<br /><span>the circling around.</span></h1>
        <p>Track your parking session, settle your fee, and keep every visit in one place.</p>
      </section>

      {notice && <div className="notice success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
      {error && <div className="notice failure" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

      {!token ? (
        <section className="auth-card">
          <div className="section-kicker">CUSTOMER PORTAL</div>
          <h2>Welcome back</h2>
          <p className="muted">Log in with the account you registered for the parking system.</p>
          <form onSubmit={login} className="form-stack">
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" /></label>
            <button className="button button-primary full" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
          </form>
          <p className="helper">New account? Register through the project's existing registration flow, then log in here.</p>
        </section>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card"><span className="summary-icon">↗</span><span className="summary-label">Active sessions</span><strong>{activeSessions.length}</strong><small>Currently parked</small></article>
            <article className="summary-card"><span className="summary-icon">₹</span><span className="summary-label">Awaiting payment</span><strong>{unpaidSessions.length}</strong><small>Ready to settle</small></article>
            <article className="summary-card"><span className="summary-icon">✓</span><span className="summary-label">Total visits</span><strong>{history.sessions.length}</strong><small>Your parking history</small></article>
          </section>

          <section className="panel entry-panel">
            <div><div className="section-kicker">NEW PARKING SESSION</div><h2>Record vehicle entry</h2><p className="muted">Enter the slot code shown in the QR code. Example: A-01.</p></div>
            <form className="entry-form" onSubmit={(e) => { e.preventDefault(); recordEntry() }}>
              <label className="sr-only" htmlFor="slot">Parking slot QR code</label>
              <input id="slot" value={slotId} onChange={(e) => setSlotId(e.target.value)} required placeholder="Scan / enter slot code" />
              <button className="button button-primary" disabled={busy}>{busy ? 'Working…' : 'Record entry'}</button>
            </form>
          </section>

          <section className="content-section">
            <div className="section-heading"><div><div className="section-kicker">IN PROGRESS</div><h2>Your current sessions</h2></div><button className="button button-quiet" onClick={() => run(async () => { await refreshHistory(); return 'History refreshed.' })}>Refresh</button></div>
            {history.sessions.filter((s) => s.status !== 'COMPLETED').length === 0 ? (
              <div className="empty-state"><span>⌁</span><h3>No open sessions</h3><p>Your active and unpaid parking sessions will appear here.</p></div>
            ) : (
              <div className="session-list">
                {history.sessions.filter((s) => s.status !== 'COMPLETED').map((s) => (
                  <article className="session-card" key={s._id}>
                    <div className="session-top"><div><span className="slot-pill">{s.slotId}</span><span className={`status-pill ${s.status.toLowerCase()}`}>{s.status.replace('_', ' ')}</span></div><strong>{s.fee == null ? 'Fee pending' : `₹${s.fee}`}</strong></div>
                    <div className="session-meta"><span>Vehicle <b>{s.vehicleId}</b></span><span>Entry <b>{new Date(s.entryTime).toLocaleString()}</b></span>{s.exitTime && <span>Exit <b>{new Date(s.exitTime).toLocaleString()}</b></span>}</div>
                    <div className="session-actions">
                      {s.status === 'ACTIVE' && <button className="button button-primary" disabled={busy} onClick={() => recordExit(s._id)}>Record exit & calculate fee</button>}
                      {s.status === 'AWAITING_PAYMENT' && s.paymentStatus !== 'PAID' && <button className="button button-primary" disabled={busy} onClick={() => pay(s._id)}>Pay ₹{s.fee}</button>}
                      {s.status === 'AWAITING_PAYMENT' && <button className="button button-secondary" disabled={busy} onClick={() => pay(s._id, 'failure')}>Test failed payment</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="content-section">
            <div className="section-heading"><div><div className="section-kicker">YOUR RECORDS</div><h2>Parking history & receipts</h2></div><span className="count-label">{history.sessions.length} visits</span></div>
            {history.sessions.length === 0 ? <div className="empty-state compact"><p>Your completed visits and payments will show up here.</p></div> : (
              <div className="table-wrap"><table><thead><tr><th>Slot / Vehicle</th><th>Entry</th><th>Exit</th><th>Duration</th><th>Fee</th><th>Payment</th></tr></thead><tbody>
                {history.sessions.map((s) => <tr key={s._id}><td><b>{s.slotId}</b><small>{s.vehicleId}</small></td><td>{new Date(s.entryTime).toLocaleString()}</td><td>{s.exitTime ? new Date(s.exitTime).toLocaleString() : '—'}</td><td>{s.durationHours == null ? '—' : `${s.durationHours} hr`}</td><td>{s.fee == null ? '—' : `₹${s.fee}`}</td><td><span className={`status-pill ${s.paymentStatus.toLowerCase()}`}>{s.paymentStatus}</span></td></tr>)}
              </tbody></table></div>
            )}
            {history.payments.length > 0 && <div className="receipt-list"><h3>Payment receipts</h3>{history.payments.map((p) => <div className="receipt-row" key={p._id}><div><b>{p.transactionReference}</b><small>{new Date(p.createdAt).toLocaleString()}</small></div><strong>₹{p.amount}</strong><span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span></div>)}</div>}
          </section>
        </>
      )}
      <footer><span className="brand-mark small">P</span><span>Parkwise · QR Parking System</span><span className="footer-right">Secure account · Mock payments only</span></footer>
    </main>
  )
}

export default App
