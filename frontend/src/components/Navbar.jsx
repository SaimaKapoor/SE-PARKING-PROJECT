export default function Navbar({ user, isAdmin, activeTab, onSelectTab, onLogout, isStaff = false }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="navbar-brand"
          onClick={() => onSelectTab('slots')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectTab('slots');
            }
          }}
        >
          <span className="navbar-title">
            <i className="las la-parking" style={{ marginRight: '8px', fontSize: '1.4rem', color: '#2563eb' }}></i>
            Smart Parking System
          </span>
        </div>

        <nav className="navbar-menu">
          <button
            type="button"
            className={`nav-link ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => onSelectTab('slots')}
          >
            <i className="las la-th-large" style={{ marginRight: '6px' }}></i>
            Parking Slots
          </button>

          {user ? (
            <>
              {isAdmin && (
                <button
                  type="button"
                  className={`nav-link ${['admin', 'adminSlots'].includes(activeTab) ? 'active' : ''}`}
                  onClick={() => onSelectTab('admin')}
                >
                  <i className="las la-sliders-h" style={{ marginRight: '6px' }}></i>
                  Admin Dashboard
                </button>
              )}
              {isStaff && (
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'scanner' ? 'active' : ''}`}
                  onClick={() => onSelectTab('scanner')}
                >
                  <i className="las la-qrcode" style={{ marginRight: '6px' }}></i>
                  QR Scanner
                </button>
              )}
              <button
                type="button"
                className={`nav-link ${activeTab === 'reservations' ? 'active' : ''}`}
                onClick={() => onSelectTab('reservations')}
              >
                <i className="las la-calendar-check" style={{ marginRight: '6px' }}></i>
                My Reservations
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === 'vehicles' ? 'active' : ''}`}
                onClick={() => onSelectTab('vehicles')}
              >
                <i className="las la-car" style={{ marginRight: '6px' }}></i>
                My Vehicles
              </button>
              <div className="user-profile">
                <i className="las la-user-circle" style={{ marginRight: '4px', fontSize: '1.1rem' }}></i>
                <span className="user-name">{user.name}</span>
                <span className="role-badge">
                  {user.role || 'customer'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
              >
                <i className="las la-sign-out-alt" style={{ marginRight: '4px' }}></i>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`nav-link ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => onSelectTab('login')}
              >
                <i className="las la-sign-in-alt" style={{ marginRight: '4px' }}></i>
                Sign In
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => onSelectTab('register')}
              >
                <i className="las la-user-plus" style={{ marginRight: '4px' }}></i>
                Register
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
