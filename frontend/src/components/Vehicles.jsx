import { useState, useEffect } from 'react';
import { fetchVehicles, createVehicle } from '../services/api';

export default function Vehicles({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add vehicle form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: '4-wheeler',
    model: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadVehiclesData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchVehicles();
      setVehicles(response.data?.vehicles || []);
    } catch (err) {
      setError(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      try {
        const response = await fetchVehicles();
        if (!ignore) {
          setVehicles(response.data?.vehicles || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load vehicles');
          setLoading(false);
        }
      }
    }

    startFetching();

    return () => {
      ignore = true;
    };
  }, []);

  const validateForm = () => {
    const errs = {};
    if (!formData.vehicleNumber.trim()) {
      errs.vehicleNumber = 'Vehicle registration number is required';
    } else if (formData.vehicleNumber.trim().length < 2) {
      errs.vehicleNumber = 'Registration number must be at least 2 characters';
    }

    if (!formData.vehicleType) {
      errs.vehicleType = 'Vehicle type is required';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'vehicleNumber' ? value.toUpperCase() : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await createVehicle({
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        vehicleType: formData.vehicleType,
        model: formData.model.trim(),
      });

      setSuccess('Vehicle registered successfully!');
      setFormData({
        vehicleNumber: '',
        vehicleType: '4-wheeler',
        model: '',
      });
      setShowAddForm(false);
      await loadVehiclesData();
    } catch (err) {
      setError(err.message || 'Failed to register vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vehicles-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">My Registered Vehicles</h2>
          <p className="section-subtitle">
            Manage vehicles registered under {user?.name || 'your account'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setError('');
            setSuccess('');
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add New Vehicle'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showAddForm && (
        <div className="card form-card">
          <h3 className="card-title">Register New Vehicle</h3>
          <form onSubmit={handleAddSubmit} className="form" noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicleNumber" className="form-label">
                  Vehicle Registration Number
                </label>
                <input
                  id="vehicleNumber"
                  name="vehicleNumber"
                  type="text"
                  className={`form-input ${formErrors.vehicleNumber ? 'input-error' : ''}`}
                  placeholder="KA01AB1234"
                  value={formData.vehicleNumber}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
                {formErrors.vehicleNumber && (
                  <span className="error-text">{formErrors.vehicleNumber}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="vehicleType" className="form-label">Vehicle Type</label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  className="form-input"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  disabled={submitting}
                >
                  <option value="4-wheeler">4-Wheeler (Car / SUV)</option>
                  <option value="2-wheeler">2-Wheeler (Motorcycle / Scooter)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="model" className="form-label">
                Make & Model (Optional)
              </label>
              <input
                id="model"
                name="model"
                type="text"
                className="form-input"
                placeholder="e.g. Honda City / Royal Enfield Classic"
                value={formData.model}
                onChange={handleInputChange}
                disabled={submitting}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading your vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state card">
          <p className="empty-title">No vehicles registered yet</p>
          <p className="empty-subtitle">
            Add your vehicle to quickly reserve slots and scan in at parking gates.
          </p>
          {!showAddForm && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="vehicles-grid">
          {vehicles.map((v) => (
            <div key={v._id || v.vehicleNumber} className="vehicle-card card">
              <div className="vehicle-card-header">
                <span className="vehicle-number">{v.vehicleNumber}</span>
                <span className={`vehicle-badge ${v.vehicleType}`}>
                  {v.vehicleType}
                </span>
              </div>
              <div className="vehicle-card-body">
                <p className="vehicle-model">{v.model || 'Standard Vehicle'}</p>
                <p className="vehicle-date">
                  Registered:{' '}
                  {v.createdAt
                    ? new Date(v.createdAt).toLocaleDateString()
                    : 'Recently'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
