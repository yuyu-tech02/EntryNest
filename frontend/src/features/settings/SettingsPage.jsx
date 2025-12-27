import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../auth/authApi';
import { colors } from '../../styles/colors';

export default function SettingsPage({ user, onUpdateUser, onLogout }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(user?.display_name || '就活 太郎');
  const [userYear, setUserYear] = useState(user?.graduation_year || '2026年卒');
  const [diffEnabled, setDiffEnabled] = useState(user?.diff_enabled ?? true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Send all settings to server
      const updatedUser = await authApi.updateSettings({
        diff_enabled: diffEnabled,
        display_name: userName,
        graduation_year: userYear,
      });

      // Notify parent component to update state
      onUpdateUser(updatedUser);

      setMessage('設定を保存しました');
    } catch (err) {
      setError('設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('ログアウトしますか？')) {
      return;
    }
    await onLogout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>設定</h1>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {/* Profile Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>プロフィール</h2>
        <div style={styles.formGroup}>
          <label style={styles.label}>名前</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={styles.input}
            placeholder="就活 太郎"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>卒業年度</label>
          <input
            type="text"
            value={userYear}
            onChange={(e) => setUserYear(e.target.value)}
            style={styles.input}
            placeholder="2026年卒"
          />
        </div>
      </div>

      {/* Account Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>アカウント情報</h2>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>メールアドレス</span>
          <span style={styles.infoValue}>{user?.email}</span>
        </div>
      </div>

      {/* Settings Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>アプリケーション設定</h2>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={diffEnabled}
            onChange={(e) => setDiffEnabled(e.target.checked)}
            style={styles.checkboxInput}
          />
          <span style={styles.checkboxLabel}>
            ES版の差分比較を有効にする
          </span>
        </label>
        <p style={styles.hint}>
          有効にすると、ES提出版の異なるバージョンを比較できます。
        </p>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={styles.saveButton}
        >
          {loading ? '保存中...' : '設定を保存'}
        </button>
        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors.text,
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  section: {
    backgroundColor: colors.surface,
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.text,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: '14px',
    color: colors.text,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: colors.text,
    cursor: 'pointer',
  },
  hint: {
    fontSize: '13px',
    color: colors.textSecondary,
    marginTop: '8px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  saveButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  logoutButton: {
    padding: '12px 24px',
    backgroundColor: colors.surface,
    color: colors.error,
    border: `1px solid ${colors.error}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
