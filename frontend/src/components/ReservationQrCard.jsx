import { useEffect, useState } from 'react';
import { generateReservationQr } from '../services/api';

export default function ReservationQrCard({ reservation, autoGenerate = false }) {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(autoGenerate);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await generateReservationQr(reservation._id || reservation.reservationId);
      setQr(response.data);
    } catch (err) {
      setError(err.message || 'Could not generate the QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoGenerate) Promise.resolve().then(generate);
  // Generation happens once for the reservation shown in this card.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, reservation._id, reservation.reservationId]);

  return (
    <div className="qr-badge-container">
      <h3>Reservation QR</h3>
      {loading && <p role="status">Generating your QR code…</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {qr?.qrCode && (
        <>
          <img className="reservation-qr-image" src={qr.qrCode} alt={`QR code for reservation ${reservation.reservationId}`} />
          <p className="qr-caption">Show this code to staff. Valid until {new Date(qr.expiresAt).toLocaleString()}.</p>
          <a className="btn btn-secondary btn-sm" href={qr.qrCode} download={`${qr.reservation.reservationId}-qr.png`}>Download QR</a>
        </>
      )}
      {!qr && !loading && (
        <button type="button" className="btn btn-primary btn-sm" onClick={generate}>Generate / refresh QR</button>
      )}
    </div>
  );
}
