import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Trophy, CheckCircle, XCircle, Calculator } from 'lucide-react';
import API from '../api';

export default function Evaluate() {
  const { tenderId } = useParams();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);

  const [bidForm, setBidForm] = useState({
    bidder_id: '',
    total_price: '',
    functionality_score: '',
    psira_compliant: true
  });

  const fetchData = async () => {
    try {
      const [tenderRes, bidsRes, evalRes, biddersRes] = await Promise.all([
        axios.get(`${API}/tenders/${tenderId}`),
        axios.get(`${API}/tenders/${tenderId}/bids`),
        axios.get(`${API}/evaluations/${tenderId}`),
        axios.get(`${API}/bidders`)
      ]);
      setTender(tenderRes.data);
      setBids(bidsRes.data);
      setEvaluations(evalRes.data);
      setBidders(biddersRes.data);
    } catch (err) {
      console.error('Error fetching evaluate data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenderId]);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBid(true);
    try {
      await axios.post(`${API}/tenders/${tenderId}/bids`, bidForm);
      setBidForm({ bidder_id: '', total_price: '', functionality_score: '', psira_compliant: true });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await axios.post(`${API}/evaluations/${tenderId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!tender) return <div>Tender not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="glass-card" style={{ padding: '30px' }}>
        <h1 className="page-title" style={{ marginBottom: '8px' }}>{tender.title}</h1>
        <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)' }}>
          <span className="badge badge-primary">{tender.reference_number}</span>
          <span>System: <strong>{tender.system_type}</strong></span>
          <span>Min Functionality: <strong>{tender.min_functionality_score}%</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Submit New Bid</h2>
          <div className="glass-card">
            <form onSubmit={handleBidSubmit}>
              <div className="form-group">
                <label>Select Bidder</label>
                <select 
                  required 
                  value={bidForm.bidder_id} 
                  onChange={e => setBidForm({...bidForm, bidder_id: e.target.value})}
                >
                  <option value="">-- Choose Registered Bidder --</option>
                  {bidders.map(b => (
                    <option key={b.id} value={b.id}>{b.company_name} (Level {b.bbbee_level})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Total Price (ZAR)</label>
                <input 
                  type="number" 
                  required 
                  min="0" 
                  step="0.01"
                  value={bidForm.total_price} 
                  onChange={e => setBidForm({...bidForm, total_price: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Functionality Score (%)</label>
                <input 
                  type="number" 
                  required 
                  min="0" 
                  max="100"
                  value={bidForm.functionality_score} 
                  onChange={e => setBidForm({...bidForm, functionality_score: e.target.value})} 
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="psiraCheck"
                  checked={bidForm.psira_compliant}
                  onChange={e => setBidForm({...bidForm, psira_compliant: e.target.checked})}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="psiraCheck" style={{ margin: 0 }}>Meets PSIRA minimum wage framework</label>
              </div>

              <button type="submit" className="btn" style={{ width: '100%' }} disabled={submittingBid}>
                {submittingBid ? 'Submitting...' : 'Submit Bid'}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Evaluation Matrix based on {tender.system_type}</h2>
            <button className="btn btn-success" onClick={handleEvaluate} disabled={evaluating || bids.length === 0}>
              <Calculator size={18} /> {evaluating ? 'Calculating...' : 'Run Mathematical Evaluation'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
                <tr>
                  <th>Rank</th>
                  <th>Company</th>
                  <th>Price (ZAR)</th>
                  <th>Points (Price+BBBEE)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length > 0 ? (
                  evaluations.map((ev, idx) => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: ev.rank === 1 ? 'rgba(16, 185, 129, 0.05)' : 'none' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: ev.rank === 1 ? 'var(--success)' : 'inherit' }}>
                        {ev.rank === 1 && <Trophy size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />}
                        {ev.rank ? `#${ev.rank}` : '-'}
                      </td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>
                        {ev.company_name}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Level {ev.bbbee_level}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        R {Number(ev.total_price).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {ev.disqualified ? '-' : (
                          <>
                            <div style={{ fontWeight: 'bold' }}>{ev.total_score}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Ps: {ev.price_score} + BE: {ev.bbbee_score}
                            </div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {ev.disqualified ? (
                           <span className="badge badge-danger" title={ev.disqualification_reason}>
                             <XCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Disqualified
                           </span>
                        ) : (
                           <span className="badge badge-success">
                             <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Compliant
                           </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : bids.length > 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Calculator size={32} style={{ marginBottom: 12, opacity: 0.5 }} /><br/>
                      {bids.length} bids registered. Click 'Run Evaluation' to calculate rankings.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No bids submitted yet for this tender.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
