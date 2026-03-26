import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AssessmentSection.css';
import { ArrowLeft, Save, Trophy } from 'lucide-react';

/**
 * Generic per-bidder assessment matrix used by all 4 section pages.
 * 
 * Props:
 *  - title: string  (e.g. "1. Guarding Personnel")
 *  - storageKey: string  (unique localStorage key for persisting scores)
 *  - criteria: Array<{ key, label, max }>
 */
export default function AssessmentSection({ title, storageKey, criteria }) {
  const navigate = useNavigate();
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // scores[bidderId][criteriaKey] = score (string)
  const [scores, setScores] = useState({});

  const maxTotal = criteria.reduce((a, c) => a + c.max, 0);

  // Load bidders + any previously saved scores from localStorage
  useEffect(() => {
    axios.get('' + API + '/bidders').then(res => {
      setBidders(res.data);
      // Seed scores state for each bidder
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const init = {};
      res.data.forEach(b => {
        init[b.id] = saved[b.id] || Object.fromEntries(criteria.map(c => [c.key, '']));
      });
      setScores(init);
    }).finally(() => setLoading(false));
  }, [storageKey]);

  const handleChange = (bidderId, criteriaKey, value) => {
    setScores(prev => ({
      ...prev,
      [bidderId]: { ...prev[bidderId], [criteriaKey]: value }
    }));
  };

  const totalFor = (bidderId) =>
    criteria.reduce((sum, c) => sum + (parseFloat(scores[bidderId]?.[c.key]) || 0), 0);

  const highestBidderId = bidders.length > 1
    ? bidders.reduce((best, b) => totalFor(b.id) > totalFor(best) ? b.id : best, bidders[0]?.id)
    : bidders[0]?.id;

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(scores));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="page-shell"><div style={{ padding: 40 }}>Loading bidders...</div></div>;

  if (bidders.length === 0) {
    return (
      <div className="page-shell">
        <div style={{ width: '100%', maxWidth: 700 }}>
          <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to Menu</button>
          <h1 className="section-title">{title}</h1>
          <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No bidders registered yet.</p>
            <button className="btn" onClick={() => navigate('/initial-data')}>Go to Initial Data Entry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to Menu</button>
        <h1 className="section-title">{title}</h1>
        <p className="section-subtitle">
          Enter each bidder's score per criterion (max per row shown on right). Green column = highest total.
        </p>

        {saved && <div className="alert alert-success">Scores saved successfully!</div>}

        <form onSubmit={handleSave}>
          <div className="assess-matrix-wrapper glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="assess-matrix-table">
                <thead>
                  <tr>
                    <th className="criteria-col">Criterion</th>
                    <th className="max-col" style={{ textAlign: 'center' }}>Max</th>
                    {bidders.map(b => (
                      <th key={b.id} className={`bidder-col ${b.id === highestBidderId ? 'top-bidder' : ''}`}>
                        {b.id === highestBidderId && <Trophy size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom', color: '#b45309' }} />}
                        <span title={b.company_name}>{b.company_name}</span>
                        <div className="bidder-sub">PSIRA: {b.psira_number} · B-BBEE Lvl {b.bbbee_level}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, idx) => (
                    <tr key={c.key} style={{ background: idx % 2 === 0 ? 'rgba(26,43,140,0.02)' : 'transparent' }}>
                      <td className="criteria-cell">{c.label}</td>
                      <td className="max-cell">{c.max}</td>
                      {bidders.map(b => {
                        const val = scores[b.id]?.[c.key] ?? '';
                        const num = parseFloat(val);
                        const over = !isNaN(num) && num > c.max;
                        return (
                          <td key={b.id} className={`score-cell ${b.id === highestBidderId ? 'top-bidder-cell' : ''}`}>
                            <input
                              type="number"
                              min="0"
                              max={c.max}
                              step="0.5"
                              value={val}
                              placeholder="—"
                              onChange={e => handleChange(b.id, c.key, e.target.value)}
                              style={{
                                border: over ? '2px solid var(--danger)' : undefined,
                                fontWeight: 600,
                                textAlign: 'center',
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td colSpan="2" className="total-label">TOTAL SCORE</td>
                    {bidders.map(b => {
                      const total = totalFor(b.id);
                      const pct = Math.round((total / maxTotal) * 100);
                      const isTop = b.id === highestBidderId;
                      return (
                        <td key={b.id} className={`total-cell ${isTop ? 'top-total' : ''}`}>
                          <div className="total-score">{total.toFixed(1)}<span className="total-max">/{maxTotal}</span></div>
                          <div className="total-pct">{pct}%</div>
                          <div className="total-bar-bg"><div className="total-bar-fill" style={{ width: `${pct}%`, background: isTop ? '#b45309' : 'var(--primary)' }} /></div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button type="submit" className="btn" style={{ minWidth: 200 }}>
              <Save size={16} /> Save Section Scores
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Back to Menu</button>
          </div>
        </form>
      </div>
    </div>
  );
}
