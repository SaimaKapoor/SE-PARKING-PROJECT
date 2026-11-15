import { useState, useEffect } from 'react';
import { createReservation, fetchVehicles, mockCheckoutSession, processPayment } from '../services/api';
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
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false); // show mock UPI
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

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

      // Attempt mock checkout session to get UPI payment QR
      try {
        const checkoutRes = await mockCheckoutSession(resData.reservationId);
        setPaymentSession(checkoutRes.data || null);
        setPaymentStep(true);
      } catch (checkoutErr) {
        console.error('Checkout error:', checkoutErr);
        // Fallback: if session checkout fails, proceed straight to confirmed
        setPaymentDone(true);
        if (onReservationSuccess) onReservationSuccess(resData);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete reservation. Slot may have been taken.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentSession?.session?._id) {
      setPaymentDone(true);
      setPaymentStep(false);
      if (onReservationSuccess) onReservationSuccess(confirmedReservation);
      return;
    }

    setPaymentLoading(true);
    setError('');
    try {
      await processPayment(paymentSession.session._id, 'success');
      setPaymentDone(true);
      setPaymentStep(false);
      if (onReservationSuccess) {
        onReservationSuccess(confirmedReservation);
      }
    } catch (payErr) {
      setError(payErr.message || 'Payment simulation failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {confirmedReservation && paymentDone ? (
              <>
                <i className="las la-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
                Reservation Confirmed
              </>
            ) : confirmedReservation && paymentStep ? (
              <>
                <i className="las la-wallet" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                Complete UPI Payment
              </>
            ) : (
              `Reserve Slot ${slot.slotNumber}`
            )}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <i className="las la-times"></i>
          </button>
        </div>

        {confirmedReservation && paymentDone ? (
          <div className="confirmation-content">
            <div className="alert alert-success">
              Payment confirmed! Your parking slot is securely reserved. Please arrive within the reservation window.
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
        ) : confirmedReservation && paymentStep ? (
          <div className="confirmation-content">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="payment-modal-card">
              <div className="payment-amount-box">
                <span className="payment-amount-label">Amount Payable:</span>
                <span className="payment-amount-val">₹{paymentSession?.fee || estimatedFee}</span>
              </div>

              <div className="payment-qr-container">
                {paymentSession?.upiQrCode ? (
                  <img
                    src={paymentSession.upiQrCode}
                    alt="UPI Payment QR Code"
                    className="payment-qr-image"
                  />
                ) : (
                  <div className="payment-qr-placeholder">
                    <i className="las la-qrcode" style={{ fontSize: '5rem', color: '#64748b' }}></i>
                  </div>
                )}
                <div className="payment-upi-details">
                  <p className="payment-upi-id">
                    <i className="las la-university" style={{ marginRight: '4px' }}></i>
                    UPI ID: <strong>smartparking@okaxis</strong>
                  </p>
                  <p className="payment-upi-instructions">
                    Scan this QR with any UPI app (GPay / PhonePe / Paytm / BHIM) and click Confirm Payment.
                  </p>
                </div>
              </div>

              <div className="modal-actions mt-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmPayment}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <i className="las la-spinner la-spin" style={{ marginRight: '6px' }}></i>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <i className="las la-check" style={{ marginRight: '6px' }}></i>
                      Confirm Payment (₹{paymentSession?.fee || estimatedFee})
                    </>
                  )}
                </button>
              </div>
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

