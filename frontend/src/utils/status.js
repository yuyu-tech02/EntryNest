// Status template definitions
export const STATUS_TEMPLATES = [
  { id: 'briefing', label: '企業説明会', hasState: true },
  { id: 'es', label: 'ES提出', hasState: true },
  { id: 'first', label: '一次面接', hasState: true },
  { id: 'second', label: '二次面接', hasState: true },
  { id: 'final', label: '最終面接', hasState: true },
  { id: 'other', label: 'その他', hasState: true, allowCustom: true },
  { id: 'offer', label: '内定', hasState: false },
];

// Parse status_text (JSON or legacy plain text)
export const parseStatusData = (statusText) => {
  if (!statusText) {
    return { statuses: {} };
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(statusText);
    if (parsed && typeof parsed === 'object') {
      // Handle legacy format with separate "offer" field
      if (parsed.offer) {
        return { statuses: { offer: '済' } };
      }
      return {
        statuses: parsed.statuses || {},
      };
    }
  } catch (e) {
    // Not JSON, treat as legacy plain text
  }

  // Legacy format - return as plain text in "other" field
  return {
    statuses: { other: statusText.includes('内定') ? '' : statusText, ...(statusText.includes('内定') ? { offer: '済' } : {}) },
  };
};

// Convert status data to JSON string for storage
export const stringifyStatusData = (statusData) => {
  return JSON.stringify({
    statuses: statusData.statuses || {},
  });
};

// Check if company has offer
export const hasOffer = (statusText) => {
  const statusData = parseStatusData(statusText);
  return !!statusData.statuses.offer;
};

// Check if company has interview status
export const hasInterview = (statusText) => {
  const statusData = parseStatusData(statusText);
  return !!(
    statusData.statuses.first ||
    statusData.statuses.second ||
    statusData.statuses.final
  );
};

// Check if company is in progress (has any status but not offer)
export const isInProgress = (statusText) => {
  const statusData = parseStatusData(statusText);
  if (statusData.statuses.offer) return false;
  return Object.keys(statusData.statuses).length > 0;
};

// Check if ES is pending (no status or ES not submitted)
export const isPendingES = (statusText) => {
  const statusData = parseStatusData(statusText);
  const esStatus = statusData.statuses.es;
  // Pending if no status at all, or ES status is "予約" (not "済")
  return !statusText || !esStatus || esStatus === '予約';
};

// Format status for display (short version for cards)
export const formatStatusShort = (statusText) => {
  if (!statusText) return '';

  const statusData = parseStatusData(statusText);

  // Check offer first
  if (statusData.statuses.offer) {
    return '内定';
  }

  // Check if this is legacy data (plain text stored in 'other')
  if (statusData.statuses.other &&
      Object.keys(statusData.statuses).length === 1 &&
      !['予約', '済'].includes(statusData.statuses.other)) {
    // This is legacy plain text, return as-is
    return statusData.statuses.other;
  }

  // Get the active status (should only be one now)
  const activeTemplate = STATUS_TEMPLATES.find(
    template => statusData.statuses[template.id] && statusData.statuses[template.id] !== ''
  );

  if (!activeTemplate) {
    return '';
  }

  const status = statusData.statuses[activeTemplate.id];

  // For custom text in "other", show custom text with state
  if (activeTemplate.id === 'other' && activeTemplate.allowCustom && statusData.statuses.other_custom) {
    return `${statusData.statuses.other_custom}(${status})`;
  }

  // For status with state
  if (activeTemplate.hasState) {
    return `${activeTemplate.label}(${status})`;
  }

  // For status without state (like offer)
  return activeTemplate.label;
};
