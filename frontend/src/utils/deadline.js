import { colors } from '../styles/colors';

export function getDeadlineUrgency(deadlineStr) {
  if (!deadlineStr) return null;

  const deadline = new Date(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return {
      level: 'expired',
      color: colors.secondaryLight,
      bgColor: '#F1F5F9',
      label: '期限切れ',
      days: daysUntil,
    };
  } else if (daysUntil <= 3) {
    return {
      level: 'urgent',
      color: colors.urgent,
      bgColor: '#FEF2F2',
      label: '緊急',
      days: daysUntil,
    };
  } else if (daysUntil <= 7) {
    return {
      level: 'approaching',
      color: colors.warning,
      bgColor: '#FFF7ED',
      label: '期限接近',
      days: daysUntil,
    };
  } else {
    return {
      level: 'normal',
      color: colors.normal,
      bgColor: '#F0FDF4',
      label: '余裕あり',
      days: daysUntil,
    };
  }
}

export function formatDeadline(deadlineStr) {
  if (!deadlineStr) return '-';

  const urgency = getDeadlineUrgency(deadlineStr);
  const dateStr = new Date(deadlineStr).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  if (urgency.days === 0) {
    return `${dateStr} (今日)`;
  } else if (urgency.days === 1) {
    return `${dateStr} (明日)`;
  } else if (urgency.days > 0 && urgency.days <= 7) {
    return `${dateStr} (あと${urgency.days}日)`;
  } else {
    return dateStr;
  }
}
