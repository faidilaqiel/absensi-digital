import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import StudentsPage from './pages/StudentsPage';
import ClassesPage from './pages/ClassesPage';
import CardsPage from './pages/CardsPage';
import PermitsPage from './pages/PermitsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ChatbotWidget from './components/ChatbotWidget';

import { getCurrentUser, setCurrentUser, setAuthToken, apiRequest } from './services/api';
import { getOfflineQueue, clearOfflineQueue } from './utils/offlineQueue';

export default function App() {
  const initialUser = getCurrentUser();
  const [currentUser, setCurrentUserState] = useState(initialUser);
  const [activeTab, setActiveTab] = useState(initialUser?.role === 'petugas' ? 'scan' : 'dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAY, setSelectedAY] = useState('');
  const [isKioskMode, setIsKioskMode] = useState(false);

  // Toggle Kiosk Mode (Full Screen & Hide Navigation)
  const toggleKioskMode = () => {
    setIsKioskMode(prev => {
      const next = !prev;
      if (next) {
        // Coba aktifkan browser full-screen jika didukung perangkat
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch {}
      } else {
        // Keluar dari browser full-screen jika sedang aktif
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      }
      return next;
    });
  };

  // Load academic years for global top navbar selector
  const loadAcademicYears = async () => {
    try {
      const res = await apiRequest('/classes/academic-years');
      if (res.years && res.years.length > 0) {
        setAcademicYears(res.years);
        const active = res.years.find(y => y.is_active === 1);
        if (active && !selectedAY) {
          setSelectedAY(String(active.id));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat tahun ajaran:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAcademicYears();
    }
  }, [currentUser]);

  // Dark Mode State with LocalStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync offline queue when back online
      autoSyncOffline();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update offline queue count
  const updateQueueCount = () => {
    setOfflineCount(getOfflineQueue().length);
  };

  // Sync offline data to server
  const autoSyncOffline = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0 || isSyncing) return;

    try {
      setIsSyncing(true);
      const res = await apiRequest('/attendance/sync-offline', {
        method: 'POST',
        body: JSON.stringify({ queue })
      });
      clearOfflineQueue();
      updateQueueCount();
      alert(`[SINKRONISASI OFFLINE BERHASIL]\n${res.message}`);
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Login
  const handleLoginSuccess = (user) => {
    setCurrentUserState(user);
    if (user.role === 'petugas') {
      setActiveTab('scan'); // Default tab untuk petugas langsung ke pemindai barcode
    } else {
      setActiveTab('dashboard');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentUserState(null);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${isKioskMode ? 'kiosk-mode bg-slate-900' : ''}`}>
      {/* Top Header Navbar - Sembunyi saat Mode Kios */}
      {!isKioskMode && (
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          isOnline={isOnline}
          offlineCount={offlineCount}
          onSyncOffline={autoSyncOffline}
          isSyncing={isSyncing}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          academicYears={academicYears}
          selectedAY={selectedAY}
          onSelectAY={(newAyId) => setSelectedAY(String(newAyId))}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={currentUser?.role}
        />
      )}

      <div className={`flex-1 flex max-w-7xl w-full mx-auto ${isKioskMode ? 'max-w-none p-0' : ''}`}>
        {/* Navigation (Sidebar Desktop & Scrollable Tabs Mobile) - Sembunyi saat Mode Kios */}
        {!isKioskMode && (
          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userRole={currentUser.role}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 ${isKioskMode ? 'p-2 sm:p-4' : 'p-3.5 sm:p-6 lg:p-8'}`}>
          {activeTab === 'dashboard' && (
            <DashboardPage
              userRole={currentUser.role}
              selectedAY={selectedAY}
              onSelectAY={(id) => setSelectedAY(String(id))}
            />
          )}
          {activeTab === 'scan' && (
            <ScanPage
              isOnline={isOnline}
              onQueueUpdate={updateQueueCount}
              isKioskMode={isKioskMode}
              onToggleKioskMode={toggleKioskMode}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceHistoryPage userRole={currentUser.role} selectedAY={selectedAY} />
          )}
          {activeTab === 'students' && (
            <StudentsPage userRole={currentUser.role} selectedAY={selectedAY} />
          )}
          {activeTab === 'classes' && (
            <ClassesPage userRole={currentUser.role} selectedAY={selectedAY} />
          )}
          {activeTab === 'cards' && <CardsPage selectedAY={selectedAY} />}
          {activeTab === 'permits' && (
            <PermitsPage userRole={currentUser.role} selectedAY={selectedAY} />
          )}
          {activeTab === 'reports' && (
            <ReportsPage userRole={currentUser.role} selectedAY={selectedAY} />
          )}
          {activeTab === 'users' && (
            <UsersPage
              onCurrentUserUpdate={(updatedUser) => {
                if (currentUser && currentUser.id === updatedUser.id) {
                  const merged = { ...currentUser, ...updatedUser };
                  setCurrentUserState(merged);
                  setCurrentUser(merged);
                }
              }}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPage
              onAcademicYearCreated={() => {
                loadAcademicYears();
              }}
            />
          )}
        </main>
      </div>

      {/* Floating Chatbot PresensiAI (Disembunyikan saat Kiosk Mode agar tidak menutupi kamera) */}
      {!isKioskMode && <ChatbotWidget />}
    </div>
  );
}
