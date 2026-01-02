import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiGrid, FiBriefcase, FiSettings, FiPlus, FiMenu, FiX } from 'react-icons/fi';
import { colors } from '../styles/colors';
import { companyApi } from '../features/companies/companyApi';
import SidebarCalendar from './SidebarCalendar';

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div style={styles.container}>
      {/* Mobile Header */}
      {isMobile && (
        <header style={styles.mobileHeader}>
          <div style={styles.mobileHeaderContent}>
            <div style={styles.mobileLogo}>
              <FiBriefcase size={20} color={colors.primary} />
              <span style={styles.mobileLogoText}>EntryNest</span>
            </div>
            <button
              onClick={toggleMobileMenu}
              style={styles.hamburgerButton}
              aria-label={isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </header>
      )}

      {/* Overlay for mobile menu */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={styles.overlay}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile ? styles.sidebarMobile : {}),
          ...(isMobile && isMobileMenuOpen ? styles.sidebarMobileOpen : {}),
        }}
        aria-hidden={isMobile && !isMobileMenuOpen}
      >
        {/* Logo (desktop only) */}
        {!isMobile && (
          <div style={styles.logo}>
            <FiBriefcase size={24} color={colors.primary} />
            <span style={styles.logoText}>EntryNest</span>
          </div>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <div style={styles.mobileMenuHeader}>
            <span style={styles.mobileMenuTitle}>メニュー</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={styles.closeButton}
              aria-label="メニューを閉じる"
            >
              <FiX size={24} />
            </button>
          </div>
        )}

        {/* Add Entry Button */}
        <button
          onClick={() => navigate('/companies')}
          style={styles.addEntryButton}
        >
          <FiPlus size={18} />
          <span>新規エントリー</span>
        </button>

        {/* Navigation */}
        <nav style={styles.nav} role="navigation" aria-label="メインナビゲーション">
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

        {/* Calendar (desktop only) */}
        {!isMobile && (
          <div style={styles.calendarSection}>
            <SidebarCalendar companies={companies} />
          </div>
        )}

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
      <div style={{
        ...styles.main,
        ...(isMobile ? styles.mainMobile : {}),
      }}>
        <main style={{
          ...styles.content,
          ...(isMobile ? styles.contentMobile : {}),
        }}>
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
  // Mobile Header
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    zIndex: 100,
  },
  mobileHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    padding: '0 16px',
  },
  mobileLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mobileLogoText: {
    fontSize: '18px',
    fontWeight: '700',
    color: colors.primary,
    fontFamily: "'Poppins', sans-serif",
  },
  hamburgerButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
  // Overlay
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 199,
  },
  // Sidebar
  sidebar: {
    width: '320px',
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  sidebarMobile: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '280px',
    zIndex: 200,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease-in-out',
    paddingTop: '16px',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
  },
  mobileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  mobileMenuTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
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
    marginTop: 'auto',
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
    flexShrink: 0,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    flexShrink: 0,
  },
  // Main content
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  mainMobile: {
    paddingTop: '56px',
  },
  content: {
    flex: 1,
    padding: '32px',
    overflow: 'auto',
  },
  contentMobile: {
    padding: '16px',
  },
};
