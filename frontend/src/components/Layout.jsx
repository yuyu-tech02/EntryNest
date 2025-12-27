import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiGrid, FiBriefcase, FiSettings, FiPlus } from 'react-icons/fi';
import { colors } from '../styles/colors';
import { companyApi } from '../features/companies/companyApi';
import SidebarCalendar from './SidebarCalendar';

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companyApi.list('-updated_at');
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies for calendar:', err);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('ログアウトしますか？')) {
      return;
    }
    await onLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logo}>
          <FiBriefcase size={24} color={colors.primary} />
          <span style={styles.logoText}>EntryNest</span>
        </div>

        {/* Add Entry Button */}
        <button
          onClick={() => navigate('/companies')}
          style={styles.addEntryButton}
        >
          <FiPlus size={18} />
          <span>新規エントリー</span>
        </button>

        {/* Navigation */}
        <nav style={styles.nav}>
          <Link
            to="/"
            style={{
              ...styles.navItem,
              ...(isActive('/') ? styles.navItemActive : {}),
            }}
          >
            <FiGrid size={20} />
            <span>ダッシュボード</span>
          </Link>
          <Link
            to="/companies"
            style={{
              ...styles.navItem,
              ...(isActive('/companies') ? styles.navItemActive : {}),
            }}
          >
            <FiBriefcase size={20} />
            <span>選考管理</span>
          </Link>
        </nav>

        {/* Calendar */}
        <div style={styles.calendarSection}>
          <SidebarCalendar companies={companies} />
        </div>

        {/* User Info */}
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user?.display_name || '就活 太郎'}</div>
              <div style={styles.userYear}>{user?.graduation_year || '2026年卒'}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={styles.settingsButton}
            aria-label="設定"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Page Content */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: colors.background,
  },
  sidebar: {
    width: '360px',
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '0 8px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: colors.primary,
    fontFamily: "'Poppins', sans-serif",
  },
  addEntryButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '24px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: colors.textSecondary,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  navItemActive: {
    backgroundColor: '#EEF2FF',
    color: colors.primary,
  },
  calendarSection: {
    flex: 1,
    marginBottom: '16px',
    overflowY: 'auto',
  },
  userSection: {
    borderTop: `1px solid ${colors.border}`,
    paddingTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#EEF2FF',
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
  },
  userYear: {
    fontSize: '12px',
    color: colors.textSecondary,
  },
  settingsButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    padding: '32px',
    overflow: 'auto',
  },
};
