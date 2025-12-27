import { colors } from '../styles/colors';

export default function Dashboard({ companies }) {
  const calculateDaysUntil = (deadlineStr) => {
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  };

  const stats = {
    total: companies.length,
    withDeadline: companies.filter(c => c.deadline).length,
    urgent: companies.filter(c => {
      if (!c.deadline) return false;
      const daysUntil = calculateDaysUntil(c.deadline);
      return daysUntil >= 0 && daysUntil <= 3;
    }).length,
    approaching: companies.filter(c => {
      if (!c.deadline) return false;
      const daysUntil = calculateDaysUntil(c.deadline);
      return daysUntil > 3 && daysUntil <= 7;
    }).length,
  };

  const statCards = [
    {
      title: '総企業数',
      value: stats.total,
      color: colors.primary,
      bgColor: '#DBEAFE',
    },
    {
      title: '締切設定済み',
      value: stats.withDeadline,
      color: colors.info,
      bgColor: '#E0F2FE',
    },
    {
      title: '緊急 (3日以内)',
      value: stats.urgent,
      color: colors.urgent,
      bgColor: '#FEE2E2',
    },
    {
      title: '期限接近 (7日以内)',
      value: stats.approaching,
      color: colors.warning,
      bgColor: '#FED7AA',
    },
  ];

  return (
    <div style={styles.dashboard}>
      {statCards.map((stat, index) => (
        <div key={index} style={{...styles.card, backgroundColor: stat.bgColor}}>
          <div style={{...styles.cardTitle, color: colors.textSecondary}}>
            {stat.title}
          </div>
          <div style={{...styles.cardValue, color: stat.color}}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px',
    letterSpacing: '0.3px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
    fontFamily: "'Poppins', sans-serif",
  },
};
