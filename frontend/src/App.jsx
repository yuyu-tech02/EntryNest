import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { authApi } from './features/auth/authApi';
import ProtectedRoute, { PublicRoute, ProfileSetupRoute } from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfileSetupPage from './features/auth/ProfileSetupPage';
import DashboardPage from './features/dashboard/DashboardPage';
import CompanyListPage from './features/companies/CompanyListPage';
import CompanyDetailPage from './features/companies/CompanyDetailPage';
import SettingsPage from './features/settings/SettingsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await authApi.getCsrfToken();
      const userData = await authApi.me();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleUpdateUser = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute user={user}>
              <LoginPage onLogin={handleLogin} />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute user={user}>
              <RegisterPage onLogin={handleLogin} />
            </PublicRoute>
          }
        />

        {/* Profile setup (required for new users) */}
        <Route
          path="/profile-setup"
          element={
            <ProfileSetupRoute user={user}>
              <ProfileSetupPage user={user} onUpdateUser={handleUpdateUser} />
            </ProfileSetupRoute>
          }
        />

        {/* Protected routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} onLogout={handleLogout}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute user={user} onLogout={handleLogout}>
              <CompanyListPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute user={user} onLogout={handleLogout}>
              <CompanyDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute user={user} onLogout={handleLogout}>
              <SettingsPage user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '16px',
    color: '#666',
  },
};
