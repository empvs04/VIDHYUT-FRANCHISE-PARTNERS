import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PartnersPage from './pages/PartnersPage';
import SubFranchisesPage from './pages/SubFranchisesPage';
import CreatePartnerPage from './pages/CreatePartnerPage';

import PartnerDetailPage from './pages/PartnerDetailPage';
import TerritoriesPage from './pages/TerritoriesPage';
import CardInventoryPage from './pages/CardInventoryPage';
import AddCardsPage from './pages/AddCardsPage';
import AssignCardsPage from './pages/AssignCardsPage';
import CardDetailPage from './pages/CardDetailPage';
import DistributeCardsPage from './pages/DistributeCardsPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import CustomersPage from './pages/CustomersPage';
import AddCustomerInstallationPage from './pages/AddCustomerInstallationPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import InstallationsPage from './pages/InstallationsPage';
import LocationReviewPage from './pages/LocationReviewPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import GlobalAuditPage from './pages/GlobalAuditPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SystemHealthPage from './pages/SystemHealthPage';
import ErrorBoundary from './components/common/ErrorBoundary';




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
        Verifying Vidhyut Saathi Session...
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

// Super Admin Only Route Guard
const AdminOnlyRoute = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <ErrorBoundary>
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
                <Route path="sub-franchises" element={<SubFranchisesPage />} />
                <Route path="partners/new" element={<CreatePartnerPage />} />

                <Route path="partners/:id" element={<PartnerDetailPage />} />
                <Route path="territories" element={<TerritoriesPage />} />
                <Route path="cards" element={<CardInventoryPage />} />
                <Route path="cards/new" element={<AddCardsPage />} />
                <Route path="cards/assign" element={<AssignCardsPage />} />
                <Route path="cards/distribute" element={<DistributeCardsPage />} />
                <Route path="cards/:id" element={<CardDetailPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="transactions/new" element={<DistributeCardsPage />} />
                <Route path="transactions/:id" element={<TransactionDetailPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/new" element={<AddCustomerInstallationPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="installations" element={<InstallationsPage />} />
                <Route path="installations/new" element={<AddCustomerInstallationPage />} />
                <Route path="location-verifications" element={<LocationReviewPage />} />
                <Route
                  path="analytics"
                  element={
                    <AdminOnlyRoute>
                      <AnalyticsPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <AdminOnlyRoute>
                      <ReportsPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <AdminOnlyRoute>
                      <GlobalAuditPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <AdminOnlyRoute>
                      <AuditLogsPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route
                  path="system-health"
                  element={
                    <AdminOnlyRoute>
                      <SystemHealthPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route path="settings" element={<SettingsPage />} />

              </Route>


              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>

  );
}

export default App;
