import { useEffect, useState } from 'react';
import {
  createAdminSlot,
  deleteAdminSlot,
  fetchAdminSlots,
  updateAdminSlot,
  updateAdminSlotRate,
} from '../services/api';

const emptySlotForm = { slotNumber: '', floor: '1', type: '4-wheeler', hourlyRate: '30' };

export default function AdminSlotManagement({ onBackToDashboard }) {
  const [slots, setSlots] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [rateSlot, setRateSlot] = useState(null);
  const [rateValue, setRateValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSlots() {
      setLoading(true);
      setError('');
      try {
        const response = await fetchAdminSlots({ status: statusFilter });
        if (!ignore) setSlots(response.data?.slots || response.slots || []);
      } catch (loadError) {
        if (!ignore) setError(loadError.message || 'Could not load parking slots');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      ignore = true;
    };
  }, [statusFilter, reloadKey]);

  const closeSlotForm = () => {
    setShowSlotForm(false);
    setEditingSlotId(null);
    setSlotForm(emptySlotForm);
  };

  const openCreateForm = () => {
    setError('');
    setSuccess('');
    setRateSlot(null);
    setSlotForm(emptySlotForm);
    setEditingSlotId(null);
    setShowSlotForm(true);
  };

  const openEditForm = (slot) => {
    setError('');
    setSuccess('');
    setRateSlot(null);
    setSlotForm({
      slotNumber: slot.slotNumber || slot.slotId || '',
      floor: String(slot.floor ?? 1),
      type: slot.type || '4-wheeler',
      hourlyRate: String(slot.hourlyRate ?? 30),
    });
    setEditingSlotId(slot._id || slot.slotNumber);
    setShowSlotForm(true);
  };

  const handleSlotSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (editingSlotId) {
        await updateAdminSlot(editingSlotId, {
          slotNumber: slotForm.slotNumber.trim().toUpperCase(),
          floor: Number(slotForm.floor),
          type: slotForm.type,
        });
        setSuccess('Parking slot updated.');
      } else {
        await createAdminSlot({
          slotNumber: slotForm.slotNumber.trim().toUpperCase(),
          floor: Number(slotForm.floor),
          type: slotForm.type,
          hourlyRate: Number(slotForm.hourlyRate),
        });
        setSuccess('Parking slot added.');
      }
      closeSlotForm();
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      setError(saveError.message || 'Could not save parking slot');
    } finally {
      setSaving(false);
    }
  };

  const openRateForm = (slot) => {
    setError('');
    setSuccess('');
    setShowSlotForm(false);
    setRateSlot(slot);
    setRateValue(String(slot.hourlyRate ?? 0));
  };

  const handleRateSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateAdminSlotRate(rateSlot._id || rateSlot.slotNumber, Number(rateValue));
      setSuccess(`Hourly rate updated for ${rateSlot.slotNumber || rateSlot.slotId}.`);
      setRateSlot(null);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      setError(saveError.message || 'Could not update hourly rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Delete parking slot ${slot.slotNumber || slot.slotId}?`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteAdminSlot(slot._id || slot.slotNumber);
      setSuccess(`Parking slot ${slot.slotNumber || slot.slotId} deleted.`);
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete parking slot');
    }
  };

  return (
    <section className="admin-dashboard" aria-labelledby="admin-slots-title">
      <div className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">Parking configuration</p>
          <h1 id="admin-slots-title" className="section-title">Slot Management</h1>
          <p className="section-subtitle">Add parking spaces, update details, and configure hourly rates.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToDashboard}>
          Back to dashboard
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      <section className="admin-transactions-section" aria-labelledby="managed-slots-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="managed-slots-title">Parking slots</h2>
            <p>{slots.length} {slots.length === 1 ? 'slot' : 'slots'} shown</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateForm}>
            Add slot
          </button>
        </div>

        <div className="admin-filter-bar">
          <div className="admin-filter-control">
            <label htmlFor="admin-slot-status-filter">Slot status</label>
            <select
              id="admin-slot-status-filter"
              className="form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="OCCUPIED">Occupied</option>
            </select>
          </div>
        </div>

        {showSlotForm && (
          <form className="card admin-slot-form" onSubmit={handleSlotSubmit}>
            <div className="admin-section-heading">
              <div>
                <h2>{editingSlotId ? 'Edit slot' : 'Add parking slot'}</h2>
                <p>{editingSlotId ? 'Update the slot details.' : 'New slots start as available.'}</p>
              </div>
            </div>
            <div className="admin-slot-form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="admin-slot-number">Slot number</label>
                <input
                  id="admin-slot-number"
                  className="form-input"
                  value={slotForm.slotNumber}
                  onChange={(event) => setSlotForm((current) => ({ ...current, slotNumber: event.target.value }))}
                  required
                  maxLength={40}
                  placeholder="e.g. A-12"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-slot-floor">Floor</label>
                <input
                  id="admin-slot-floor"
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  value={slotForm.floor}
                  onChange={(event) => setSlotForm((current) => ({ ...current, floor: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-slot-type">Vehicle type</label>
                <select
                  id="admin-slot-type"
                  className="form-select"
                  value={slotForm.type}
                  onChange={(event) => setSlotForm((current) => ({ ...current, type: event.target.value }))}
                >
                  <option value="4-wheeler">4-wheeler</option>
                  <option value="2-wheeler">2-wheeler</option>
                </select>
              </div>
              {!editingSlotId && (
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-slot-rate">Hourly rate (₹)</label>
                  <input
                    id="admin-slot-rate"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={slotForm.hourlyRate}
                    onChange={(event) => setSlotForm((current) => ({ ...current, hourlyRate: event.target.value }))}
                    required
                  />
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeSlotForm} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingSlotId ? 'Save changes' : 'Create slot'}
              </button>
            </div>
          </form>
        )}

        {rateSlot && (
          <form className="card admin-slot-form admin-rate-form" onSubmit={handleRateSubmit}>
            <div className="admin-section-heading">
              <div>
                <h2>Configure hourly rate</h2>
                <p>{rateSlot.slotNumber || rateSlot.slotId}</p>
              </div>
            </div>
            <div className="form-group admin-rate-input">
              <label className="form-label" htmlFor="admin-rate-value">Hourly rate (₹)</label>
              <input
                id="admin-rate-value"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={rateValue}
                onChange={(event) => setRateValue(event.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRateSlot(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save rate'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="loading-state" aria-live="polite">Loading parking slots…</div>
        ) : slots.length === 0 ? (
          <div className="admin-empty-state" role="status">
            <strong>No parking slots found</strong>
            <span>Add a slot or choose a different status filter.</span>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-transactions-table admin-slots-table">
              <thead>
                <tr>
                  <th scope="col">Slot</th>
                  <th scope="col">Floor</th>
                  <th scope="col">Vehicle type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Hourly rate</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id || slot.slotNumber}>
                    <td className="admin-cell-primary">{slot.slotNumber || slot.slotId}</td>
                    <td>{slot.floor ?? '—'}</td>
                    <td>{slot.type || '—'}</td>
                    <td><span className={`admin-slot-status admin-slot-${String(slot.status || '').toLowerCase()}`}>{slot.status || 'Unknown'}</span></td>
                    <td className="admin-amount">₹{Number(slot.hourlyRate || 0).toLocaleString('en-IN')}/hr</td>
                    <td>
                      <div className="admin-slot-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditForm(slot)}>Edit</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openRateForm(slot)}>Rate</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(slot)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
