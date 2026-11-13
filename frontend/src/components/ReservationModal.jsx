import { useState, useEffect } from 'react';
import { createReservation, fetchVehicles } from '../services/api';
import ReservationQrCard from './ReservationQrCard';

export default function ReservationModal({ slot, user, onClose, onReservationSuccess }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(user?.vehicleNumber || '');
  const [customVehicle, setCustomVehicle] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [fetchingVehicles, setFetchingVehicles] = useState(false);
  const [error, setError] = useState('');
  const [confirmedReservation, setConfirmedReservation] = useState(null);

  useEffect(() => {
    async function loadUserVehicles() {
      try {
        const response = await fetchVehicles();
        const list = response.data?.vehicles || [];
        setVehicles(list);

        if (list.length > 0) {
          // Preselect user's first matching vehicle type if available
          const matching = list.find((v) => v.vehicleType === slot.type) || list[0];
          setSelectedVehicle((current) => current || matching.vehicleNumber);
        } else if (user?.vehicleNumber) {
          setSelectedVehicle(user.vehicleNumber);
        }
      } catch {
        if (user?.vehicleNumber) {
          setSelectedVehicle(user.vehicleNumber);
        }
      } finally {
        setFetchingVehicles(false);
      }
    }

    loadUserVehicles();
  }, [slot, user]);

  const estimatedFee = (slot.hourlyRate || 30) * durationHours;

  const PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const vehicleNumber = selectedVehicle === '__custom__' ? customVehicle.trim().toUpperCase() : selectedVehicle;

    if (!vehicleNumber) {
      setError('Please select or specify a vehicle registration number');
      return;
    }

    if (selectedVehicle === '__custom__' && !PLATE_REGEX.test(vehicleNumber)) {
      setError('Invalid vehicle registration number. Use Indian plate format, e.g. KA01AB1234');
      return;
    }

    setLoading(true);

    try {
      const response = await createReservation({
        slotId: slot.slotNumber || slot.slotId,
        vehicleNumber,
        durationHours: Number(durationHours),
      });

      const resData = response.data?.reservation || response.reservation;
      setConfirmedReservation(resData);
      if (onReservationSuccess) {
        onReservationSuccess(resData);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete reservation. Slot may have been taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {confirmedReservation ? (
              <>
                <i className="las la-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
                Reservation Confirmed
              </>
            ) : (
              `Reserve Slot ${slot.slotNumber}`
            )}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <i className="las la-times"></i>
          </button>
        </div>

        {confirmedReservation ? (
          <div className="confirmation-content">
            <div className="alert alert-success">
              Your parking slot is securely reserved. Please arrive within the reservation window.
            </div>

            <div className="confirmation-summary-box">
              <div className="confirmation-row">
                <span className="summary-label">Reservation ID:</span>
                <span className="summary-code">{confirmedReservation.reservationId}</span>
              </div>
              <div className="confirmation-row">
                <span className="summary-label">Parking Slot:</span>
                <span className="summary-val font-bold">{slot.slotNumber} (Floor {slot.floor})</span>
              </div>
              <div className="confirmation-row">
                <span className="summary-label">Vehicle:</span>
                <span className="summary-val">{confirmedReservation.vehicleId}</span>
              </div>
              <div className="confirmation-row">
                <span className="summary-label">Valid Until:</span>
                <span className="summary-val">
                  {new Date(confirmedReservation.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <ReservationQrCard reservation={confirmedReservation} autoGenerate />

            <div className="modal-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
                Done & View Grid
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Slot Info Card */}
            <div className="slot-summary-card">
              <div className="summary-item">
                <span className="summary-label">Slot:</span>
                <span className="summary-value highlight">{slot.slotNumber}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Floor:</span>
                <span className="summary-value">Level {slot.floor}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Type:</span>
                <span className="summary-value capitalize">{slot.type}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Hourly Rate:</span>
                <span className="summary-value">₹{slot.hourlyRate}/hr</span>
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="form-group">
              <label htmlFor="res-vehicle" className="form-label">
                Select Vehicle
              </label>
              {fetchingVehicles ? (
                <p className="hint-text">Loading registered vehicles...</p>
              ) : (
                <select
                  id="res-vehicle"
                  className="form-select"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  disabled={loading}
                >
                  {vehicles.map((v) => (
                    <option key={v._id || v.vehicleNumber} value={v.vehicleNumber}>
                      {v.vehicleNumber} ({v.model || v.vehicleType})
                    </option>
                  ))}
                  {user?.vehicleNumber && !vehicles.some((v) => v.vehicleNumber === user.vehicleNumber) && (
                    <option value={user.vehicleNumber}>
                      {user.vehicleNumber} (Primary User Vehicle)
                    </option>
                  )}
                  <option value="__custom__">+ Enter another vehicle registration</option>
                </select>
              )}

              {selectedVehicle === '__custom__' && (
                <input
                  type="text"
                  className="form-input mt-2"
                  placeholder="e.g. KA01AB1234"
                  value={customVehicle}
                  onChange={(e) => setCustomVehicle(e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                />
              )}
            </div>

            {/* Duration Selection */}
            <div className="form-group">
              <label htmlFor="res-duration" className="form-label">
                Duration
              </label>
              <select
                id="res-duration"
                className="form-select"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                disabled={loading}
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours (Standard)</option>
                <option value={4}>4 Hours (Half Day)</option>
                <option value={8}>8 Hours (Full Day)</option>
              </select>
            </div>

            {/* Cost Preview */}
            <div className="estimate-row">
              <span>Amount:</span>
              <span className="estimate-price">₹{estimatedFee}</span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

