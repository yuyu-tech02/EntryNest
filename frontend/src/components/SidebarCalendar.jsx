import { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { colors } from '../styles/colors';

export default function SidebarCalendar({ companies }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [year, month]);

  // Get deadlines for the current month
  const deadlinesMap = useMemo(() => {
    const map = {};
    companies.forEach(company => {
      if (!company.deadline) return;

      const deadline = new Date(company.deadline);
      if (deadline.getFullYear() === year && deadline.getMonth() === month) {
        const day = deadline.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(company);
      }
    });
    return map;
  }, [companies, year, month]);

  // Check if a day is today
  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
  };

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                      '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={goToPrevMonth} style={styles.navButton}>
          <FiChevronLeft size={16} />
        </button>
        <div style={styles.monthYear}>
          {year}年 {monthNames[month]}
        </div>
        <button onClick={goToNextMonth} style={styles.navButton}>
          <FiChevronRight size={16} />
        </button>
      </div>

      <button onClick={goToToday} style={styles.todayButton}>
        今日
      </button>

      <div style={styles.weekdays}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div key={index} style={styles.weekday}>
            {day}
          </div>
        ))}
      </div>

      <div style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          const hasDeadline = day && deadlinesMap[day];
          const today = isToday(day);

          return (
            <div
              key={index}
              style={{
                ...styles.dayCell,
                ...(today ? styles.todayCell : {}),
                ...(hasDeadline ? styles.deadlineCell : {}),
                ...(day ? {} : styles.emptyCell),
              }}
              title={hasDeadline ? `${hasDeadline.length}件の締切: ${hasDeadline.map(c => c.name).join(', ')}` : ''}
            >
              {day && (
                <span style={styles.dayNumber}>{day}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Show deadlines for the current month */}
      {Object.keys(deadlinesMap).length > 0 && (
        <div style={styles.deadlineList}>
          <div style={styles.deadlineListTitle}>今月の締切</div>
          {Object.entries(deadlinesMap)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .slice(0, 3)
            .map(([day, companies]) => (
              <div key={day} style={styles.deadlineItem}>
                <span style={styles.deadlineDay}>{day}日</span>
                <span style={styles.deadlineCompany}>
                  {companies.map(c => c.name).join(', ')}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    backgroundColor: colors.surface,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  navButton: {
    width: '28px',
    height: '28px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  monthYear: {
    fontSize: '15px',
    fontWeight: '700',
    color: colors.text,
  },
  todayButton: {
    width: '100%',
    padding: '6px',
    marginBottom: '12px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.primary,
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  weekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '4px',
  },
  weekday: {
    fontSize: '11px',
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    padding: '6px 0',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayCell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: colors.text,
    borderRadius: '10px',
    cursor: 'default',
    position: 'relative',
    transition: 'all 0.2s',
    fontWeight: '600',
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#EEF2FF',
    color: colors.primary,
    fontWeight: '800',
    border: `3px solid ${colors.primary}`,
    fontSize: '20px',
  },
  deadlineCell: {
    backgroundColor: '#FEF3C7',
    fontWeight: '800',
    border: '3px solid #F59E0B',
    boxShadow: '0 3px 6px rgba(245, 158, 11, 0.3)',
    fontSize: '20px',
  },
  dayNumber: {
    fontSize: 'inherit',
  },
  deadlineList: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.border}`,
  },
  deadlineListTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: colors.text,
    marginBottom: '10px',
  },
  deadlineItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '12px',
    padding: '6px 8px',
    backgroundColor: '#FFFBEB',
    borderRadius: '6px',
    border: '1px solid #FEF3C7',
  },
  deadlineDay: {
    fontWeight: '700',
    color: '#F59E0B',
    minWidth: '32px',
    fontSize: '13px',
  },
  deadlineCompany: {
    color: colors.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
};
