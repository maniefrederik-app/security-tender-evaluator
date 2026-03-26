import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, RotateCcw, Users, BarChart2, Printer } from 'lucide-react';
import './GuardingPersonnel.css';
import './EvaluatorBar.css';

import API from '../../api.js';
const SECTION = 'guarding';

const LEVELS = [
  { key: 'na',        label: 'Not Applicable', short: 'N/A',  pct: 0   },
  { key: 'nc',        label: 'Non-Compliant',  short: '0%',   pct: 0   },
  { key: 'supposed',  label: 'Supposed',       short: '50%',  pct: 0.5 },
  { key: 'compliant', label: 'Compliant',      short: '80%',  pct: 0.8 },
  { key: 'excellent', label: 'Excellent',      short: '100%', pct: 1.0 },
];

const SUBSECTIONS = [
  {
    id: '1.1', title: 'Experience',
    criteria: [
      { key: 'exp_industry',  label: 'Experience in the Industry',   pts: 10 },
      { key: 'exp_contract',  label: 'Contract specific experience',  pts: 10 },
    ],
  },
  {
    id: '1.2', title: 'Skills and Capabilities',
    criteria: [
      { key: 'sk_basic',      label: 'Basic training',                pts: 5  },
      { key: 'sk_additional', label: 'Additional training',           pts: 5  },
      { key: 'sk_contract',   label: 'Contract specific training',    pts: 8  },
      { key: 'sk_recurring',  label: 'Recurring training',            pts: 5  },
      { key: 'sk_other',      label: 'Other Skills',                  pts: 5  },
      { key: 'sk_career',     label: 'Career opportunities',          pts: 5  },
    ],
  },
  {
    id: '1.3', title: 'Selection, Recruitment and Vetting',
    criteria: [
      { key: 'sel_method',    label: 'Recruitment and selection methodology', pts: 15 },
      { key: 'sel_vetting',   label: 'Vetting',                               pts: 10 },
    ],
  },
  {
    id: '1.4', title: 'Employment Conditions',
    criteria: [
      { key: 'emp_salary',    label: 'Salary and benefit levels',     pts: 10 },
      { key: 'emp_working',   label: 'Working conditions',            pts: 8  },
      { key: 'emp_other',     label: 'Other criteria',                pts: 4  },
    ],
  },
];

const ALL_CRITERIA = SUBSECTIONS.flatMap(s => s.criteria);
const TOTAL_MAX = ALL_CRITERIA.reduce((a, c) => a + c.pts, 0);
const STORAGE_KEY = 'assess_guarding_v2';

function emptyScores() {
  return Object.fromEntries(ALL_CRITERIA.map(c => [c.key, '']));
}

function weightedPts(criteriaKey, levelKey) {
  if (!levelKey) return 0;
  const crit = ALL_CRITERIA.find(c => c.key === criteriaKey);
  const lvl  = LEVELS.find(l => l.key === levelKey);
  if (!crit || !lvl) return 0;
  return parseFloat((crit.pts * lvl.pct).toFixed(2));
}

