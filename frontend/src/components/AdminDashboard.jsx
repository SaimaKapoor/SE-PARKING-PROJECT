import { useEffect, useState } from 'react';
import { fetchAdminTransactions, fetchSlots } from '../services/api';

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
    return () => {
      ignore = true;
    };
  }, [page, status, from, to]);

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
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Successful</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="admin-filter-control">
            <label htmlFor="transaction-from-filter">From</label>
            <input
              id="transaction-from-filter"
              className="form-input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="admin-filter-control">
            <label htmlFor="transaction-to-filter">Through</label>
            <input
              id="transaction-to-filter"
              className="form-input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {(status || from || to) && (
            <button type="button" className="btn btn-text btn-sm" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state" aria-live="polite">Loading transaction records…</div>
        ) : transactions.length === 0 ? (
          <div className="admin-empty-state" role="status">
            <strong>No transactions found</strong>
            <span>Try changing the filters or check back after a payment is recorded.</span>
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
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={loading || page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={loading || page >= totalPages || pagination.total === 0}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
