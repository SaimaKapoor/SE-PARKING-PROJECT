import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Vehicles from './components/Vehicles';
import SlotGrid from './components/SlotGrid';
import ReservationModal from './components/ReservationModal';
import Reservations from './components/Reservations';
import StaffQrScanner from './components/StaffQrScanner';
import AdminDashboard from './components/AdminDashboard';
import AdminSlotManagement from './components/AdminSlotManagement';
import { getUser, clearAuth, getProfile } from './services/api';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [profileChecked, setProfileChecked] = useState(() => !getUser());
  const [activeTab, setActiveTab] = useState('slots');
  const [selectedSlotForReservation, setSelectedSlotForReservation] = useState(null);
  const [pendingSlotForReservation, setPendingSlotForReservation] = useState(null);
  const isAdmin = profileChecked && user?.role === 'admin';

  useEffect(() => {
    // Validate session on mount if token exists
    const checkSession = async () => {
      try {
        const response = await getProfile();
        if (response.data?.user) {
          const verifiedUser = response.data.user;
          setUser(verifiedUser);
          if (verifiedUser.role === 'admin') setActiveTab('admin');
        }
        setProfileChecked(true);
      } catch {
        // Token expired or invalid
        clearAuth();
        setUser(null);
        setActiveTab('slots');
        setProfileChecked(true);
      }
    };

    if (getUser()) {
      checkSession();
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setProfileChecked(true);
    setActiveTab(loggedInUser.role === 'admin' ? 'admin' : 'slots');
    if (pendingSlotForReservation) {
      setSelectedSlotForReservation(pendingSlotForReservation);
      setPendingSlotForReservation(null);
    }
  };

  const handleRegisterSuccess = (registeredUser) => {
    if (registeredUser) handleLoginSuccess(registeredUser);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setProfileChecked(true);
    setActiveTab('slots');
  };

  const handleSelectTab = (tab) => {
    if (tab === 'admin' && !isAdmin) return;
    setActiveTab(tab);
  };

  const handleSelectSlot = (slot) => {
    if (!user) {
      setPendingSlotForReservation(slot);
      setActiveTab('register');
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
        isAdmin={isAdmin}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
        isStaff={user?.role === 'staff'}
      />

      <main className="main-content">
        {activeTab === 'slots' && (
          <SlotGrid
            user={user}
            onSelectSlot={handleSelectSlot}
            onLoginPrompt={(slot) => {
              setPendingSlotForReservation(slot);
              setActiveTab('register');
            }}
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
            onRegistrationSuccess={handleRegisterSuccess}
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

        {user?.role === 'staff' && activeTab === 'scanner' && <StaffQrScanner />}

        {isAdmin && activeTab === 'admin' && (
          <AdminDashboard onManageSlots={() => setActiveTab('adminSlots')} />
        )}
        {isAdmin && activeTab === 'adminSlots' && (
          <AdminSlotManagement onBackToDashboard={() => setActiveTab('admin')} />
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
