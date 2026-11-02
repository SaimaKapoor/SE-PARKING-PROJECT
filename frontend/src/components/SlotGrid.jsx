import { useState, useEffect, useCallback } from 'react';
import { fetchSlots } from '../services/api';

export default function SlotGrid({ user, onSelectSlot, onLoginPrompt }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchSlots({
        floor: floorFilter,
        type: typeFilter,
        status: statusFilter,
      });
      setSlots(response.data?.slots || response.slots || []);
    } catch (err) {
      setError(err.message || 'Failed to load parking slots');
    } finally {
      setLoading(false);
    }
  }, [floorFilter, typeFilter, statusFilter]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Compute summary stats across all loaded slots
  const totalCount = slots.length;
  const availableCount = slots.filter((s) => s.status === 'AVAILABLE').length;
  const reservedCount = slots.filter((s) => s.status === 'RESERVED').length;
  const occupiedCount = slots.filter((s) => s.status === 'OCCUPIED').length;

  const handleSlotClick = (slot) => {
    if (!user) {
      if (onLoginPrompt) onLoginPrompt();
      return;
    }

    if (slot.status === 'AVAILABLE') {
      onSelectSlot(slot);
    }
  };

  return (
    <div className="slot-grid-container">
      <div className="slot-grid-header">
        <div>
          <h2 className="section-title">Live Parking Slot Availability</h2>
          <p className="section-subtitle">
            Real-time occupancy status across all parking levels. Click any available slot to reserve.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadSlots}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Grid'}
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="slot-stats-banner">
        <div className="stat-card">
          <span className="stat-label">Total Slots</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div className="stat-card stat-available">
          <span className="stat-label">Available</span>
          <span className="stat-value">{availableCount}</span>
        </div>
        <div className="stat-card stat-reserved">
          <span className="stat-label">Reserved</span>
          <span className="stat-value">{reservedCount}</span>
        </div>
        <div className="stat-card stat-occupied">
          <span className="stat-label">Occupied</span>
          <span className="stat-value">{occupiedCount}</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="floor-filter" className="filter-label">Floor</label>
          <select
            id="floor-filter"
            className="form-select"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
          >
            <option value="">All Floors</option>
            <option value="1">Floor 1 (Ground)</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter" className="filter-label">Vehicle Type</label>
          <select
            id="type-filter"
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="4-wheeler">4-Wheeler (Car / SUV)</option>
            <option value="2-wheeler">2-Wheeler (Bike / Scooter)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter" className="filter-label">Status</label>
          <select
            id="status-filter"
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="OCCUPIED">Occupied</option>
          </select>
        </div>

        {(floorFilter || typeFilter || statusFilter) && (
          <button
            type="button"
            className="btn btn-text btn-sm"
            onClick={() => {
              setFloorFilter('');
              setTypeFilter('');
              setStatusFilter('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Interactive Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading real-time slot layout...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="empty-state">
          <p>No parking slots match the selected criteria.</p>
        </div>
      ) : (
        <div className="parking-grid">
          {slots.map((slot) => {
            const isAvailable = slot.status === 'AVAILABLE';
            const isReserved = slot.status === 'RESERVED';
            const isOccupied = slot.status === 'OCCUPIED';

            let statusClass = 'slot-card-available';
            if (isReserved) statusClass = 'slot-card-reserved';
            if (isOccupied) statusClass = 'slot-card-occupied';

            return (
              <div
                key={slot._id || slot.slotNumber}
                className={`slot-card ${statusClass} ${isAvailable ? 'clickable' : 'disabled'}`}
                onClick={() => handleSlotClick(slot)}
                onMouseEnter={() => setHoveredSlot(slot)}
                onMouseLeave={() => setHoveredSlot(null)}
                role="button"
                tabIndex={isAvailable ? 0 : -1}
                aria-label={`Slot ${slot.slotNumber}, Floor ${slot.floor}, Status ${slot.status}`}
              >
                <div className="slot-card-top">
                  <span className="slot-floor-tag">F{slot.floor}</span>
                  <span className={`status-pill pill-${slot.status.toLowerCase()}`}>
                    {slot.status}
                  </span>
                </div>

                <div className="slot-number-display">{slot.slotNumber}</div>

                <div className="slot-card-bottom">
                  <span className="slot-type-badge">
                    {slot.type === '2-wheeler' ? '🏍️ 2W' : '🚗 4W'}
                  </span>
                  <span className="slot-rate">₹{slot.hourlyRate}/hr</span>
                </div>

                {isAvailable && (
                  <div className="slot-action-prompt">
                    {user ? 'Click to Reserve' : 'Sign in to Reserve'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hover Detail Card / Tooltip Info */}
      {hoveredSlot && (
        <div className="hover-details-strip">
          <div className="hover-detail-item">
            <strong>Slot:</strong> {hoveredSlot.slotNumber}
          </div>
          <div className="hover-detail-item">
            <strong>Level:</strong> Floor {hoveredSlot.floor}
          </div>
          <div className="hover-detail-item">
            <strong>Type:</strong> {hoveredSlot.type}
          </div>
          <div className="hover-detail-item">
            <strong>Rate:</strong> ₹{hoveredSlot.hourlyRate}/hr
          </div>
          <div className="hover-detail-item">
            <strong>Status:</strong>{' '}
            <span className={`status-inline-${hoveredSlot.status.toLowerCase()}`}>
              {hoveredSlot.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

