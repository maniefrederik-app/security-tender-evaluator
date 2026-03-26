import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, Medal, Star, RefreshCw, Printer,
  BarChart2, Shield, FileCheck, Building2, Briefcase,
  Sparkles, AlertTriangle, CheckCircle, TrendingUp, Users
} from 'lucide-react';
import './SummaryReport.css';

import API from '../api.js';

const SECTIONS = [
  { key: 'guarding', label: 'Guarding Personnel',       icon: Shield,    color: '#1a2b8c', max: 100 },
  { key: 'contract', label: 'Contract Management',      icon: FileCheck, color: '#0e9f6e', max: 100 },
  { key: 'infra',    label: 'Contract Infrastructure',  icon: Building2, color: '#7c3aed', max: 100 },
  { key: 'company',  label: 'The Company',              icon: Briefcase, color: '#d97706', max: 100 },
];
const GRAND_MAX = 400;

// ── AI narrative generator ─────────────────────────────────────
function generateAINarrative(ranked, pricingData = {}) {
  if (!ranked || ranked.length === 0) return null;
  const top3 = ranked.slice(0, 3);

  const strengths = (b) => {
    const strong = SECTIONS
      .map(s => ({ label: s.label, score: b.sections[s.key] ?? 0, max: s.max }))
      .filter(s => s.score / s.max >= 0.75)
      .map(s => s.label);
    return strong.length > 0 ? strong : ['General compliance'];
  };

  const weaknesses = (b) => SECTIONS
    .map(s => ({ label: s.label, score: b.sections[s.key] ?? 0, max: s.max }))
    .filter(s => s.score / s.max < 0.55)
    .map(s => s.label);

  const pct = (b) => ((b.grandTotal / GRAND_MAX) * 100).toFixed(1);

  const posDescriptor = (rank) => ['highly recommended', 'strongly recommended', 'recommended'][rank - 1] || 'considered';

  const buildReason = (b, idx) => {
    const rank = idx + 1;
    const scoreDesc = b.grandTotal >= 320 ? 'exceptional' : b.grandTotal >= 260 ? 'strong' : 'adequate';
    const str = strengths(b);
    const weak = weaknesses(b);
    const cPrice = pricingData[b.id];
    const priceNote = cPrice
      ? ` Their submitted contract price of R ${Number(cPrice).toLocaleString('en-ZA')} places them ${rank === 1 ? 'competitively' : 'within range'} on the PPPFA price schedule.`
      : '';

    return `${b.company_name} is ${posDescriptor(rank)} as the ${['#1', '#2', '#3'][idx]} bidder. ` +
      `With a combined functionality score of ${b.grandTotal.toFixed(1)} / ${GRAND_MAX} (${pct(b)}%), ` +
      `their overall performance is ${scoreDesc}. ` +
      `They demonstrate notable strength in: ${str.join(', ')}.` +
      (weak.length > 0
        ? ` Evaluators noted areas for improvement in ${weak.join(' and ')}, which should be addressed through contract KPIs and SLA provisions.`
        : ' No significant compliance gaps were identified across any evaluation section.') +
      priceNote;
  };

  const recommendations = top3.map((b, i) => ({
    rank: i + 1,
    bidder: b,
    reason: buildReason(b, i),
    strengths: strengths(b),
    weaknesses: weaknesses(b),
    pct: pct(b),
  }));

  const note = ranked.length > 3
    ? `The remaining ${ranked.length - 3} bidder(s) scored below the top three and are ranked accordingly. Functionality compliance and PPPFA price scoring should be used jointly to determine final award.`
    : '';

  return { recommendations, note };
}

