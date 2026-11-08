import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { validateReservationQr } from '../services/api';

export default function StaffQrScanner() {
  const [scanKey, setScanKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(`staff-qr-reader-${scanKey}`, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    let completed = false;
    scanner.render(async (decodedText) => {
      if (completed) return;
      completed = true;
      setScanning(true);
      setError('');
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

  return (
    <section className="card">
      <h2 className="section-title">Scan Reservation QR</h2>
      <p className="section-subtitle">Allow camera access, then scan a customer’s reservation code.</p>
      <div id={`staff-qr-reader-${scanKey}`} />
      {scanning && <p role="status">Validating QR code…</p>}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {result && <div className="alert alert-success"><strong>Reservation validated</strong><p>ID: {result.reservationId} · Slot: {result.slotId} · Vehicle: {result.vehicleId}</p><p>Window: {new Date(result.startTime).toLocaleString()} – {new Date(result.endTime).toLocaleString()}</p></div>}
      {(result || error) && <button type="button" className="btn btn-primary" onClick={() => { setResult(null); setError(''); setScanKey((key) => key + 1); }}>Scan another QR</button>}
    </section>
  );
}
