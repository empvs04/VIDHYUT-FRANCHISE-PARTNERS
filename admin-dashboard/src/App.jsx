import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PartnersPage from './pages/PartnersPage';
import CreatePartnerPage from './pages/CreatePartnerPage';
import PartnerDetailPage from './pages/PartnerDetailPage';
import TerritoriesPage from './pages/TerritoriesPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '14px',
        }}
      >
        Authenticating Super Admin...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard (prevents logged-in admin from seeing login page)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="partners" element={<PartnersPage />} />
              <Route path="partners/new" element={<CreatePartnerPage />} />
              <Route path="partners/:id" element={<PartnerDetailPage />} />
              <Route path="territories" element={<TerritoriesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
