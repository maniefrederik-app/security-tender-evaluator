import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Trash2, ArrowLeft, Users, CheckCircle } from 'lucide-react';
import './Evaluators.css';

import API from '../api.js';

export default function Evaluators() {
  const navigate = useNavigate();

  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState('');
  const [evaluators, setEvaluators] = useState([]);
  const [form, setForm] = useState({ name: '', designation: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Load tenders on mount
  useEffect(() => {
    axios.get(`${API}/tenders`).then(res => {
      setTenders(res.data);
      if (res.data.length > 0) setSelectedTender(String(res.data[0].id));
    }).catch(() => setError('Could not load tenders.'));
  }, []);

  // Load evaluators when tender changes
  useEffect(() => {
    if (!selectedTender) return;
    axios.get(`${API}/evaluators?tender_id=${selectedTender}`)
      .then(res => setEvaluators(res.data))
      .catch(() => setEvaluators([]));
  }, [selectedTender]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await axios.post(`${API}/evaluators`, { tender_id: selectedTender, ...form });
      setEvaluators(prev => [...prev, res.data]);
      setForm({ name: '', designation: '', email: '' });
      setSuccess(`${res.data.name} registered successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from this panel?`)) return;
    try {
      await axios.delete(`${API}/evaluators/${id}`);
      setEvaluators(prev => prev.filter(e => e.id !== id));
    } catch {
      setError('Failed to remove evaluator.');
    }
  };

  const selectedTenderObj = tenders.find(t => String(t.id) === selectedTender);

  return (
    <div className="ev-shell">
      <div className="ev-wrapper">
        {/* Header */}
        <div className="ev-header">
          <div>
            <button className="back-link" onClick={() => navigate('/')}>
              <ArrowLeft size={16} /> Back to Menu
            </button>
            <h1 className="ev-title"><Users size={24} /> Evaluator Panel</h1>
            <p className="ev-sub">Register evaluators for a tender. Each evaluator scores independently; results are averaged for the final assessment.</p>
          </div>
          <img src="/logo111.png" alt="Logo" className="ev-logo" />
        </div>

        {/* Tender Selector */}
        <div className="glass-card ev-card">
          <label className="ev-label">Select Tender</label>
          {tenders.length === 0 ? (
            <p className="ev-empty">No tenders found. <button className="link-btn" onClick={() => navigate('/initial-data')}>Create one first.</button></p>
          ) : (
            <select
              className="ev-select"
              value={selectedTender}
              onChange={e => setSelectedTender(e.target.value)}
            >
              {tenders.map(t => (
                <option key={t.id} value={t.id}>{t.reference_number} — {t.title}</option>
              ))}
            </select>
          )}
          {selectedTenderObj && (
            <div className="ev-tender-info">
              <span>📋 {selectedTenderObj.title}</span>
              <span>Ref: {selectedTenderObj.reference_number}</span>
              <span>System: {selectedTenderObj.system_type}</span>
              <span>Closing: {new Date(selectedTenderObj.closing_date).toLocaleDateString('en-ZA')}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error" style={{marginBottom: 16}}>{error}</div>}
        {success && <div className="alert alert-success" style={{marginBottom: 16}}><CheckCircle size={16}/> {success}</div>}

        <div className="ev-grid">
          {/* Registration form */}
          <div className="glass-card ev-card">
            <h2 className="ev-section-heading"><UserPlus size={18} /> Register Evaluator</h2>
            <form onSubmit={handleAdd} className="ev-form">
              <div className="ev-field">
                <label className="ev-label">Full Name *</label>
                <input
                  type="text" className="ev-input" placeholder="e.g. Thabo Nkosi"
                  value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required
                />
              </div>
              <div className="ev-field">
                <label className="ev-label">Designation</label>
                <input
                  type="text" className="ev-input" placeholder="e.g. Supply Chain Manager"
                  value={form.designation} onChange={e => setForm(p => ({...p, designation: e.target.value}))}
                />
              </div>
              <div className="ev-field">
                <label className="ev-label">Email Address *</label>
                <input
                  type="email" className="ev-input" placeholder="evaluator@entity.gov.za"
                  value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required
                />
              </div>
              <button type="submit" className="btn" disabled={loading || !selectedTender}>
                <UserPlus size={16} />
                {loading ? 'Registering...' : 'Register Evaluator'}
              </button>
            </form>
          </div>

          {/* Evaluators list */}
          <div className="glass-card ev-card">
            <h2 className="ev-section-heading"><Users size={18} /> Panel Members ({evaluators.length})</h2>
            {evaluators.length === 0 ? (
              <div className="ev-empty-panel">
                <Users size={36} opacity={0.2}/>
                <p>No evaluators registered for this tender yet.</p>
              </div>
            ) : (
              <div className="ev-list">
                {evaluators.map((ev, i) => (
                  <div key={ev.id} className="ev-item">
                    <div className="ev-avatar">{ev.name.charAt(0).toUpperCase()}</div>
                    <div className="ev-info">
                      <span className="ev-name">{ev.name}</span>
                      <span className="ev-detail">{ev.designation || '—'}</span>
                      <span className="ev-detail">{ev.email}</span>
                    </div>
                    <div className="ev-actions-col">
                      <span className="ev-badge">#{i + 1}</span>
                      <button className="ev-delete-btn" onClick={() => handleDelete(ev.id, ev.name)} title="Remove evaluator">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions card */}
        {evaluators.length > 0 && (
          <div className="glass-card ev-card ev-instructions">
            <h3 className="ev-section-heading" style={{marginBottom: 10}}>How Evaluator Scoring Works</h3>
            <div className="ev-steps">
              {[
                { n: '1', t: 'Each evaluator logs in by selecting their name from the assessment sections' },
                { n: '2', t: 'They score each criterion independently using the compliance-level matrix' },
                { n: '3', t: 'All individual scores are stored separately in the database' },
                { n: '4', t: 'The Consolidated View shows the average weighted score per criterion' },
                { n: '5', t: 'The Summary Report uses consolidated averages for the final PPPFA ranking' },
              ].map(s => (
                <div key={s.n} className="ev-step">
                  <span className="ev-step-num">{s.n}</span>
                  <span className="ev-step-text">{s.t}</span>
                </div>
              ))}
            </div>
            <div className="ev-navigate-btns">
              <button className="btn" onClick={() => navigate('/assess/guarding')}>Start Assessing →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
