import { useEffect, useState } from 'react';
import { fetchAdminTransactions, fetchSlots, fetchAdminReservations, fetchAdminVehicles } from '../services/api';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
}

export default function AdminDashboard({ onManageSlots }) {
  const [activeSection, setActiveSection] = useState('transactions');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allReservations, setAllReservations] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [vehLoading, setVehLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      const filters = { page, limit: PAGE_SIZE, status };
      if (from) filters.from = new Date(`${from}T00:00:00`).toISOString();
      if (to) filters.to = new Date(`${to}T23:59:59.999`).toISOString();

      try {
        const [transactionResponse, slotResponse] = await Promise.all([
          fetchAdminTransactions(filters),
          fetchSlots(),
        ]);
        if (ignore) return;

        const data = transactionResponse.data || {};
        setTransactions(data.transactions || []);
        setSessions(data.sessions || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
        setSlots(slotResponse.data?.slots || slotResponse.slots || []);
      } catch (loadError) {
        if (!ignore) setError(loadError.message || 'Could not load admin dashboard data');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();
    return () => { ignore = true; };
  }, [page, status, from, to]);

  useEffect(() => {
    if (activeSection === 'reservations' && allReservations.length === 0) {
      setResLoading(true);
      fetchAdminReservations()
        .then((r) => setAllReservations(r.data?.reservations || []))
        .catch(() => {})
        .finally(() => setResLoading(false));
    }
    if (activeSection === 'vehicles' && allVehicles.length === 0) {
      setVehLoading(true);
      fetchAdminVehicles()
        .then((r) => setAllVehicles(r.data?.vehicles || []))
        .catch(() => {})
        .finally(() => setVehLoading(false));
    }
  }, [activeSection, allReservations.length, allVehicles.length]);

  const slotCount = (slotStatus) => slots.filter((slot) => slot.status === slotStatus).length;
  const activeSessions = sessions.filter((session) => session.status === 'ACTIVE').length;
  const totalPages = Math.max(1, pagination.totalPages || 0);

  const resetFilters = () => {
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
      <div className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">Operations overview</p>
          <h1 id="admin-dashboard-title" className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">Parking activity, slot usage, and transaction records.</p>
        </div>
        <div className="admin-dashboard-actions">
          <span className="admin-access-badge">Administrator access</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onManageSlots}>
            Manage slots
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="admin-stats-grid" aria-label="Parking statistics">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total slots</span>
          <strong className="admin-stat-value">{loading && slots.length === 0 ? '—' : slots.length}</strong>
        </article>
        <article className="admin-stat-card admin-stat-available">
          <span className="admin-stat-label">Available</span>
          <strong className="admin-stat-value">{loading && slots.length === 0 ? '—' : slotCount('AVAILABLE')}</strong>
        </article>
        <article className="admin-stat-card admin-stat-reserved">
          <span className="admin-stat-label">Reserved</span>
          <strong className="admin-stat-value">{loading && slots.length === 0 ? '—' : slotCount('RESERVED')}</strong>
        </article>
        <article className="admin-stat-card admin-stat-occupied">
          <span className="admin-stat-label">Occupied</span>
          <strong className="admin-stat-value">{loading && slots.length === 0 ? '—' : slotCount('OCCUPIED')}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Active sessions</span>
          <strong className="admin-stat-value">{loading && sessions.length === 0 ? '—' : activeSessions}</strong>
        </article>
      </div>

      {/* Section tabs */}
      <div className="admin-section-tabs">
        {['transactions', 'reservations', 'vehicles'].map((s) => (
          <button
            key={s}
            type="button"
            className={`admin-tab-btn ${activeSection === s ? 'active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            {s === 'transactions' && <i className="las la-receipt" style={{ marginRight: '6px' }}></i>}
            {s === 'reservations' && <i className="las la-calendar-check" style={{ marginRight: '6px' }}></i>}
            {s === 'vehicles' && <i className="las la-car" style={{ marginRight: '6px' }}></i>}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions section */}
      {activeSection === 'transactions' && (
        <section className="admin-transactions-section" aria-labelledby="transaction-records-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="transaction-records-title">Transaction records</h2>
              <p>Payments across all customers, with linked parking sessions.</p>
            </div>
            <span className="admin-record-count">{pagination.total || 0} records</span>
          </div>

          <div className="admin-filter-bar">
            <div className="admin-filter-control">
              <label htmlFor="transaction-status-filter">Payment status</label>
              <select
                id="transaction-status-filter"
                className="form-select"
                value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                <option value="SUCCESS">Successful</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div className="admin-filter-control">
              <label htmlFor="transaction-from-filter">From</label>
              <input id="transaction-from-filter" className="form-input" type="date" value={from} max={to || undefined}
                onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
            </div>
            <div className="admin-filter-control">
              <label htmlFor="transaction-to-filter">Through</label>
              <input id="transaction-to-filter" className="form-input" type="date" value={to} min={from || undefined}
                onChange={(event) => { setTo(event.target.value); setPage(1); }} />
            </div>
            {(status || from || to) && (
              <button type="button" className="btn btn-text btn-sm" onClick={resetFilters}>Clear filters</button>
            )}
          </div>

          {loading ? (
            <div className="loading-state" aria-live="polite">Loading transaction records…</div>
          ) : transactions.length === 0 ? (
            <div className="admin-empty-state" role="status">
              <strong>No transactions found</strong>
              <span>Payments are recorded after a customer completes the mock UPI payment step during reservation.</span>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-transactions-table">
                <thead>
                  <tr>
                    <th scope="col">Transaction</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Session / reservation</th>
                    <th scope="col">Slot</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.transactionId || transaction.transactionReference}>
                      <td>
                        <span className="admin-transaction-ref">{transaction.transactionReference || '—'}</span>
                        <span className="admin-transaction-id">{transaction.transactionId || '—'}</span>
                      </td>
                      <td>
                        <span className="admin-cell-primary">{transaction.user?.name || 'Unknown user'}</span>
                        <span className="admin-cell-secondary">{transaction.user?.email || '—'}</span>
                      </td>
                      <td>
                        <span className="admin-cell-primary">{transaction.session?.reservationId || 'Session'}</span>
                        <span className="admin-cell-secondary">{transaction.session?._id || 'Session unavailable'}</span>
                      </td>
                      <td>{transaction.session?.slotId || '—'}</td>
                      <td className="admin-amount">{formatAmount(transaction.amount)}</td>
                      <td>{transaction.provider || '—'}</td>
                      <td>
                        <span className={`admin-payment-status admin-payment-${String(transaction.status || '').toLowerCase()}`}>
                          {transaction.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{formatDate(transaction.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-pagination" aria-label="Transaction pagination">
            <span>Page {pagination.page || page} of {totalPages}</span>
            <div>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
                Previous
              </button>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages || pagination.total === 0}>
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {/* All Reservations section */}
      {activeSection === 'reservations' && (
        <section className="admin-transactions-section">
          <div className="admin-section-heading">
            <div>
              <h2>All Customer Reservations</h2>
              <p>Bookings made by all registered customers.</p>
            </div>
            <span className="admin-record-count">{allReservations.length} records</span>
          </div>
          {resLoading ? (
            <div className="loading-state">Loading reservations…</div>
          ) : allReservations.length === 0 ? (
            <div className="admin-empty-state"><strong>No reservations found</strong></div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-transactions-table">
                <thead>
                  <tr>
                    <th>Reservation ID</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Slot</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allReservations.map((r) => (
                    <tr key={r._id}>
                      <td><span className="admin-transaction-ref">{r.reservationId}</span></td>
                      <td>
                        <span className="admin-cell-primary">{r.userId?.name || '—'}</span>
                        <span className="admin-cell-secondary">{r.userId?.email || '—'}</span>
                      </td>
                      <td>{r.vehicleId}</td>
                      <td>{r.slotId}</td>
                      <td>{formatDate(r.startTime)}</td>
                      <td>{formatDate(r.endTime)}</td>
                      <td>
                        <span className={`status-pill pill-${r.status?.toLowerCase()}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* All Vehicles section */}
      {activeSection === 'vehicles' && (
        <section className="admin-transactions-section">
          <div className="admin-section-heading">
            <div>
              <h2>All Registered Vehicles</h2>
              <p>Vehicles registered by all customers.</p>
            </div>
            <span className="admin-record-count">{allVehicles.length} vehicles</span>
          </div>
          {vehLoading ? (
            <div className="loading-state">Loading vehicles…</div>
          ) : allVehicles.length === 0 ? (
            <div className="admin-empty-state"><strong>No vehicles found</strong></div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-transactions-table">
                <thead>
                  <tr>
                    <th>Registration No.</th>
                    <th>Type</th>
                    <th>Model</th>
                    <th>Owner</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {allVehicles.map((v) => (
                    <tr key={v._id}>
                      <td><span className="admin-transaction-ref">{v.vehicleNumber}</span></td>
                      <td>{v.vehicleType}</td>
                      <td>{v.model || '—'}</td>
                      <td>
                        <span className="admin-cell-primary">{v.user?.name || '—'}</span>
                        <span className="admin-cell-secondary">{v.user?.email || '—'}</span>
                      </td>
                      <td>{formatDate(v.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
