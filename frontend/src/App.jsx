import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Vehicles from './components/Vehicles';
import SlotGrid from './components/SlotGrid';
import ReservationModal from './components/ReservationModal';
import Reservations from './components/Reservations';
import { getUser, clearAuth, getProfile } from './services/api';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [activeTab, setActiveTab] = useState('slots');
  const [selectedSlotForReservation, setSelectedSlotForReservation] = useState(null);

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
      }
    };

    if (getUser()) {
      checkSession();
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab('slots');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setActiveTab('slots');
  };

  const handleSelectSlot = (slot) => {
    if (!user) {
      setActiveTab('login');
      return;
    }
    setSelectedSlotForReservation(slot);
  };

  const handleReservationSuccess = () => {
    // Slot status will be updated on next grid render or when visiting reservations
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
        {activeTab === 'slots' && (
          <SlotGrid
            user={user}
            onSelectSlot={handleSelectSlot}
            onLoginPrompt={() => setActiveTab('login')}
          />
        )}

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

        {user && activeTab === 'reservations' && (
          <Reservations
            onNavigateToGrid={() => setActiveTab('slots')}
          />
        )}

        {user && activeTab === 'vehicles' && (
          <Vehicles user={user} />
        )}
      </main>

      {/* Reservation Dialog Modal */}
      {selectedSlotForReservation && (
        <ReservationModal
          slot={selectedSlotForReservation}
          user={user}
          onClose={() => setSelectedSlotForReservation(null)}
          onReservationSuccess={handleReservationSuccess}
        />
      )}
    </div>
  );
}
