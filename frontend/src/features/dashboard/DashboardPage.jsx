import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiCalendar, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { companyApi } from '../companies/companyApi';
import { colors } from '../../styles/colors';
import { getDeadlineUrgency, formatDeadline } from '../../utils/deadline';
import { hasOffer, hasInterview, isInProgress, isPendingES } from '../../utils/status';

export default function DashboardPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await companyApi.list('-updated_at');
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    inProgress: companies.filter(c => isInProgress(c.status_text)).length,
    interviews: companies.filter(c => hasInterview(c.status_text)).length,
    pendingES: companies.filter(c => isPendingES(c.status_text)).length,
    offers: companies.filter(c => hasOffer(c.status_text)).length,
  };

  // Get upcoming deadlines (within ±7 days from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysBefore = new Date(today);
  sevenDaysBefore.setDate(today.getDate() - 7);

  const sevenDaysAfter = new Date(today);
  sevenDaysAfter.setDate(today.getDate() + 7);

  const upcomingDeadlines = companies
    .filter(c => {
      if (!c.deadline) return false;
      const deadline = new Date(c.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= sevenDaysBefore && deadline <= sevenDaysAfter;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>ダッシュボード</h1>
          <p style={styles.subtitle}>現在の就活データをひと目で確認できます。</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon={<FiTrendingUp size={24} />}
          label="エントリー中"
          value={stats.inProgress}
          color="#6366F1"
          bgColor="#EEF2FF"
        />
        <StatCard
          icon={<FiCalendar size={24} />}
          label="面接予定"
          value={stats.interviews}
          color="#8B5CF6"
          bgColor="#F3E8FF"
        />
        <StatCard
          icon={<FiAlertCircle size={24} />}
          label="ES未提出"
          value={stats.pendingES}
          color="#F59E0B"
          bgColor="#FEF3C7"
        />
        <StatCard
          icon={<FiCheckCircle size={24} />}
          label="内定"
          value={stats.offers}
          color="#10B981"
          bgColor="#D1FAE5"
        />
      </div>

      {/* Content Grid */}
      <div style={styles.contentGrid}>
        {/* Upcoming Deadlines */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FiClock size={20} color={colors.textSecondary} />
            <h2 style={styles.sectionTitle}>直近の締切（±7日）</h2>
          </div>
          <div style={styles.sectionContent}>
            {upcomingDeadlines.length === 0 ? (
              <div style={styles.emptyState}>7日以内の締切はありません</div>
            ) : (
              upcomingDeadlines.map((company) => (
                <DeadlineItem key={company.id} company={company} />
              ))
            )}
          </div>
          {upcomingDeadlines.length > 0 && (
            <Link to="/companies" style={styles.sectionLink}>
              すべて見る
            </Link>
          )}
        </div>

        {/* Latest ES Updates */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FiTrendingUp size={20} color={colors.textSecondary} />
            <h2 style={styles.sectionTitle}>最新のES更新</h2>
          </div>
          <div style={styles.sectionContent}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📝</div>
              <div>更新履歴はありません。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, backgroundColor: bgColor, color: color }}>
        {icon}
      </div>
      <div style={styles.statContent}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

function DeadlineItem({ company }) {
  const urgency = getDeadlineUrgency(company.deadline);

  return (
    <div style={styles.deadlineItem}>
      <div style={styles.deadlineAvatar}>
        {company.name.charAt(0).toUpperCase()}
      </div>
      <div style={styles.deadlineInfo}>
        <div style={styles.deadlineName}>{company.name}</div>
        <div style={styles.deadlineCategory}>{company.job_role || '職種未設定'}</div>
      </div>
      <div style={styles.deadlineDate}>
        <div style={{ ...styles.deadlineDateText, color: urgency?.color }}>
          {formatDeadline(company.deadline)}
        </div>
        <div style={styles.deadlineLabel}>提出期限</div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors.text,
    marginBottom: '8px',
    fontFamily: "'Poppins', sans-serif",
  },
  subtitle: {
    fontSize: '16px',
    color: colors.textSecondary,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: colors.surface,
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors.text,
    fontFamily: "'Poppins', sans-serif",
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.text,
    margin: 0,
  },
  sectionContent: {
    padding: '16px',
  },
  sectionLink: {
    display: 'block',
    padding: '16px 24px',
    textAlign: 'center',
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    borderTop: `1px solid ${colors.border}`,
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: colors.textSecondary,
    fontSize: '14px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  deadlineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  deadlineAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#EEF2FF',
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineName: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '2px',
  },
  deadlineCategory: {
    fontSize: '12px',
    color: colors.textSecondary,
  },
  deadlineDate: {
    textAlign: 'right',
  },
  deadlineDateText: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  deadlineLabel: {
    fontSize: '11px',
    color: colors.textSecondary,
  },
};
