import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { companyApi } from './companyApi';
import Dashboard from '../../components/Dashboard';
import { getDeadlineUrgency, formatDeadline } from '../../utils/deadline';
import { colors } from '../../styles/colors';
import { formatStatusShort, hasOffer, hasInterview, isPendingES } from '../../utils/status';

export default function CompanyListPage({ user }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companyApi.list('-updated_at');
      setCompanies(data);
    } catch (err) {
      setError('企業一覧の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(query) ||
        (company.job_role && company.job_role.toLowerCase().includes(query)) ||
        (company.apply_route && company.apply_route.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(company => {
        switch (filterStatus) {
          case 'offer':
            return hasOffer(company.status_text);
          case 'interview':
            return hasInterview(company.status_text);
          case 'pending':
            return isPendingES(company.status_text);
          case 'inProgress':
            return !hasOffer(company.status_text) && company.status_text;
          default:
            return true;
        }
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        case 'name':
          return a.name.localeCompare(b.name, 'ja');
        case 'updated':
        default:
          return new Date(b.updated_at) - new Date(a.updated_at);
      }
    });

    return sorted;
  }, [companies, searchQuery, filterStatus, sortBy]);

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>選考管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.addButton}
        >
          + 企業を追加
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <Dashboard companies={companies} />

      {/* Search and Filter */}
      <div style={styles.controlsContainer}>
        <div style={styles.searchContainer}>
          <FiSearch size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="企業名、職種、応募経路で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              ✕
            </button>
          )}
        </div>

        <div style={styles.filtersContainer}>
          <div style={styles.filterGroup}>
            <FiFilter size={16} style={styles.filterIcon} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">すべて</option>
              <option value="pending">ES未提出</option>
              <option value="inProgress">エントリー中</option>
              <option value="interview">面接中</option>
              <option value="offer">内定済</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>並び替え:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="updated">更新日時順</option>
              <option value="deadline">締切が近い順</option>
              <option value="name">企業名順</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {searchQuery || filterStatus !== 'all' ? (
        <div style={styles.resultsInfo}>
          {filteredCompanies.length}件の企業が見つかりました
          {searchQuery && ` (検索: "${searchQuery}")`}
        </div>
      ) : null}

      {showAddForm && (
        <AddCompanyForm
          onClose={() => setShowAddForm(false)}
          onAdd={() => {
            setShowAddForm(false);
            loadCompanies();
          }}
        />
      )}

      {companies.length === 0 ? (
        <div style={styles.empty}>
          <p>まだ企業が登録されていません。最初の企業を追加しましょう！</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div style={styles.empty}>
          <p>条件に一致する企業が見つかりませんでした。</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
            style={styles.resetButton}
          >
            検索条件をリセット
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company }) {
  const navigate = useNavigate();
  const urgency = getDeadlineUrgency(company.deadline);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const cardStyle = {
    ...styles.card,
    borderLeft: urgency ? `4px solid ${urgency.color}` : styles.card.borderLeft,
  };

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/companies/${company.id}`)}
    >
      <h3 style={styles.cardTitle}>{company.name}</h3>
      {company.job_role && <p style={styles.cardDetail}>職種: {company.job_role}</p>}
      {company.deadline && (
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
          {urgency && (
            <span style={{
              ...styles.urgencyBadge,
              backgroundColor: urgency.bgColor,
              color: urgency.color,
            }}>
              {urgency.label}
            </span>
          )}
          <p style={{...styles.cardDeadline, color: urgency?.color || styles.cardDeadline.color}}>
            締切: {formatDeadline(company.deadline)}
          </p>
        </div>
      )}
      {formatStatusShort(company.status_text) && (
        <p style={styles.cardStatus}>ステータス: {formatStatusShort(company.status_text)}</p>
      )}
      <p style={styles.cardDate}>更新: {formatDate(company.updated_at)}</p>
    </div>
  );
}

function AddCompanyForm({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [applyRoute, setApplyRoute] = useState('');
  const [deadline, setDeadline] = useState('');
  const [statusText, setStatusText] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await companyApi.create({
        name,
        job_role: jobRole,
        apply_route: applyRoute,
        deadline: deadline || null,
        status_text: statusText,
        memo,
      });
      onAdd();
    } catch (err) {
      setError('企業の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>企業を追加</h3>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="企業名 *"
            required
            style={styles.input}
          />
          <input
            type="text"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="職種"
            style={styles.input}
          />
          <input
            type="text"
            value={applyRoute}
            onChange={(e) => setApplyRoute(e.target.value)}
            placeholder="応募経路"
            style={styles.input}
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="締切日"
            style={styles.input}
          />
          <input
            type="text"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="ステータス"
            style={styles.input}
          />
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモ"
            style={{...styles.input, minHeight: '80px'}}
          />
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors.text,
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: colors.surface,
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: `4px solid ${colors.border}`,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '12px',
    fontFamily: "'Poppins', sans-serif",
  },
  cardDetail: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '6px',
    margin: 0,
  },
  cardDeadline: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
    margin: 0,
  },
  cardStatus: {
    fontSize: '14px',
    color: colors.info,
    marginBottom: '6px',
    margin: 0,
  },
  cardDate: {
    fontSize: '12px',
    color: colors.secondaryLight,
    marginTop: '12px',
    margin: 0,
  },
  urgencyBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '20px',
    color: colors.text,
    fontFamily: "'Poppins', sans-serif",
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '10px 14px',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.secondary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
  },
  controlsContainer: {
    marginBottom: '24px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.textSecondary,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 48px 12px 48px',
    border: `2px solid ${colors.border}`,
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: colors.surface,
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    border: 'none',
    backgroundColor: colors.textSecondary,
    color: 'white',
    borderRadius: '50%',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterIcon: {
    color: colors.textSecondary,
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textSecondary,
  },
  select: {
    padding: '8px 32px 8px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.surface,
    color: colors.text,
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  resultsInfo: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: '#EEF2FF',
    borderRadius: '6px',
    borderLeft: `3px solid ${colors.primary}`,
  },
  resetButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
