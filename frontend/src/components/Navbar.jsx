export default function Navbar({ user, activeTab, onSelectTab, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="navbar-brand"
          onClick={() => onSelectTab(user ? 'vehicles' : 'login')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectTab(user ? 'vehicles' : 'login');
            }
          }}
        >
          <span className="navbar-logo">PARK</span>
          <span className="navbar-title">Smart Parking System</span>
        </div>

        <nav className="navbar-menu">
          {user ? (
            <>
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
