export default function Navbar({ user, isAdmin, activeTab, onSelectTab, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="navbar-brand"
          onClick={() => onSelectTab(user ? 'slots' : 'slots')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectTab('slots');
            }
          }}
        >
          <span className="navbar-logo">🅿️</span>
          <span className="navbar-title">Smart Parking System</span>
        </div>

        <nav className="navbar-menu">
          <button
            type="button"
            className={`nav-link ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => onSelectTab('slots')}
          >
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
                  Admin Dashboard
                </button>
              )}
              <button
                type="button"
                className={`nav-link ${activeTab === 'reservations' ? 'active' : ''}`}
                onClick={() => onSelectTab('reservations')}
              >
                My Reservations
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === 'vehicles' ? 'active' : ''}`}
                onClick={() => onSelectTab('vehicles')}
              >
                My Vehicles
              </button>
              <div className="user-profile">
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
                Sign In
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => onSelectTab('register')}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
