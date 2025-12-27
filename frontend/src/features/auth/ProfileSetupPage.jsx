import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from './authApi';
import { colors } from '../../styles/colors';

export default function ProfileSetupPage({ user, onUpdateUser }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (!graduationYear.trim()) {
      setError('卒業年度を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatedUser = await authApi.updateSettings({
        display_name: displayName,
        graduation_year: graduationYear,
      });

      onUpdateUser(updatedUser);
      navigate('/');
    } catch (err) {
      setError('プロフィールの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>プロフィール設定</h1>
          <p style={styles.subtitle}>
            EntryNest2へようこそ！<br />
            あなたのプロフィールを設定してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>お名前</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 就活 太郎"
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>卒業年度</label>
            <input
              type="text"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="例: 2026年卒"
              style={styles.input}
            />
            <small style={styles.hint}>
              例: 2026年卒、2025年卒（既卒）など
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? '保存中...' : '設定を完了する'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            メールアドレス: <strong>{user?.email}</strong>
          </p>
          <p style={styles.footerHint}>
            これらの情報は後から設定画面で変更できます。
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: '20px',
  },
  card: {
    backgroundColor: colors.surface,
    padding: '48px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    width: '100%',
    maxWidth: '500px',
    border: `1px solid ${colors.border}`,
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors.text,
    marginBottom: '12px',
    fontFamily: "'Poppins', sans-serif",
  },
  subtitle: {
    fontSize: '15px',
    color: colors.textSecondary,
    lineHeight: '1.6',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '8px',
    fontSize: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    padding: '12px 16px',
    border: `2px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '13px',
    color: colors.textSecondary,
  },
  button: {
    padding: '14px 24px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  footer: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.border}`,
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  footerHint: {
    fontSize: '13px',
    color: colors.textSecondary,
  },
};
