import { useCallback, useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { fetchActiveSessions, recordStaffEntry, recordStaffExit, validateReservationQr } from '../services/api';

export default function StaffQrScanner() {
  const [scanKey, setScanKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
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
    const scanner = new Html5QrcodeScanner(
      `staff-qr-reader-${scanKey}`,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    let completed = false;

    scanner.render(async (decodedText) => {
      if (completed) return;
      completed = true;
      setScanning(true);
      setError('');
      setActionError('');
      setSuccess('');
      setScanResult(null);

      try {
        if (scanner && typeof scanner.pause === 'function') {
          try {
            await scanner.pause(true);
          } catch {
            // Scanner may not be streaming video (e.g. image drop / file upload)
          }
        }

        const response = await validateReservationQr(decodedText);

        if (response.action === 'exit' || response.data?.session) {
          // Second scan: Vehicle is currently parked, automatically record EXIT
          const exitSession = response.data.session;
          const exitRes = await recordStaffExit(exitSession._id);
          const updatedSession = exitRes.data.session;
          setLastSession(updatedSession);
          setScanResult({
            type: 'EXIT',
            session: updatedSession,
          });
          setSuccess(`Vehicle ${updatedSession.vehicleId} exit recorded automatically. Parking fee: ₹${updatedSession.fee}`);
        } else {
          // First scan: Automatically record ENTRY
          const resData = response.data.reservation;
          const entryRes = await recordStaffEntry(resData.reservationId);
          const activeSession = entryRes.data.session;
          setLastSession(activeSession);
          setScanResult({
            type: 'ENTRY',
            reservation: resData,
            session: activeSession,
          });
          setSuccess(`Vehicle ${activeSession.vehicleId} entry recorded automatically at slot ${activeSession.slotId}.`);
        }
        await loadSessions();
      } catch (err) {
        // Recovery logic if token was previously processed
        if (err.data?.data?.activeSession) {
          try {
            const exitRes = await recordStaffExit(err.data.data.activeSession._id);
            const updatedSession = exitRes.data.session;
            setLastSession(updatedSession);
            setScanResult({
              type: 'EXIT',
              session: updatedSession,
            });
            setSuccess(`Vehicle ${updatedSession.vehicleId} exit recorded automatically. Parking fee: ₹${updatedSession.fee}`);
            await loadSessions();
          } catch (exitErr) {
            setError(exitErr.message || 'Could not record vehicle exit');
            setScanResult(null);
          }
        } else if (err.data?.data?.reservation) {
          try {
            const entryRes = await recordStaffEntry(err.data.data.reservation.reservationId);
            const activeSession = entryRes.data.session;
            setLastSession(activeSession);
            setScanResult({
              type: 'ENTRY',
              reservation: err.data.data.reservation,
              session: activeSession,
            });
            setSuccess(`Vehicle ${activeSession.vehicleId} entry recorded automatically at slot ${activeSession.slotId}.`);
            await loadSessions();
          } catch (entryErr) {
            setError(entryErr.message || 'Could not record vehicle entry');
            setScanResult(null);
          }
        } else {
          setScanResult(null);
          const errMsg = err.data?.message || err.message || (typeof err === 'string' ? err : 'QR validation failed');
          setError(errMsg);
        }
      } finally {
        setScanning(false);
      }
    }, () => {});

    return () => { scanner.clear().catch(() => {}); };
  }, [scanKey, loadSessions]);

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
    setScanResult(null);
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
        <h2 className="section-title">Customer Entry &amp; Exit Scanner</h2>
        <p className="section-subtitle">
          Scan the reservation QR. First scan automatically records entry; second scan automatically records exit.
        </p>

        <div id={`staff-qr-reader-${scanKey}`} />

        {scanning && (
          <div style={{ marginTop: '1rem', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
            Processing QR code and updating vehicle status…
          </div>
        )}

        {error && (
          <div role="alert" className="alert alert-error" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={startAnotherScan}>
                Scan Next QR
              </button>
            </div>
          </div>
        )}

        {scanResult && scanResult.type === 'ENTRY' && (
          <div className="alert alert-success" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '1rem', color: '#166534' }}>
                Vehicle Entry Recorded
              </strong>
              <span className="status-pill pill-confirmed">ACTIVE</span>
            </div>
            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
              <strong>Vehicle:</strong> {scanResult.session.vehicleId} &nbsp;·&nbsp;
              <strong>Slot:</strong> {scanResult.session.slotId} &nbsp;·&nbsp;
              <strong>Reservation:</strong> {scanResult.reservation?.reservationId || scanResult.session.reservationId}
            </p>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#15803d' }}>
              Entry Time: {new Date(scanResult.session.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={startAnotherScan}>
                Scan Next QR
              </button>
            </div>
          </div>
        )}

        {scanResult && scanResult.type === 'EXIT' && (
          <div className="alert alert-success" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '1rem', color: '#166534' }}>
                Vehicle Exit Recorded
              </strong>
              <span className="status-pill pill-awaiting">AWAITING PAYMENT</span>
            </div>
            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
              <strong>Vehicle:</strong> {scanResult.session.vehicleId} &nbsp;·&nbsp;
              <strong>Slot:</strong> {scanResult.session.slotId} &nbsp;·&nbsp;
              <strong>Fee:</strong> ₹{scanResult.session.fee}
            </p>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#15803d' }}>
              Duration: {scanResult.session.durationHours || 1} hr ({scanResult.session.durationMinutes || 0} min) &nbsp;·&nbsp;
              Exit Time: {new Date(scanResult.session.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={startAnotherScan}>
                Scan Next QR
              </button>
            </div>
          </div>
        )}
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
