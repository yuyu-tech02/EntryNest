import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from './features/auth/authApi';
import Layout from './components/Layout';
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

  // Check if user needs to complete profile setup
  const needsProfileSetup = (user) => {
    return user && (user.display_name === '就活 太郎' && user.graduation_year === '2026年卒');
  };

  const initializeApp = async () => {
    try {
      // First, get CSRF token
      await authApi.getCsrfToken();
      // Then check authentication
      const userData = await authApi.me();
      setUser(userData);
    } catch (err) {
      // Not authenticated
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
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <RegisterPage onLogin={handleLogin} />
            )
          }
        />

        {/* Profile setup (required for new users) */}
        <Route
          path="/profile-setup"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <ProfileSetupPage user={user} onUpdateUser={handleUpdateUser} />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Protected routes with Layout */}
        <Route
          path="/"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <DashboardPage />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/companies"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <CompanyListPage user={user} />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/companies/:id"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <CompanyDetailPage />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            user ? (
              needsProfileSetup(user) ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <SettingsPage user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
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
