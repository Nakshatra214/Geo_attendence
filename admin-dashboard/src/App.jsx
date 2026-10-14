import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import LocationsPage from './pages/LocationsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';

function AppContent() {
  const { admin, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!admin) return <LoginPage />;

  const PAGE_MAP = {
    dashboard:  <DashboardPage />,
    attendance: <AttendancePage />,
    locations:  <LocationsPage />,
    users:      <UsersPage />,
    reports:    <ReportsPage />,
  };

  const PAGE_TITLES = {
    dashboard:  'Dashboard',
    attendance: 'Attendance Records',
    locations:  'Geofence Locations',
    users:      'User Management',
    reports:    'Reports & Export',
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
      />

      <div className="main-content">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-title">{PAGE_TITLES[activePage]}</div>
          <div className="topbar-actions">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
              🟢 API: localhost:3000 (Supabase Next.js)
            </div>
          </div>
        </div>
        <div className="page-content">
          {PAGE_MAP[activePage]}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />
      <div className="app-container">
        <AppContent />
      </div>
    </AuthProvider>
  );
}