export default function SummaryReport() {
  const navigate = useNavigate();

  const [tenders, setTenders]           = useState([]);
  const [bidders, setBidders]           = useState([]);
  const [evaluators, setEvaluators]     = useState([]);
  const [selectedTender, setSelectedTender] = useState('');
  const [loading, setLoading]           = useState(false);
  const [scores, setScores]             = useState({});   // { bidder_id: { section: total, ... } }
  const [pricingData, setPricingData]   = useState({});   // { bidder_id: contractPrice }
  const [aiAnalysis, setAiAnalysis]     = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [minScore, setMinScore]         = useState(65);   // minimum % to qualify

  // Load tenders + bidders
  useEffect(() => {
    Promise.all([axios.get(`${API}/tenders`), axios.get(`${API}/bidders`)])
      .then(([tRes, bRes]) => {
        setTenders(tRes.data);
        setBidders(bRes.data);
        if (tRes.data.length > 0) setSelectedTender(String(tRes.data[0].id));
      }).catch(() => {});
  }, []);

  // Load evaluators when tender changes
  useEffect(() => {
    if (!selectedTender) return;
    axios.get(`${API}/evaluators?tender_id=${selectedTender}`)
      .then(r => setEvaluators(r.data)).catch(() => setEvaluators([]));
  }, [selectedTender]);

  // Load consolidated scores: for each bidder × each section
  const loadScores = useCallback(async () => {
    if (!selectedTender || bidders.length === 0) return;
    setLoading(true);
    setAiAnalysis(null);
    const newScores = {};

    await Promise.all(
      bidders.flatMap(b =>
        SECTIONS.map(s =>
          axios.get(`${API}/evaluators/average-scores`, {
            params: { tender_id: selectedTender, bidder_id: b.id, section: s.key }
          }).then(res => {
            const total = res.data.reduce((sum, row) => sum + parseFloat(row.avg_weighted_score || 0), 0);
            if (!newScores[b.id]) newScores[b.id] = {};
            newScores[b.id][s.key] = parseFloat(total.toFixed(2));
          }).catch(() => {
            if (!newScores[b.id]) newScores[b.id] = {};
            newScores[b.id][s.key] = 0;
          })
        )
      )
    );

    setScores(newScores);

    // Load pricing data from localStorage
    const psKey = `pricing_schedule_${selectedTender}`;
    const psRaw = localStorage.getItem(psKey);
    const prices = {};
    if (psRaw) {
      const ps = JSON.parse(psRaw);
      bidders.forEach(b => {
        const total = (ps.items || []).reduce((sum, item) => {
          const rate = parseFloat(item.rates?.[b.id] || 0);
          return sum + rate * (item.qty || 1);
        }, 0);
        const months = ps.contractMonths || 36;
        const incVat = total * 1.15;
        if (incVat > 0) prices[b.id] = incVat * months;
      });
    }
    setPricingData(prices);
    setLoading(false);
  }, [selectedTender, bidders]);

  useEffect(() => { loadScores(); }, [loadScores]);

  // Ranked list derived from scores
  const ranked = bidders
    .map(b => {
      const sectionScores = scores[b.id] || {};
      const grandTotal = SECTIONS.reduce((s, sec) => s + (sectionScores[sec.key] ?? 0), 0);
      const pct = (grandTotal / GRAND_MAX) * 100;
      const qualified = pct >= minScore;
      return { ...b, sections: sectionScores, grandTotal, pct, qualified };
    })
    .sort((a, b) => b.grandTotal - a.grandTotal);

  const qualifiedRanked = ranked.filter(b => b.grandTotal > 0);

  // PPPFA Ps scoring
  const pricedBidders = qualifiedRanked.filter(b => pricingData[b.id] > 0);
  const pmin = pricedBidders.length ? Math.min(...pricedBidders.map(b => pricingData[b.id])) : 0;
  const priceScore = (id) => {
    const pt = pricingData[id];
    if (!pt || !pmin) return null;
    return (80 * (1 - (pt - pmin) / pmin)).toFixed(2);
  };

  const runAI = () => {
    setAiLoading(true);
    // Simulate brief "thinking" delay for UX
    setTimeout(() => {
      const analysis = generateAINarrative(qualifiedRanked, pricingData);
      setAiAnalysis(analysis);
      setAiLoading(false);
    }, 1200);
  };

  const selectedTenderObj = tenders.find(t => String(t.id) === selectedTender);
  const fmtR = (n) => n ? `R ${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}` : '—';
  const medalIcon = (i) => [<Trophy size={16} className="sr-trophy" />, <Medal size={16} className="sr-medal" />, <Star size={16} className="sr-star" />][i] || null;

  return (
    <div className="sr-shell">
      {/* ── Toolbar ── */}
      <div className="sr-toolbar no-print">
        <div className="sr-toolbar-left">
          <button className="back-link" onClick={() => navigate('/')} style={{ marginBottom: 0 }}>
            <ArrowLeft size={15} /> Start Page
          </button>
          <BarChart2 size={20} className="sr-toolbar-icon" />
          <h1 className="sr-toolbar-title">Summary Report</h1>
          {tenders.length > 0 && (
            <select className="td-tender-select" value={selectedTender} onChange={e => setSelectedTender(e.target.value)}>
              {tenders.map(t => <option key={t.id} value={t.id}>{t.reference_number} — {t.title}</option>)}
            </select>
          )}
        </div>
        <div className="sr-toolbar-right">
          <button className="btn btn-sm btn-outline" onClick={loadScores} disabled={loading}>
            <RefreshCw size={13} /> {loading ? 'Loading…' : 'Refresh Scores'}
          </button>
          <button className="btn btn-sm" onClick={() => window.print()}>
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      <div className="sr-document">
        {/* Header */}
        <div className="sr-header">
          <div>
            <p className="sr-header-label">TENDER EVALUATION — SUMMARY REPORT</p>
            <h1 className="sr-header-title">{selectedTenderObj?.title || 'Security Guarding Services'}</h1>
            <p className="sr-header-sub">
              Ref: {selectedTenderObj?.reference_number || '—'} &nbsp;·&nbsp;
              {evaluators.length} Evaluator{evaluators.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              {bidders.length} Bidder{bidders.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              Generated: {new Date().toLocaleDateString('en-ZA')}
            </p>
          </div>
          <div className="sr-threshold no-print">
            <label className="sr-threshold-label">Min. qualifying score</label>
            <div className="sr-threshold-row">
              <input type="number" min={0} max={100} value={minScore}
                onChange={e => setMinScore(+e.target.value || 0)}
                className="sr-threshold-input" />
              <span className="sr-threshold-pct">%</span>
            </div>
          </div>
        </div>

        {/* ── Info strip ── */}
        <div className="sr-info-strip">
          <div className="sr-info-item">
            <Users size={14} />
            <span><strong>{evaluators.length}</strong> registered evaluator{evaluators.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="sr-info-item">
            <BarChart2 size={14} />
            <span>Scores: averaged across all evaluators</span>
          </div>
          <div className="sr-info-item">
            <TrendingUp size={14} />
            <span>Min. qualifying: <strong>{minScore}%</strong> of {GRAND_MAX} pts = <strong>{Math.round(minScore * GRAND_MAX / 100)} pts</strong></span>
          </div>
        </div>

        {/* ── Consolidated Scores Table ── */}
        <div className="sr-section">
          <h2 className="sr-section-heading">Consolidated Evaluation Scores</h2>
          {loading ? (
            <p className="sr-loading">Loading consolidated scores…</p>
          ) : qualifiedRanked.length === 0 ? (
            <div className="sr-empty">
              <AlertTriangle size={24} />
              <p>No scores have been saved yet. Complete evaluations in each section first.</p>
              <button className="btn" onClick={() => navigate('/assess/guarding')}>Go to Evaluations →</button>
            </div>
          ) : (
            <div className="sr-table-wrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th className="sr-th-rank">Rank</th>
                    <th className="sr-th-bidder">Bidder</th>
                    {SECTIONS.map(s => (
                      <th key={s.key} className="sr-th-section">
                        {s.label}<br />
                        <span className="sr-th-max">/ {s.max} pts</span>
                      </th>
                    ))}
                    <th className="sr-th-total">Grand Total<br /><span className="sr-th-max">/ {GRAND_MAX} pts</span></th>
                    <th className="sr-th-pct">Score %</th>
                    <th className="sr-th-price">Contract Value<br /><span className="sr-th-max">(incl. VAT)</span></th>
                    <th className="sr-th-ps">Price Pts<br /><span className="sr-th-max">PPPFA Ps</span></th>
                    <th className="sr-th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((b, i) => {
                    const realRank = qualifiedRanked.findIndex(x => x.id === b.id) + 1;
                    const isTop3 = realRank >= 1 && realRank <= 3 && b.grandTotal > 0;
                    const ps = priceScore(b.id);
                    return (
                      <tr key={b.id} className={`sr-row${realRank === 1 ? ' sr-row-gold' : realRank === 2 ? ' sr-row-silver' : realRank === 3 ? ' sr-row-bronze' : ''}`}>
                        <td className="sr-cell-rank">
                          {b.grandTotal > 0 ? (
                            <span className="sr-rank-badge">{isTop3 ? medalIcon(realRank - 1) : null} #{realRank}</span>
                          ) : <span className="sr-no-score">No scores</span>}
                        </td>
                        <td className="sr-cell-bidder">
                          <div className="sr-bidder-name">{b.company_name}</div>
                          {b.contact_person && <div className="sr-bidder-contact">{b.contact_person}</div>}
                        </td>
                        {SECTIONS.map(s => {
                          const val = b.sections[s.key] ?? 0;
                          const pct = val / s.max;
                          return (
                            <td key={s.key} className="sr-cell-section">
                              <div className="sr-score-val">{val > 0 ? val.toFixed(1) : '—'}</div>
                              {val > 0 && (
                                <div className="sr-score-bar">
                                  <div className="sr-score-bar-fill" style={{ width: `${Math.min(100, pct * 100)}%`, background: s.color }} />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="sr-cell-total">
                          <strong>{b.grandTotal > 0 ? b.grandTotal.toFixed(1) : '—'}</strong>
                        </td>
                        <td className="sr-cell-pct">
                          {b.grandTotal > 0 ? (
                            <span className={`sr-pct-badge ${b.pct >= 75 ? 'high' : b.pct >= minScore ? 'mid' : 'low'}`}>
                              {b.pct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="sr-cell-price">{fmtR(pricingData[b.id])}</td>
                        <td className="sr-cell-ps">{ps !== null ? <span className="sr-ps-val">{ps}</span> : '—'}</td>
                        <td className="sr-cell-status">
                          {b.grandTotal === 0 ? (
                            <span className="sr-badge sr-badge-grey">Pending</span>
                          ) : b.pct >= minScore ? (
                            <span className="sr-badge sr-badge-green"><CheckCircle size={11} /> Qualified</span>
                          ) : (
                            <span className="sr-badge sr-badge-red"><AlertTriangle size={11} /> Below Min</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── AI Recommendation Block ── */}
        {qualifiedRanked.length > 0 && (
          <div className="sr-section">
            <div className="sr-ai-header">
              <div className="sr-ai-title-row">
                <Sparkles size={18} className="sr-sparkle" />
                <h2 className="sr-section-heading" style={{ margin: 0 }}>AI Recommendation — Top 3 Bidders</h2>
              </div>
              {!aiAnalysis && (
                <button className="btn sr-ai-btn no-print" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? <><RefreshCw size={14} className="sr-spin" /> Analysing…</> : <><Sparkles size={14} /> Generate AI Analysis</>}
                </button>
              )}
              {aiAnalysis && (
                <button className="btn btn-outline btn-sm no-print" onClick={() => { setAiAnalysis(null); }}>
                  <RefreshCw size={13} /> Re-run
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="sr-ai-thinking">
                <RefreshCw size={20} className="sr-spin" />
                <p>Analysing evaluation data across all {evaluators.length} evaluator(s) and {SECTIONS.length} criteria sections…</p>
              </div>
            )}

            {aiAnalysis && (
              <>
                <div className="sr-ai-cards">
                  {aiAnalysis.recommendations.map((rec) => (
                    <div key={rec.bidder.id} className={`sr-ai-card sr-ai-card-${rec.rank}`}>
                      <div className="sr-ai-card-header">
                        <div className="sr-ai-rank">{medalIcon(rec.rank - 1)}<span>#{rec.rank} {['Recommended', 'Alternative', 'Third Option'][rec.rank - 1]}</span></div>
                        <span className="sr-ai-score">{rec.pct}% overall</span>
                      </div>
                      <h3 className="sr-ai-company">{rec.bidder.company_name}</h3>
                      <div className="sr-ai-section-scores">
                        {SECTIONS.map(s => (
                          <div key={s.key} className="sr-ai-section-chip" style={{ borderColor: s.color }}>
                            <span style={{ color: s.color, fontWeight: 700 }}>{rec.bidder.sections[s.key]?.toFixed(0) ?? '—'}</span>
                            <span className="sr-ai-chip-label">{s.label.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                      <p className="sr-ai-reason">{rec.reason}</p>
                      {rec.strengths.length > 0 && (
                        <div className="sr-ai-tags">
                          <span className="sr-ai-tag-label">Strengths:</span>
                          {rec.strengths.map(str => <span key={str} className="sr-ai-tag sr-ai-tag-green">{str}</span>)}
                        </div>
                      )}
                      {rec.weaknesses.length > 0 && (
                        <div className="sr-ai-tags">
                          <span className="sr-ai-tag-label">Watch:</span>
                          {rec.weaknesses.map(w => <span key={w} className="sr-ai-tag sr-ai-tag-amber">{w}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {aiAnalysis.note && (
                  <p className="sr-ai-footnote">{aiAnalysis.note}</p>
                )}

                <div className="sr-ai-disclaimer">
                  <AlertTriangle size={13} />
                  <span>This analysis is generated from the consolidated averaged scores of <strong>{evaluators.length} evaluator(s)</strong>. It is advisory only and must be reviewed and approved by the authorised procurement official before any award recommendation is made.</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sr-footer">
          <div className="sr-footer-line" />
          <p>Tender Evaluation Summary Report &nbsp;·&nbsp; {selectedTenderObj?.reference_number || ''} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-ZA')}</p>
          <p className="sr-footer-conf">CONFIDENTIAL — FOR AUTHORISED PROCUREMENT OFFICIALS ONLY</p>
        </div>
      </div>
    </div>
  );
}
