import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import API from '../api';

const steps = ['Tender Details', 'Register Bidder'];

export default function InitialDataEntry() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const [bidders, setBidders] = useState([]);

  const [tenderForm, setTenderForm] = useState({
    title: '', reference_number: '', closing_date: '',
    system_type: '80/20', min_functionality_score: 70
  });

  const [bidderForm, setBidderForm] = useState({
    company_name: '', registration_number: '', psira_number: '', bbbee_level: 1
  });

  const fetchBidders = async () => {
    const res = await axios.get(`${API}/bidders`);
    setBidders(res.data);
  };

  useEffect(() => { fetchBidders(); }, []);

  const handleTenderSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tenders`, tenderForm);
      setMsg('Tender created! You may now register bidders below.');
      setStep(1);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create tender');
    }
  };

  const handleBidderSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/bidders`, bidderForm);
      setBidderForm({ company_name: '', registration_number: '', psira_number: '', bbbee_level: 1 });
      setMsg('Bidder registered successfully!');
      fetchBidders();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to register bidder');
    }
  };

  return (
    <div className="page-shell">
      <div style={{ width: '100%', maxWidth: 760 }}>
        <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to Menu</button>

        <h1 className="section-title">Initial Data Entry</h1>
        <p className="section-subtitle">Create the tender and register all participating security companies.</p>

        {/* Stepper */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: step === i ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                color: step === i ? 'white' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s'
              }}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`alert ${msg.includes('success') || msg.includes('created') ? 'alert-success' : 'alert-danger'}`}>
            {msg}
          </div>
        )}

        {/* Step 1: Tender */}
        {step === 0 && (
          <div className="glass-card">
            <form onSubmit={handleTenderSubmit}>
              <div className="form-group">
                <label>Tender Title</label>
                <input type="text" required value={tenderForm.title}
                  onChange={e => setTenderForm({ ...tenderForm, title: e.target.value })}
                  placeholder="e.g. Guarding Services 2026" />
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input type="text" required value={tenderForm.reference_number}
                  onChange={e => setTenderForm({ ...tenderForm, reference_number: e.target.value })}
                  placeholder="e.g. SEC-2026-001" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Closing Date</label>
                  <input type="datetime-local" required value={tenderForm.closing_date}
                    onChange={e => setTenderForm({ ...tenderForm, closing_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>PPPFA System</label>
                  <select value={tenderForm.system_type}
                    onChange={e => setTenderForm({ ...tenderForm, system_type: e.target.value })}>
                    <option value="80/20">80/20 (Under R50M)</option>
                    <option value="90/10">90/10 (Above R50M)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Minimum Functionality Score (%)</label>
                <input type="number" required min="1" max="100" value={tenderForm.min_functionality_score}
                  onChange={e => setTenderForm({ ...tenderForm, min_functionality_score: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-block">Create Tender & Continue →</button>
            </form>
          </div>
        )}

        {/* Step 2: Bidder */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-card">
              <h3 style={{ marginBottom: 20, color: 'var(--primary)', fontWeight: 700 }}>Register Security Company</h3>
              <form onSubmit={handleBidderSubmit}>
                <div className="form-group"><label>Company Name</label><input type="text" required value={bidderForm.company_name} onChange={e => setBidderForm({ ...bidderForm, company_name: e.target.value })} /></div>
                <div className="form-group"><label>Registration Number</label><input type="text" required value={bidderForm.registration_number} onChange={e => setBidderForm({ ...bidderForm, registration_number: e.target.value })} /></div>
                <div className="form-group"><label>PSIRA Number</label><input type="text" required value={bidderForm.psira_number} onChange={e => setBidderForm({ ...bidderForm, psira_number: e.target.value })} /></div>
                <div className="form-group">
                  <label>B-BBEE Level</label>
                  <select value={bidderForm.bbbee_level} onChange={e => setBidderForm({ ...bidderForm, bbbee_level: e.target.value })}>
                    {[1,2,3,4,5,6,7,8].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-block">Register Company</button>
              </form>
            </div>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 10px', borderBottom: '1px solid var(--border)' }}>
                <strong>Registered Companies ({bidders.length})</strong>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 360 }}>
                {bidders.length === 0 ? (
                  <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>No companies registered yet.</p>
                ) : bidders.map(b => (
                  <div key={b.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.company_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PSIRA: {b.psira_number} · B-BBEE: Level {b.bbbee_level}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
