import { useCallback, useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { fetchActiveSessions, recordStaffEntry, recordStaffExit, validateReservationQr } from '../services/api';

export default function StaffQrScanner() {
  const [scanKey, setScanKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [lastSession, setLastSession] = useState(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchActiveSessions();
      setSessions(response.data?.sessions || []);
    } catch (err) {
      setError(err.message || 'Could not load active parking sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(loadSessions); }, [loadSessions]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(`staff-qr-reader-${scanKey}`, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    let completed = false;
    scanner.render(async (decodedText) => {
      if (completed) return;
      completed = true;
      setScanning(true);
      setError('');
      setActionError('');
      setSuccess('');
      try {
        const response = await validateReservationQr(decodedText);
        setResult(response.data.reservation);
        await scanner.pause(true);
      } catch (err) {
        setResult(null);
        setError(err.message || 'QR validation failed');
        try { await scanner.pause(true); } catch { /* scanner may already be stopped */ }
      } finally {
        setScanning(false);
      }
    }, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [scanKey]);

  const handleEntry = async () => {
    if (!result) return;
    setActionLoading('entry');
    setActionError('');
    setSuccess('');
    try {
      const response = await recordStaffEntry(result.reservationId);
      setLastSession(response.data.session);
      setSuccess(response.message || 'Vehicle entry recorded successfully');
      setResult(null);
      await loadSessions();
    } catch (err) {
      setActionError(err.message || 'Could not record vehicle entry');
    } finally {
      setActionLoading('');
    }
  };

  const handleExit = async (session) => {
    setActionLoading(session._id);
    setActionError('');
    setSuccess('');
    try {
      const response = await recordStaffExit(session._id);
      setLastSession(response.data.session);
      setSuccess(response.message || 'Vehicle exit recorded; payment is pending');
      await loadSessions();
    } catch (err) {
      setActionError(err.message || 'Could not record vehicle exit');
    } finally {
      setActionLoading('');
    }
  };

  const startAnotherScan = () => {
    setResult(null);
    setError('');
    setActionError('');
    setSuccess('');
    setScanKey((key) => key + 1);
  };

  return (
    <div className="admin-dashboard">
      <div className="reservations-header">
        <div>
          <h1 className="section-title">Staff Entry &amp; Exit</h1>
          <p className="section-subtitle">Validate customer reservations, record arrivals and departures, and review active sessions.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadSessions} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh Sessions'}
        </button>
      </div>

      {success && <div className="alert alert-success" role="status">{success}</div>}
      {actionError && <div className="alert alert-error" role="alert">{actionError}</div>}
      {lastSession && <section className="card session-feedback">
        <h2>Latest session: {lastSession.status}</h2>
        <p>Vehicle {lastSession.vehicleId} · Slot {lastSession.slotId} · Session {lastSession._id}</p>
        {lastSession.exitTime && <p>Exit {new Date(lastSession.exitTime).toLocaleString()} · Fee ₹{lastSession.fee}</p>}
      </section>}

      <section className="card">
        <h2 className="section-title">Customer Entry</h2>
        <p className="section-subtitle">Scan the reservation QR, then record the vehicle entry.</p>
        <div id={`staff-qr-reader-${scanKey}`} />
        {scanning && <p role="status">Validating QR code…</p>}
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        {result && <div className="alert alert-success">
          <strong>Reservation validated</strong>
          <p>ID: {result.reservationId} · Slot: {result.slotId} · Vehicle: {result.vehicleId}</p>
          <p>Window: {new Date(result.startTime).toLocaleString()} – {new Date(result.endTime).toLocaleString()}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleEntry} disabled={Boolean(actionLoading)}>
            {actionLoading === 'entry' ? 'Recording Entry…' : 'Record Vehicle Entry'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={startAnotherScan} disabled={Boolean(actionLoading)}>Scan another QR</button>
        </div>}
        {error && <button type="button" className="btn btn-primary btn-sm" onClick={startAnotherScan}>Scan another QR</button>}
      </section>

      <section className="card">
        <div className="reservations-header">
          <div>
            <h2 className="section-title">Active Parking Sessions</h2>
            <p className="section-subtitle">{sessions.length} vehicle{sessions.length === 1 ? '' : 's'} currently parked.</p>
          </div>
        </div>
        {error && !sessions.length && <div role="alert" className="alert alert-error">{error}</div>}
        {loading ? <p role="status">Loading active sessions…</p> : sessions.length === 0 ? (
          <div className="empty-state"><h3>No active parking sessions</h3><p>Validated vehicle entries will appear here.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead><tr><th>Vehicle</th><th>Slot</th><th>Customer</th><th>Entry time</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{sessions.map((session) => <tr key={session._id}>
                <td>{session.vehicleId}</td>
                <td>{session.slotId}</td>
                <td>{session.customerId?.name || session.customerId?.email || 'Customer'}</td>
                <td>{new Date(session.entryTime).toLocaleString()}</td>
                <td><span className="status-pill pill-confirmed">{session.status}</span></td>
                <td><button type="button" className="btn btn-primary btn-sm" onClick={() => handleExit(session)} disabled={Boolean(actionLoading)}>
                  {actionLoading === session._id ? 'Recording Exit…' : 'Record Exit'}
                </button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
