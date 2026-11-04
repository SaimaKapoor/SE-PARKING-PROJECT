import { useState, useEffect } from 'react';
import { fetchReservations, cancelReservation } from '../services/api';

export default function Reservations({ onNavigateToGrid }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchReservations();
      setReservations(response.data?.reservations || response.reservations || []);
    } catch (err) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchReservationData() {
      try {
        const response = await fetchReservations();
        if (!ignore) {
          setReservations(response.data?.reservations || response.reservations || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load reservations');
          setLoading(false);
        }
      }
    }

    fetchReservationData();

    return () => {
      ignore = true;
    };
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The slot will be released.')) {
      return;
    }

    setCancellingId(id);
    setError('');
    setSuccess('');

    try {
      await cancelReservation(id);
      setSuccess('Reservation cancelled successfully. Parking slot released.');
      await loadReservations();
    } catch (err) {
      setError(err.message || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="reservations-container">
      <div className="reservations-header">
        <div>
          <h2 className="section-title">My Slot Reservations</h2>
          <p className="section-subtitle">
            Manage your booked parking slots and view entry credentials.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNavigateToGrid}
        >
          + Book Another Slot
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🅿️</div>
          <h3>No Reservations Found</h3>
          <p>You haven't reserved any parking slots yet.</p>
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={onNavigateToGrid}
          >
            Browse Available Slots
          </button>
        </div>
      ) : (
        <div className="reservations-list">
          {reservations.map((res) => {
            const isConfirmed = res.status === 'CONFIRMED';
            return (
              <div key={res._id || res.reservationId} className="card reservation-card">
                <div className="res-card-header">
                  <div className="res-id-badge">
                    <span className="res-label">ID:</span>
                    <span className="res-code">{res.reservationId}</span>
                  </div>
                  <span className={`status-pill pill-${res.status.toLowerCase()}`}>
                    {res.status}
                  </span>
                </div>

                <div className="res-details-grid">
                  <div className="res-detail-item">
                    <span className="detail-label">Slot:</span>
                    <span className="detail-value font-bold">{res.slotId}</span>
                  </div>
                  <div className="res-detail-item">
                    <span className="detail-label">Vehicle:</span>
                    <span className="detail-value">{res.vehicleId}</span>
                  </div>
                  <div className="res-detail-item">
                    <span className="detail-label">Booked On:</span>
                    <span className="detail-value">
                      {new Date(res.startTime || res.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="res-detail-item">
                    <span className="detail-label">Valid Until:</span>
                    <span className="detail-value">
                      {new Date(res.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {isConfirmed && (
                  <div className="res-card-footer">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(res._id || res.reservationId)}
                      disabled={cancellingId === (res._id || res.reservationId)}
                    >
                      {cancellingId === (res._id || res.reservationId)
                        ? 'Cancelling...'
                        : 'Cancel Reservation'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

