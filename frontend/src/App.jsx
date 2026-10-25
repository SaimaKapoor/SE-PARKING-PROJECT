import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Vehicles from './components/Vehicles';
import { getUser, clearAuth, getProfile } from './services/api';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [activeTab, setActiveTab] = useState(() => (getUser() ? 'vehicles' : 'login'));

  useEffect(() => {
    // Validate session on mount if token exists
    const checkSession = async () => {
      try {
        const response = await getProfile();
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch {
        // Token expired or invalid
        clearAuth();
        setUser(null);
        setActiveTab('login');
      }
    };

    if (getUser()) {
      checkSession();
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab('vehicles');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setActiveTab('login');
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {!user && activeTab === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setActiveTab('register')}
          />
        )}

        {!user && activeTab === 'register' && (
          <Register
            onSwitchToLogin={() => setActiveTab('login')}
          />
        )}

        {user && activeTab === 'vehicles' && (
          <Vehicles user={user} />
        )}
      </main>

      <footer className="footer">
        <p>QR-Based Vehicle Parking Management System</p>
      </footer>
    </div>
  );
}
