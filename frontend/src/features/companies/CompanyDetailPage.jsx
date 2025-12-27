import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { companyApi } from './companyApi';
import { esApi } from '../es/esApi';
import { colors } from '../../styles/colors';
import { STATUS_TEMPLATES, parseStatusData, stringifyStatusData } from '../../utils/status';

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [esVersions, setEsVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddES, setShowAddES] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [companyData, esData] = await Promise.all([
        companyApi.get(id),
        esApi.listByCompany(id),
      ]);
      setCompany(companyData);
      setEsVersions(esData);
    } catch (err) {
      setError('企業情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この企業とすべてのES版を削除しますか？')) return;

    try {
      await companyApi.delete(id);
      navigate('/');
    } catch (err) {
      setError('企業の削除に失敗しました');
    }
  };

  if (loading) return <div style={styles.loading}>読み込み中...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!company) return <div style={styles.error}>企業が見つかりません</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={styles.backLink}>← 企業一覧に戻る</Link>
      </div>

      <div style={styles.content}>
        <div style={styles.companySection}>
          <div style={styles.companyHeader}>
            <h1 style={styles.companyTitle}>{company.name}</h1>
            <div style={styles.companyActions}>
              <button onClick={() => setShowEditForm(true)} style={styles.editButton}>
                編集
              </button>
              <button onClick={handleDelete} style={styles.deleteButton}>
                削除
              </button>
            </div>
          </div>

          <div style={styles.companyDetails}>
            {company.job_role && <p><strong>職種:</strong> {company.job_role}</p>}
            {company.apply_route && <p><strong>応募経路:</strong> {company.apply_route}</p>}
            {company.deadline && (
              <p><strong>締切:</strong> {new Date(company.deadline).toLocaleDateString()}</p>
            )}

            {/* Status Display */}
            <div style={{marginTop: '12px'}}>
              <strong>選考ステータス:</strong>
              <StatusDisplay statusText={company.status_text} />
            </div>

            {company.memo && <p><strong>メモ:</strong> {company.memo}</p>}
          </div>
        </div>

        <div style={styles.esSection}>
          <div style={styles.esHeader}>
            <h2 style={styles.esTitle}>ES版履歴</h2>
            <button onClick={() => setShowAddES(true)} style={styles.addButton}>
              + ES版を追加
            </button>
          </div>

          {esVersions.length === 0 ? (
            <p style={styles.empty}>まだES版が登録されていません</p>
          ) : (
            <div style={styles.esGrid}>
              {esVersions.map((es) => (
                <ESCard key={es.id} es={es} onUpdate={loadData} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditForm && (
        <EditCompanyForm
          company={company}
          onClose={() => setShowEditForm(false)}
          onUpdate={() => {
            setShowEditForm(false);
            loadData();
          }}
        />
      )}

      {showAddES && (
        <AddESForm
          companyId={id}
          onClose={() => setShowAddES(false)}
          onAdd={() => {
            setShowAddES(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ESCard({ es, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);

  const handleDelete = async () => {
    if (!confirm('このES版を削除しますか？')) return;

    try {
      await esApi.delete(es.id);
      onUpdate();
    } catch (err) {
      alert('ES版の削除に失敗しました');
    }
  };

  return (
    <div style={styles.esCard}>
      <div style={styles.esCardHeader}>
        <span style={styles.esDate}>
          {es.submitted_at ? new Date(es.submitted_at).toLocaleDateString() : '未提出'}
        </span>
        <div style={styles.esActions}>
          <button onClick={() => setShowEdit(true)} style={styles.esEditButton}>
            編集
          </button>
          <button onClick={handleDelete} style={styles.esDeleteButton}>
            削除
          </button>
        </div>
      </div>
      {es.submitted_via && <p style={styles.esDetail}>提出経路: {es.submitted_via}</p>}
      <p style={styles.esResult}>
        結果: <span style={getResultStyle(es.result)}>{getResultText(es.result)}</span>
      </p>
      {es.memo && <p style={styles.esMemo}>{es.memo}</p>}
      {es.file && (
        <p style={styles.esFile}>
          <a href={es.file} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
            📎 添付ファイル
          </a>
        </p>
      )}

      {showEdit && (
        <EditESForm
          es={es}
          onClose={() => setShowEdit(false)}
          onUpdate={() => {
            setShowEdit(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function getResultStyle(result) {
  const colors = {
    PASS: { color: '#28a745' },
    FAIL: { color: '#dc3545' },
    UNKNOWN: { color: '#6c757d' },
  };
  return colors[result] || colors.UNKNOWN;
}

function getResultText(result) {
  const texts = {
    PASS: '合格',
    FAIL: '不合格',
    UNKNOWN: '不明',
  };
  return texts[result] || texts.UNKNOWN;
}

function StatusDisplay({ statusText }) {
  const statusData = parseStatusData(statusText);

  const activeTemplate = STATUS_TEMPLATES.find(
    template => statusData.statuses[template.id]
  );

  if (!activeTemplate) {
    return <span style={{color: '#999', fontSize: '14px'}}> 未設定</span>;
  }

  return (
    <div style={{marginTop: '8px'}}>
      <div style={{marginBottom: '4px', fontSize: '14px'}}>
        <span style={{color: '#007bff', marginRight: '8px'}}>✓</span>
        <span>{activeTemplate.label}</span>
        {activeTemplate.hasState && (
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            backgroundColor: statusData.statuses[activeTemplate.id] === '済' ? '#d4edda' : '#fff3cd',
            color: statusData.statuses[activeTemplate.id] === '済' ? '#155724' : '#856404',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            {statusData.statuses[activeTemplate.id]}
          </span>
        )}
        {activeTemplate.allowCustom && statusData.statuses[activeTemplate.id + '_custom'] && (
          <span style={{marginLeft: '8px', color: '#666', fontSize: '13px'}}>
            ({statusData.statuses[activeTemplate.id + '_custom']})
          </span>
        )}
        {activeTemplate.id === 'offer' && (
          <span style={{marginLeft: '8px', fontWeight: 'bold'}}>🎉</span>
        )}
      </div>
    </div>
  );
}

function EditCompanyForm({ company, onClose, onUpdate }) {
  const initialStatusData = parseStatusData(company.status_text);

  const [formData, setFormData] = useState({
    name: company.name,
    job_role: company.job_role || '',
    apply_route: company.apply_route || '',
    deadline: company.deadline || '',
    memo: company.memo || '',
  });
  const [statusData, setStatusData] = useState(initialStatusData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await companyApi.update(company.id, {
        ...formData,
        deadline: formData.deadline || null,
        status_text: stringifyStatusData(statusData),
      });
      onUpdate();
    } catch (err) {
      setError('企業情報の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (templateId, value) => {
    setStatusData(prev => {
      // Clear all other statuses (exclusive selection)
      const newStatuses = {};
      if (value && value !== '' && value !== null && value !== undefined) {
        newStatuses[templateId] = value;
        // Keep custom text for "other" if it exists
        if (templateId === 'other' && prev.statuses.other_custom) {
          newStatuses.other_custom = prev.statuses.other_custom;
        }
      }
      return {
        statuses: newStatuses,
      };
    });
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>企業情報を編集</h3>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="企業名 *"
            required
            style={styles.input}
          />
          <input
            type="text"
            value={formData.job_role}
            onChange={(e) => setFormData({...formData, job_role: e.target.value})}
            placeholder="職種"
            style={styles.input}
          />
          <input
            type="text"
            value={formData.apply_route}
            onChange={(e) => setFormData({...formData, apply_route: e.target.value})}
            placeholder="応募経路"
            style={styles.input}
          />
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({...formData, deadline: e.target.value})}
            style={styles.input}
          />

          {/* Status Templates */}
          <div style={styles.statusSection}>
            <label style={styles.label}>選考ステータス（いずれか一つを選択）</label>
            {STATUS_TEMPLATES.map(template => (
              <div key={template.id} style={styles.statusRow}>
                <span style={styles.statusLabel}>{template.label}</span>
                {template.hasState ? (
                  <div style={styles.statusCheckboxes}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={statusData.statuses[template.id] === '予約'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateStatus(template.id, '予約');
                          } else {
                            updateStatus(template.id, '');
                          }
                        }}
                        style={styles.checkbox}
                      />
                      <span>予約</span>
                    </label>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={statusData.statuses[template.id] === '済'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateStatus(template.id, '済');
                          } else {
                            updateStatus(template.id, '');
                          }
                        }}
                        style={styles.checkbox}
                      />
                      <span>済</span>
                    </label>
                  </div>
                ) : (
                  <div style={styles.statusCheckboxes}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!statusData.statuses[template.id]}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateStatus(template.id, '済');
                          } else {
                            updateStatus(template.id, '');
                          }
                        }}
                        style={styles.checkbox}
                      />
                      <span style={{fontWeight: '600'}}>選択</span>
                    </label>
                  </div>
                )}
                {template.allowCustom && statusData.statuses[template.id] && (
                  <input
                    type="text"
                    value={statusData.statuses.other_custom || ''}
                    onChange={(e) => {
                      setStatusData(prev => ({
                        statuses: {
                          ...prev.statuses,
                          other_custom: e.target.value,
                        },
                      }));
                    }}
                    placeholder="詳細を入力"
                    style={{...styles.input, marginTop: '8px'}}
                  />
                )}
              </div>
            ))}
          </div>

          <textarea
            value={formData.memo}
            onChange={(e) => setFormData({...formData, memo: e.target.value})}
            placeholder="メモ"
            style={{...styles.input, minHeight: '80px'}}
          />
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddESForm({ companyId, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    body: '',
    submitted_at: '',
    submitted_via: '',
    result: 'UNKNOWN',
    memo: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('company', parseInt(companyId));
      data.append('body', formData.body);
      data.append('submitted_at', formData.submitted_at || '');
      data.append('submitted_via', formData.submitted_via);
      data.append('result', formData.result);
      data.append('memo', formData.memo);
      if (file) {
        data.append('file', file);
      }

      await esApi.create(data);
      onAdd();
    } catch (err) {
      setError('ES版の作成に失敗しました');
    } finally{
      setLoading(false);
    }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>ES版を追加</h3>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            placeholder="ES本文"
            style={{...styles.input, minHeight: '150px'}}
          />
          <input
            type="date"
            value={formData.submitted_at}
            onChange={(e) => setFormData({...formData, submitted_at: e.target.value})}
            placeholder="提出日"
            style={styles.input}
          />
          <input
            type="text"
            value={formData.submitted_via}
            onChange={(e) => setFormData({...formData, submitted_via: e.target.value})}
            placeholder="提出経路"
            style={styles.input}
          />
          <select
            value={formData.result}
            onChange={(e) => setFormData({...formData, result: e.target.value})}
            style={styles.input}
          >
            <option value="UNKNOWN">不明</option>
            <option value="PASS">合格</option>
            <option value="FAIL">不合格</option>
          </select>
          <textarea
            value={formData.memo}
            onChange={(e) => setFormData({...formData, memo: e.target.value})}
            placeholder="メモ"
            style={{...styles.input, minHeight: '60px'}}
          />
          <div style={styles.fileInput}>
            <label style={styles.fileLabel}>
              ファイル添付
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                style={styles.fileInputHidden}
              />
            </label>
            {file && <span style={styles.fileName}>{file.name}</span>}
          </div>
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

function EditESForm({ es, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    body: es.body || '',
    submitted_at: es.submitted_at || '',
    submitted_via: es.submitted_via || '',
    result: es.result,
    memo: es.memo || '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('company', es.company);
      data.append('body', formData.body);
      data.append('submitted_at', formData.submitted_at || '');
      data.append('submitted_via', formData.submitted_via);
      data.append('result', formData.result);
      data.append('memo', formData.memo);
      if (file) {
        data.append('file', file);
      }

      await esApi.update(es.id, data);
      onUpdate();
    } catch (err) {
      setError('ES版の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>ES版を編集</h3>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            placeholder="ES本文"
            style={{...styles.input, minHeight: '150px'}}
          />
          <input
            type="date"
            value={formData.submitted_at}
            onChange={(e) => setFormData({...formData, submitted_at: e.target.value})}
            style={styles.input}
          />
          <input
            type="text"
            value={formData.submitted_via}
            onChange={(e) => setFormData({...formData, submitted_via: e.target.value})}
            placeholder="提出経路"
            style={styles.input}
          />
          <select
            value={formData.result}
            onChange={(e) => setFormData({...formData, result: e.target.value})}
            style={styles.input}
          >
            <option value="UNKNOWN">不明</option>
            <option value="PASS">合格</option>
            <option value="FAIL">不合格</option>
          </select>
          <textarea
            value={formData.memo}
            onChange={(e) => setFormData({...formData, memo: e.target.value})}
            placeholder="メモ"
            style={{...styles.input, minHeight: '60px'}}
          />
          <div style={styles.fileInput}>
            <label style={styles.fileLabel}>
              ファイル添付
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                style={styles.fileInputHidden}
              />
            </label>
            {file && <span style={styles.fileName}>{file.name}</span>}
            {!file && es.file && <span style={styles.fileName}>現在: 添付ファイルあり</span>}
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '16px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  backLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '14px',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
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
  companySection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  companyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  companyTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  companyActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  companyDetails: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.8',
  },
  esSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
  },
  esHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  esTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  esGrid: {
    display: 'grid',
    gap: '16px',
  },
  esCard: {
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  esCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  esDate: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  esActions: {
    display: 'flex',
    gap: '8px',
  },
  esEditButton: {
    padding: '4px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  esDeleteButton: {
    padding: '4px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  esDetail: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '4px',
  },
  esResult: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '4px',
  },
  esMemo: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
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
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  fileInput: {
    marginTop: '8px',
    marginBottom: '8px',
  },
  fileLabel: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#333',
  },
  fileInputHidden: {
    display: 'none',
  },
  fileName: {
    marginLeft: '12px',
    fontSize: '13px',
    color: '#666',
  },
  esFile: {
    fontSize: '13px',
    color: '#666',
    marginTop: '8px',
  },
  fileLink: {
    color: '#007bff',
    textDecoration: 'none',
  },
  statusSection: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e9ecef',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#333',
    minWidth: '120px',
  },
  statusCheckboxes: {
    display: 'flex',
    gap: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#555',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
};