export default function GuardingPersonnel() {
  const navigate = useNavigate();

  // Bidders + tender
  const [bidders, setBidders] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Evaluator state
  const [evaluators, setEvaluators] = useState([]);
  const [activeEvaluator, setActiveEvaluator] = useState('');   // '' = local-only
  const [viewMode, setViewMode] = useState('individual');        // 'individual' | 'consolidated'

  // Scores: individual (localStorage fallback) and consolidated
  const [scores, setScores] = useState({});
  const [consolidatedScores, setConsolidatedScores] = useState({}); // { criteria_key: avg_weighted_score }

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // ────────────────────────────────────
  // On mount — load tenders and bidders
  // ────────────────────────────────────
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/tenders`),
      axios.get(`${API}/bidders`),
    ]).then(([tRes, bRes]) => {
      setTenders(tRes.data);
      setBidders(bRes.data);
      if (tRes.data.length > 0) setSelectedTender(String(tRes.data[0].id));
      // Load localStorage scores
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const init = {};
      bRes.data.forEach(b => { init[b.id] = stored[b.id] || emptyScores(); });
      setScores(init);
    }).finally(() => setLoading(false));
  }, []);

  // Load evaluators when tender changes
  useEffect(() => {
    if (!selectedTender) return;
    axios.get(`${API}/evaluators?tender_id=${selectedTender}`)
      .then(res => {
        setEvaluators(res.data);
        setActiveEvaluator('');
      }).catch(() => setEvaluators([]));
  }, [selectedTender]);

  const activeBidder = bidders[activeIdx];
  const activeEvaluatorObj = evaluators.find(e => String(e.id) === String(activeEvaluator));

  // Load individual evaluator scores from DB when evaluator/bidder changes
  useEffect(() => {
    if (!activeEvaluator || !activeBidder || !selectedTender) return;
    axios.get(`${API}/evaluators/${activeEvaluator}/scores`, {
      params: { tender_id: selectedTender, bidder_id: activeBidder.id, section: SECTION }
    }).then(res => {
      setScores(prev => ({ ...prev, [activeBidder.id]: res.data }));
    }).catch(() => {});
  }, [activeEvaluator, activeBidder?.id, selectedTender]);

  // Load consolidated scores when switching to consolidated view
  useEffect(() => {
    if (viewMode !== 'consolidated' || !activeBidder || !selectedTender) return;
    axios.get(`${API}/evaluators/average-scores`, {
      params: { tender_id: selectedTender, bidder_id: activeBidder.id, section: SECTION }
    }).then(res => {
      const map = {};
      res.data.forEach(row => { map[row.criteria_key] = parseFloat(row.avg_weighted_score || 0); });
      setConsolidatedScores(map);
    }).catch(() => setConsolidatedScores({}));
  }, [viewMode, activeBidder?.id, selectedTender]);

  // ────────────────────────────────────
  // Score helpers
  // ────────────────────────────────────
  const bidderScores = activeBidder ? (scores[activeBidder.id] || emptyScores()) : {};

  const setLevel = (criteriaKey, levelKey) => {
    if (!activeBidder) return;
    setScores(prev => ({ ...prev, [activeBidder.id]: { ...prev[activeBidder.id], [criteriaKey]: levelKey } }));
  };

  const totalFor = (bidderId) => {
    const sc = scores[bidderId] || {};
    return ALL_CRITERIA.reduce((sum, c) => sum + weightedPts(c.key, sc[c.key]), 0);
  };

  const consolidatedTotal = Object.values(consolidatedScores).reduce((a, v) => a + v, 0);

  // ────────────────────────────────────
  // Save
  // ────────────────────────────────────
  const handleSave = async () => {
    // Always save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));

    // If an evaluator is selected, also save to DB
    if (activeEvaluator && activeBidder && selectedTender) {
      const scoreRows = ALL_CRITERIA.map(c => ({
        criteria_key: c.key,
        level_key: bidderScores[c.key] || null,
        points_available: c.pts,
        weighted_score: weightedPts(c.key, bidderScores[c.key]),
      }));
      try {
        await axios.post(`${API}/evaluators/${activeEvaluator}/scores`, {
          tender_id: selectedTender,
          bidder_id: activeBidder.id,
          section: SECTION,
          scores: scoreRows,
        });
      } catch (e) { console.error('DB save failed', e); }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (!activeBidder) return;
    setScores(prev => ({ ...prev, [activeBidder.id]: emptyScores() }));
  };

  // ────────────────────────────────────
  // Render
  // ────────────────────────────────────
  if (loading) return <div className="page-shell"><p style={{ padding: 40 }}>Loading...</p></div>;

  if (bidders.length === 0) return (
    <div className="page-shell">
      <div style={{ maxWidth: 700, width: '100%' }}>
        <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back</button>
        <h1 className="section-title">1. Guarding Personnel</h1>
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No bidders registered yet.</p>
          <button className="btn" onClick={() => navigate('/initial-data')}>Go to Initial Data Entry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-shell gp-shell">
      <div className="gp-wrapper">
        {/* Top bar */}
        <div className="gp-topbar">
          <div>
            <h1 className="gp-title">1&nbsp;&nbsp;Guarding Personnel</h1>
            <div className="gp-print-meta print-only">
              <span>Bidder: <strong>{activeBidder?.company_name || '—'}</strong></span>
              {activeEvaluatorObj && <span>Evaluator: <strong>{activeEvaluatorObj.name}</strong>{activeEvaluatorObj.designation ? ` · ${activeEvaluatorObj.designation}` : ''}</span>}
              <span>Date: {new Date().toLocaleDateString('en-ZA')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-sm no-print" onClick={() => window.print()} style={{ padding: '8px 16px', fontSize: '0.85rem' }}><Printer size={14}/> Print Sheet</button>
            <button className="btn btn-outline no-print" style={{ fontSize: '0.85rem', padding: '8px 16px' }} onClick={() => navigate('/summary')}>Return to Summary</button>
            <button className="back-link" style={{ marginBottom: 0 }} onClick={() => navigate('/')}><ArrowLeft size={15} /> Menu</button>
          </div>
        </div>

        {/* ── Evaluator Bar ── */}
        <div className="ev-bar glass-card">
          <div className="ev-bar-left">
            {/* Tender selector */}
            {tenders.length > 1 && (
              <div className="ev-bar-field">
                <label className="ev-bar-label">Tender</label>
                <select className="ev-bar-select" value={selectedTender} onChange={e => setSelectedTender(e.target.value)}>
                  {tenders.map(t => <option key={t.id} value={t.id}>{t.reference_number}</option>)}
                </select>
              </div>
            )}
            {/* Evaluator selector */}
            <div className="ev-bar-field">
              <label className="ev-bar-label"><Users size={13} /> Scoring As</label>
              <select className="ev-bar-select" value={activeEvaluator} onChange={e => { setActiveEvaluator(e.target.value); setViewMode('individual'); }}>
                <option value="">— Local / Draft —</option>
                {evaluators.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation || 'Evaluator'})</option>)}
              </select>
            </div>
            {evaluators.length === 0 && (
              <button className="ev-bar-link" onClick={() => navigate('/evaluators')}>
                <Users size={13} /> Register evaluators
              </button>
            )}
          </div>
          {/* View toggle */}
          <div className="ev-bar-toggle">
            <button
              className={`ev-toggle-btn${viewMode === 'individual' ? ' active' : ''}`}
              onClick={() => setViewMode('individual')}
            ><Users size={14} /> Individual</button>
            <button
              className={`ev-toggle-btn${viewMode === 'consolidated' ? ' active' : ''}`}
              onClick={() => setViewMode('consolidated')}
            ><BarChart2 size={14} /> Consolidated</button>
          </div>
        </div>

        {/* ── Evaluator identity strip ── */}
        {activeEvaluatorObj && (
          <div className="ev-identity-strip">
            <span className="ev-identity-label">Evaluator:</span>
            <span className="ev-identity-name">{activeEvaluatorObj.name}</span>
            {activeEvaluatorObj.designation && (
              <><span className="ev-identity-sep">·</span><span className="ev-identity-desig">{activeEvaluatorObj.designation}</span></>
            )}
            <span className="ev-identity-mode">{viewMode === 'consolidated' ? '— Consolidated View' : '— Individual Scoring'}</span>
          </div>
        )}

        {saved && <div className="alert alert-success" style={{ marginBottom: 16 }}>Scores saved{activeEvaluator ? ' to database' : ' locally'}!</div>}

        {/* Bidder tabs */}
        <div className="gp-tabs">
          {bidders.map((b, i) => (
            <button key={b.id} className={`gp-tab${activeIdx === i ? ' active' : ''}`} onClick={() => setActiveIdx(i)}>
              <span className="gp-tab-name">{b.company_name}</span>
              <span className="gp-tab-score">
                {viewMode === 'consolidated'
                  ? `${consolidatedTotal.toFixed(1)}/${TOTAL_MAX} avg`
                  : `${totalFor(b.id).toFixed(1)}/${TOTAL_MAX}`}
              </span>
            </button>
          ))}
        </div>

        {/* Consolidated notice */}
        {viewMode === 'consolidated' && (
          <div className="ev-consolidated-notice">
            <BarChart2 size={15} />
            {Object.keys(consolidatedScores).length === 0
              ? 'No evaluator scores saved yet. Switch to Individual and save scores first.'
              : `Showing averaged scores from ${evaluators.length} evaluator(s) — read-only.`}
          </div>
        )}

        {/* Matrix */}
        <div className="glass-card gp-matrix-card">
          <div className="gp-matrix-scroll">
            <table className="gp-matrix">
              <thead>
                <tr>
                  <th className="gp-crit-head" />
                  <th className="gp-pts-head">Points<br/>Available</th>
                  {viewMode === 'individual'
                    ? LEVELS.map(l => (
                        <th key={l.key} className="gp-lvl-head">
                          <span className="gp-lvl-label">{l.label}</span>
                          <span className="gp-lvl-pct">{l.short}</span>
                        </th>
                      ))
                    : <th className="gp-weighted-head" colSpan={5} style={{textAlign:'center', color:'var(--success)', letterSpacing:'0.03em'}}>↻ AVERAGED COMPLIANCE LEVEL</th>
                  }
                  <th className="gp-weighted-head">
                    {viewMode === 'consolidated' ? 'Avg Weighted' : 'Weighted'}<br/>Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {SUBSECTIONS.map(section => (
                  <>
                    <tr key={`h-${section.id}`} className="gp-section-header">
                      <td colSpan={8} className="gp-section-label">{section.id}&nbsp;&nbsp;{section.title}</td>
                    </tr>
                    {section.criteria.map((crit, ci) => {
                      const selected = bidderScores[crit.key] || '';
                      const indivWeighted = weightedPts(crit.key, selected);
                      const avgWeighted = consolidatedScores[crit.key] ?? null;
                      return (
                        <tr key={crit.key} className={`gp-row${ci % 2 === 0 ? ' even' : ''}`}>
                          <td className="gp-crit-cell">{crit.label}</td>
                          <td className="gp-pts-cell">{crit.pts}</td>
                          {viewMode === 'individual'
                            ? LEVELS.map(lvl => (
                                <td key={lvl.key} className="gp-radio-cell">
                                  <label className={`gp-radio-label${selected === lvl.key ? ' checked' : ''}`}>
                                    <input type="radio" name={`${activeBidder?.id}-${crit.key}`} value={lvl.key} checked={selected === lvl.key} onChange={() => setLevel(crit.key, lvl.key)} className="gp-radio" />
                                  </label>
                                </td>
                              ))
                            : <td colSpan={5} className="gp-avg-bar-cell">
                                <div className="gp-avg-bar">
                                  <div className="gp-avg-bar-fill" style={{ width: `${crit.pts > 0 ? Math.min(100, (avgWeighted ?? 0) / crit.pts * 100) : 0}%` }} />
                                </div>
                              </td>
                          }
                          <td className="gp-weighted-cell" style={viewMode === 'consolidated' ? {color:'var(--success)'} : {}}>
                            {viewMode === 'consolidated'
                              ? (avgWeighted !== null ? avgWeighted.toFixed(2) : '—')
                              : (selected ? indivWeighted.toFixed(2) : '0')
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="gp-total-row">
                  <td colSpan="2" className="gp-total-label">TOTAL</td>
                  <td colSpan="5" />
                  <td className="gp-total-value">
                    {viewMode === 'consolidated'
                      ? `${consolidatedTotal.toFixed(2)} / ${TOTAL_MAX} avg`
                      : `${(activeBidder ? totalFor(activeBidder.id) : 0).toFixed(2)} / ${TOTAL_MAX}`
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="gp-actions">
          {viewMode === 'individual' && (
            <>
              <button className="btn" onClick={handleSave}><Save size={16} /> Save Scores{activeEvaluator ? ' to DB' : ''}</button>
              <button className="btn btn-outline" onClick={handleReset}><RotateCcw size={15} /> Reset This Bidder</button>
            </>
          )}
          <button className="btn btn-outline" onClick={() => navigate('/')}><ArrowLeft size={15} /> Back to Menu</button>
        </div>
      </div>
    </div>
  );
}
