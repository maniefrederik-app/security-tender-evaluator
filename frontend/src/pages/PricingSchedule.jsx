import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Printer, Plus, Trash2, Save, RotateCcw,
  RefreshCw, FileSpreadsheet, ChevronDown, ChevronUp,
  Lock, Unlock, User, Users
} from 'lucide-react';
import './PricingSchedule.css';

import API from '../api.js';
const VAT_RATE = 0.15;
const STORAGE_KEY_PREFIX = 'pricing_schedule_';

// ── Derive line items from TenderDocument + bidder list ────────────
function deriveLineItems(doc, bidders) {
  const emptyRates = () => Object.fromEntries((bidders || []).map(b => [b.id, '']));

  if (!doc) return [
    { id: 'grade_b', category: 'Guarding Personnel', description: 'Grade B Supervisor',    unit: 'Post/Month', qty: 4,  rates: emptyRates() },
    { id: 'grade_c', category: 'Guarding Personnel', description: 'Grade C Senior Guard',  unit: 'Post/Month', qty: 10, rates: emptyRates() },
    { id: 'grade_d', category: 'Guarding Personnel', description: 'Grade D Guard',         unit: 'Post/Month', qty: 18, rates: emptyRates() },
    { id: 'armed_v', category: 'Vehicles',           description: 'Armed Response Vehicle', unit: 'Vehicle/Month', qty: 1, rates: emptyRates() },
    { id: 'patrol_v',category: 'Vehicles',           description: 'Supervisor Patrol Vehicle', unit: 'Vehicle/Month', qty: 1, rates: emptyRates() },
    { id: 'guard_m', category: 'Systems',            description: 'Guard Monitoring System', unit: 'System/Month', qty: 1, rates: emptyRates() },
    { id: 'mgmt',    category: 'Management',         description: 'Contract Management Fee', unit: 'Month',       qty: 1, rates: emptyRates() },
  ];

  const items = [];
  (doc.personnelSummary || []).forEach(row => {
    items.push({ id: `grade_${row.grade.replace(/\s+/g,'_').toLowerCase()}`, category: 'Guarding Personnel', description: `${row.grade} – ${row.designation}`, unit: 'Post/Month', qty: row.perShift || 1, rates: emptyRates() });
  });
  (doc.vehicles || []).forEach((v, i) => {
    items.push({ id: `vehicle_${i}`, category: 'Vehicles & Mobile Assets', description: v.type, unit: 'Vehicle/Month', qty: v.count || 1, rates: emptyRates() });
  });
  items.push(
    { id: 'guard_monitoring', category: 'Systems & Technology', description: 'Guard Monitoring System (electronic guard tour)', unit: 'System/Month', qty: 1, rates: emptyRates() },
    { id: 'control_room',    category: 'Systems & Technology', description: 'PSIRA Grade A Control Room — 24/7 monitoring',    unit: 'Month',        qty: 1, rates: emptyRates() },
    { id: 'management_fee', category: 'Management',            description: 'Contract Management Fee',                         unit: 'Month',        qty: 1, rates: emptyRates() },
    { id: 'contingency',    category: 'Management',            description: 'Contingency / Relief Allowance',                  unit: 'Month',        qty: 1, rates: emptyRates() },
  );
  return items;
}

export default function PricingSchedule() {
  const navigate = useNavigate();

  const [tenders, setTenders]               = useState([]);
  const [bidders, setBidders]               = useState([]);
  const [selectedTender, setSelectedTender] = useState('');
  const [contractMonths, setContractMonths] = useState(36);
  const [items, setItems]                   = useState([]);
  const [collapsed, setCollapsed]           = useState({});
  const [saved, setSaved]                   = useState(false);
  const [loading, setLoading]               = useState(true);

  // ── VIEW MODE ──────────────────────────────────────────────────────
  // 'bidder' = single-bidder isolated mode (default)
  // 'admin'  = all bidders comparison (unlocked by admin)
  const [viewMode, setViewMode]         = useState('bidder');
  const [activeBidderId, setActiveBidderId] = useState('');
  const [adminUnlocked, setAdminUnlocked]   = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Load tenders + bidders
  useEffect(() => {
    Promise.all([axios.get(`${API}/tenders`), axios.get(`${API}/bidders`)])
      .then(([tRes, bRes]) => {
        setTenders(tRes.data);
        setBidders(bRes.data);
        if (tRes.data.length > 0) setSelectedTender(String(tRes.data[0].id));
        if (bRes.data.length > 0) setActiveBidderId(String(bRes.data[0].id));
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Load/derive line items when tender or bidders change
  useEffect(() => {
    if (!selectedTender) return;
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${selectedTender}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const updated = parsed.items.map(item => ({
        ...item,
        rates: { ...Object.fromEntries(bidders.map(b => [b.id, ''])), ...item.rates },
      }));
      setItems(updated);
      setContractMonths(parsed.contractMonths || 36);
    } else {
      const docRaw = localStorage.getItem(`tender_doc_${selectedTender}`);
      setItems(deriveLineItems(docRaw ? JSON.parse(docRaw) : null, bidders));
    }
  }, [selectedTender, bidders]);

  // ── Helpers ──────────────────────────────────────────────────────
  const persist = (newItems, months) => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${selectedTender}`, JSON.stringify({ items: newItems, contractMonths: months }));
  };

  const handleSave = () => { persist(items, contractMonths); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const handleReset = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${selectedTender}`);
    const docRaw = localStorage.getItem(`tender_doc_${selectedTender}`);
    setItems(deriveLineItems(docRaw ? JSON.parse(docRaw) : null, bidders));
    setContractMonths(36);
  };

  const syncFromDoc = () => {
    const docRaw = localStorage.getItem(`tender_doc_${selectedTender}`);
    const newItems = deriveLineItems(docRaw ? JSON.parse(docRaw) : null, bidders);
    // preserve existing rates
    setItems(newItems.map(ni => { const ex = items.find(i => i.id === ni.id); return ex ? { ...ni, rates: { ...ni.rates, ...ex.rates } } : ni; }));
  };

  const setRate = (itemId, bidderId, val) =>
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, rates: { ...item.rates, [bidderId]: val } } : item));

  const setField = (itemId, field, val) =>
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: field === 'qty' ? +val || 1 : val } : item));

  const addItem = () => setItems(prev => [...prev, { id: `custom_${Date.now()}`, category: 'Additional Items', description: 'New Line Item', unit: 'Month', qty: 1, rates: Object.fromEntries(bidders.map(b => [b.id, ''])) }]);
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id));
  const toggleCat = cat => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  // ── Calculations ─────────────────────────────────────────────────
  const monthlyFor  = (item, bid) => (parseFloat(item.rates[bid]) || 0) * (item.qty || 1);
  const totalMonthly= bid => items.reduce((s, i) => s + monthlyFor(i, bid), 0);
  const totalVat    = bid => totalMonthly(bid) * VAT_RATE;
  const totalIncVat = bid => totalMonthly(bid) * (1 + VAT_RATE);
  const totalContract=bid => totalIncVat(bid) * contractMonths;

  const fmt = n => n ? `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const categories = [...new Set(items.map(i => i.category))];
  const activeBidder = bidders.find(b => String(b.id) === String(activeBidderId));
  const selectedTenderObj = tenders.find(t => String(t.id) === selectedTender);

  if (loading) return <div className="ps-shell"><p style={{ padding: 40 }}>Loading…</p></div>;

  // ── Single-bidder mode table ──────────────────────────────────────
  const renderSingleBidderTable = () => (
    <div className="ps-table-wrap">
      <table className="ps-table">
        <thead>
          <tr>
            <th className="ps-th-num">#</th>
            <th className="ps-th-desc">Description / Specification</th>
            <th className="ps-th-unit">Unit</th>
            <th className="ps-th-qty">Qty</th>
            <th className="ps-th-bidder" style={{ minWidth: 160 }}>Unit Rate<br/><span style={{ fontWeight: 400, opacity: 0.75, fontSize: '0.72rem' }}>excl. VAT (ZAR)</span></th>
            <th className="ps-th-monthly" style={{ minWidth: 150 }}>Monthly Total<br/><span style={{ fontWeight: 400, opacity: 0.75, fontSize: '0.72rem' }}>excl. VAT</span></th>
            <th className="ps-th-action no-print">Del</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <>
              <tr key={`cat_${cat}`} className="ps-cat-row" onClick={() => toggleCat(cat)}>
                <td colSpan={7}  className="ps-cat-cell">
                  <span className="ps-cat-toggle">{collapsed[cat] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>
                  {cat}
                </td>
              </tr>
              {!collapsed[cat] && items.filter(i => i.category === cat).map((item, idx) => (
                <tr key={item.id} className={`ps-row${idx % 2 === 0 ? ' even' : ''}`}>
                  <td className="ps-cell-num">{items.indexOf(item) + 1}</td>
                  <td className="ps-cell-desc">
                    <input className="ps-desc-input" value={item.description} onChange={e => setField(item.id, 'description', e.target.value)} />
                  </td>
                  <td className="ps-cell-unit">
                    <input className="ps-unit-input" value={item.unit} onChange={e => setField(item.id, 'unit', e.target.value)} />
                  </td>
                  <td className="ps-cell-qty">
                    <input type="number" min={1} className="ps-qty-input" value={item.qty} onChange={e => setField(item.id, 'qty', e.target.value)} />
                  </td>
                  <td className="ps-cell-rate">
                    <div className="ps-rate-wrap">
                      <span className="ps-rand">R</span>
                      <input type="number" min={0} step="0.01" className="ps-rate-input" placeholder="0.00" value={item.rates[activeBidderId] || ''} onChange={e => setRate(item.id, activeBidderId, e.target.value)} />
                    </div>
                  </td>
                  <td className="ps-cell-monthly">
                    {item.rates[activeBidderId] ? fmt(monthlyFor(item, activeBidderId)) : <span className="ps-dash">—</span>}
                  </td>
                  <td className="ps-cell-action no-print">
                    <button className="td-row-del" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </>
          ))}
          <tr className="ps-add-row-tr no-print">
            <td colSpan={7}><button className="td-add-row" onClick={addItem}><Plus size={14} /> Add Line Item</button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="ps-subtotal-row">
            <td colSpan={5} className="ps-total-label">MONTHLY TOTAL (excl. VAT)</td>
            <td className="ps-subtotal-val">{fmt(totalMonthly(activeBidderId))}</td>
            <td className="no-print" />
          </tr>
          <tr className="ps-vat-row">
            <td colSpan={5} className="ps-total-label">VAT @ 15%</td>
            <td className="ps-vat-val">{fmt(totalVat(activeBidderId))}</td>
            <td className="no-print" />
          </tr>
          <tr className="ps-grand-row">
            <td colSpan={5} className="ps-total-label">MONTHLY TOTAL (incl. VAT)</td>
            <td className="ps-grand-val">{fmt(totalIncVat(activeBidderId))}</td>
            <td className="no-print" />
          </tr>
          <tr className="ps-contract-row">
            <td colSpan={5} className="ps-total-label">TOTAL CONTRACT VALUE ({contractMonths} months, incl. VAT)</td>
            <td className="ps-contract-val">{fmt(totalContract(activeBidderId))}</td>
            <td className="no-print" />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  // ── Admin mode table (all bidders) ────────────────────────────────
  const renderAdminTable = () => (
    <div className="ps-table-wrap">
      <table className="ps-table">
        <thead>
          <tr>
            <th className="ps-th-num">#</th>
            <th className="ps-th-desc">Description</th>
            <th className="ps-th-unit">Unit</th>
            <th className="ps-th-qty">Qty</th>
            {bidders.map(b => (
              <th key={b.id} className="ps-th-bidder">
                <span className="ps-bidder-name">{b.company_name}</span>
                <span className="ps-bidder-sub">Unit Rate (excl. VAT)</span>
              </th>
            ))}
            {bidders.map(b => (
              <th key={`m_${b.id}`} className="ps-th-monthly">
                <span className="ps-bidder-name">{b.company_name}</span>
                <span className="ps-bidder-sub">Monthly Total</span>
              </th>
            ))}
            <th className="ps-th-action no-print">Del</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <>
              <tr key={`cat_${cat}`} className="ps-cat-row" onClick={() => toggleCat(cat)}>
                <td colSpan={4 + bidders.length * 2 + 1} className="ps-cat-cell">
                  <span className="ps-cat-toggle">{collapsed[cat] ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}</span>
                  {cat}
                </td>
              </tr>
              {!collapsed[cat] && items.filter(i => i.category === cat).map((item, idx) => (
                <tr key={item.id} className={`ps-row${idx % 2 === 0 ? ' even' : ''}`}>
                  <td className="ps-cell-num">{items.indexOf(item) + 1}</td>
                  <td className="ps-cell-desc"><input className="ps-desc-input" value={item.description} onChange={e => setField(item.id, 'description', e.target.value)} /></td>
                  <td className="ps-cell-unit"><input className="ps-unit-input" value={item.unit} onChange={e => setField(item.id, 'unit', e.target.value)} /></td>
                  <td className="ps-cell-qty"><input type="number" min={1} className="ps-qty-input" value={item.qty} onChange={e => setField(item.id, 'qty', e.target.value)} /></td>
                  {bidders.map(b => (
                    <td key={b.id} className="ps-cell-rate">
                      <div className="ps-rate-wrap">
                        <span className="ps-rand">R</span>
                        <input type="number" min={0} step="0.01" className="ps-rate-input" placeholder="0.00" value={item.rates[b.id] || ''} onChange={e => setRate(item.id, b.id, e.target.value)} />
                      </div>
                    </td>
                  ))}
                  {bidders.map(b => (
                    <td key={`m_${b.id}`} className="ps-cell-monthly">
                      {item.rates[b.id] ? fmt(monthlyFor(item, b.id)) : <span className="ps-dash">—</span>}
                    </td>
                  ))}
                  <td className="ps-cell-action no-print"><button className="td-row-del" onClick={() => removeItem(item.id)}><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </>
          ))}
          <tr className="ps-add-row-tr no-print">
            <td colSpan={4 + bidders.length * 2 + 1}><button className="td-add-row" onClick={addItem}><Plus size={14}/> Add Line Item</button></td>
          </tr>
        </tbody>
        <tfoot>
          {[
            ['MONTHLY TOTAL (excl. VAT)', totalMonthly, 'ps-subtotal-val'],
            ['VAT @ 15%',                 totalVat,     'ps-vat-val'],
            ['MONTHLY TOTAL (incl. VAT)', totalIncVat,  'ps-grand-val'],
            [`TOTAL CONTRACT VALUE (${contractMonths} months, incl. VAT)`, totalContract, 'ps-contract-val'],
          ].map(([label, fn, cls], ri) => (
            <tr key={ri} className={['ps-subtotal-row','ps-vat-row','ps-grand-row','ps-contract-row'][ri]}>
              <td colSpan={4} className="ps-total-label">{label}</td>
              {bidders.map(b => <td key={b.id} />)}
              {bidders.map(b => <td key={`v_${b.id}`} className={cls}>{fmt(fn(b.id))}</td>)}
              <td className="no-print" />
            </tr>
          ))}
        </tfoot>
      </table>

      {/* PPPFA Price Scoring */}
      {bidders.length > 1 && (
        <div className="ps-pppfa-block">
          <h3 className="td-sub-heading">PPPFA Price Points — 80/20 Formula</h3>
          <table className="td-table">
            <thead><tr><th>Bidder</th><th>Contract Total (incl. VAT)</th><th>Price Points (80 max)</th></tr></thead>
            <tbody>
              {(() => {
                const totals = bidders.map(b => ({ b, t: totalContract(b.id) })).filter(x => x.t > 0);
                const pmin = totals.length ? Math.min(...totals.map(x => x.t)) : 0;
                return bidders.map(b => {
                  const pt = totalContract(b.id);
                  const ps = pmin > 0 && pt > 0 ? (80 * (1 - (pt - pmin) / pmin)).toFixed(2) : '—';
                  return <tr key={b.id}><td>{b.company_name}</td><td>{pt > 0 ? fmt(pt) : '—'}</td><td className="ps-price-pts">{ps}</td></tr>;
                });
              })()}
            </tbody>
          </table>
          <p className="ps-formula">Formula: Ps = 80 × (1 − (Pt − Pmin) / Pmin) · Pmin = lowest responsive bid</p>
        </div>
      )}
    </div>
  );

  // ── Declaration block (single bidder) ─────────────────────────────
  const renderDeclaration = (bidder) => (
    <div className="ps-declarations">
      <h3 className="td-sub-heading">Bidder Declaration — {bidder?.company_name}</h3>
      <p className="ps-decl-intro">
        I/We, the undersigned, hereby confirm that the prices submitted are accurate, complete, inclusive of all costs, and valid for the full validity period stated in the RFP. I/We confirm compliance with Sectoral Determination No. 6 (Private Security Industry).
      </p>
      <div className="ps-decl-card" style={{ maxWidth: 420 }}>
        <p className="ps-decl-company">{bidder?.company_name}</p>
        {[
          'Authorised Signatory', 'Name & Designation',
          'Date', 'PSIRA Reg. No.', 'B-BBEE Level',
        ].map(label => (
          <div key={label} className="ps-decl-row"><span>{label}:</span><div className="ps-decl-line" /></div>
        ))}
        <div className="ps-decl-row"><span>Company Stamp:</span><div className="ps-decl-stamp" /></div>
      </div>
    </div>
  );

  return (
    <div className="ps-shell">
      {/* ── Toolbar ── */}
      <div className="ps-toolbar no-print">
        <div className="ps-toolbar-left">
          <button className="back-link" onClick={() => navigate('/')} style={{ marginBottom: 0 }}><ArrowLeft size={15}/> Start Page</button>
          <FileSpreadsheet size={20} className="ps-toolbar-icon" />
          <h1 className="ps-toolbar-title">Pricing Schedule</h1>
          <span className="ps-annexure-tag">Annexure F</span>

          {tenders.length > 0 && (
            <select className="td-tender-select" value={selectedTender} onChange={e => setSelectedTender(e.target.value)}>
              {tenders.map(t => <option key={t.id} value={t.id}>{t.reference_number} — {t.title}</option>)}
            </select>
          )}
        </div>
        <div className="ps-toolbar-right">
          {saved && <span className="td-saved-badge">✓ Saved</span>}
          <button className="btn btn-sm btn-outline" onClick={syncFromDoc}><RefreshCw size={13}/> Sync from Tender Doc</button>
          <button className="btn btn-sm btn-outline" onClick={handleSave}><Save size={13}/> Save</button>
          <button className="btn btn-sm btn-outline" onClick={handleReset}><RotateCcw size={13}/> Reset</button>
          <button className="btn btn-sm" onClick={() => window.print()}><Printer size={13}/> Print / PDF</button>
        </div>
      </div>

      {/* ── Mode selector bar ── */}
      <div className="ps-mode-bar no-print">
        <div className="ps-mode-left">
          {/* Bidder mode toggle */}
          <div className="ps-mode-toggle">
            <button
              className={`ps-mode-btn${viewMode === 'bidder' ? ' active' : ''}`}
              onClick={() => setViewMode('bidder')}
            >
              <User size={14}/> Single Bidder
            </button>
            <button
              className={`ps-mode-btn${viewMode === 'admin' ? ' active' : ''}`}
              onClick={() => {
                if (!adminUnlocked) { setShowUnlockConfirm(true); return; }
                setViewMode('admin');
              }}
            >
              {adminUnlocked ? <Unlock size={14}/> : <Lock size={14}/>} Admin Comparison
            </button>
          </div>

          {/* Bidder selector (only in bidder mode) */}
          {viewMode === 'bidder' && bidders.length > 0 && (
            <div className="ps-bidder-selector">
              <Users size={14} className="ps-bidder-icon" />
              <label className="ps-bidder-label">Viewing as:</label>
              <select
                className="td-tender-select"
                value={activeBidderId}
                onChange={e => setActiveBidderId(e.target.value)}
              >
                {bidders.map(b => <option key={b.id} value={b.id}>{b.company_name}</option>)}
              </select>
            </div>
          )}
        </div>

        {viewMode === 'bidder' && (
          <div className="ps-bidder-notice">
            <User size={13}/>
            Only <strong>{activeBidder?.company_name}</strong> pricing is visible on this form. Other bidders' rates are not shown.
          </div>
        )}
        {viewMode === 'admin' && (
          <div className="ps-admin-notice">
            <Unlock size={13}/>
            Admin view — all bidder prices visible. Do not share screen with bidders.
            <button className="ps-lock-btn" onClick={() => { setAdminUnlocked(false); setViewMode('bidder'); }}><Lock size={12}/> Lock</button>
          </div>
        )}
      </div>

      {/* ── Unlock confirmation overlay ── */}
      {showUnlockConfirm && (
        <div className="ps-overlay">
          <div className="ps-overlay-card">
            <Lock size={32} className="ps-overlay-icon"/>
            <h2 className="ps-overlay-title">Admin Comparison View</h2>
            <p className="ps-overlay-body">
              This view shows pricing from <strong>all bidders</strong> side-by-side. Do not open this view in the presence of any bidder representatives or other parties.
            </p>
            <div className="ps-overlay-actions">
              <button className="btn" onClick={() => { setAdminUnlocked(true); setShowUnlockConfirm(false); setViewMode('admin'); }}>
                <Unlock size={15}/> Yes, I understand — Unlock
              </button>
              <button className="btn btn-outline" onClick={() => setShowUnlockConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bidder company name banner ── */}
      {viewMode === 'bidder' && activeBidder && (
        <div className="ps-bidder-banner">
          <div className="ps-bidder-banner-left">
            <span className="ps-bidder-banner-label">BIDDER</span>
            <span className="ps-bidder-banner-name">{activeBidder.company_name}</span>
          </div>
          {/* Bidder switcher — screen only */}
          <div className="ps-bidder-banner-right no-print">
            <span className="ps-bidder-banner-label">Select bidder:</span>
            <select
              className="ps-bidder-banner-select"
              value={activeBidderId}
              onChange={e => { setActiveBidderId(e.target.value); handleSave(); }}
            >
              {bidders.map(b => <option key={b.id} value={b.id}>{b.company_name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Document ── */}
      <div className="ps-document">
        {/* Header */}
        <div className="ps-header">
          <div className="ps-header-left">
            <div className="ps-logo-area">
              {(() => { const l = localStorage.getItem(`tender_logo_${selectedTender}`); return l ? <img src={l} alt="Logo" className="ps-logo"/> : null; })()}
            </div>
            <div>
              <p className="ps-annexure-label">ANNEXURE F — PRICING SCHEDULE</p>
              <h1 className="ps-title">{selectedTenderObj?.title || 'Security Guarding Services'}</h1>
              <p className="ps-ref">Ref: {selectedTenderObj?.reference_number || '—'} &nbsp;·&nbsp; Closing: {selectedTenderObj?.closing_date ? new Date(selectedTenderObj.closing_date).toLocaleDateString('en-ZA') : '—'}</p>
              {viewMode === 'bidder' && activeBidder && (
                <p className="ps-ref ps-ref-bidder">for: {activeBidder.company_name}</p>
              )}
              {viewMode === 'admin' && (
                <p className="ps-ref ps-ref-admin">⚠ ADMIN COMPARISON — CONFIDENTIAL — NOT FOR DISTRIBUTION</p>
              )}
            </div>
          </div>
          <div className="ps-header-right">
            <div className="ps-contract-months no-print">
              <label className="ps-cm-label">Contract Duration (months)</label>
              <input type="number" min={1} max={120} className="ps-cm-input" value={contractMonths} onChange={e => setContractMonths(+e.target.value || 36)} />
            </div>
            <div className="ps-contract-months print-only">
              <span className="ps-cm-label">Contract Duration:</span>
              <strong style={{ color: 'white' }}> {contractMonths} months</strong>
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div className="ps-instruction">
          <strong>INSTRUCTIONS TO BIDDERS:</strong> Complete the <em>Unit Rate (excl. VAT)</em> column for every line item.
          All rates must be in South African Rand (ZAR). Pricing below Sectoral Determination No. 6 minimum wage rates will result in automatic disqualification.
          VAT is applied at <strong>15%</strong>. Return this completed schedule with your sealed bid submission.
        </div>

        {bidders.length === 0 ? (
          <div className="ps-no-bidders">
            <p>No bidders registered. <button className="ev-bar-link" onClick={() => navigate('/initial-data')}>Register bidders first →</button></p>
          </div>
        ) : viewMode === 'bidder' ? renderSingleBidderTable() : renderAdminTable()}

        {/* Declaration — only in bidder mode on print */}
        {viewMode === 'bidder' && activeBidder && renderDeclaration(activeBidder)}

        {/* Footer */}
        <div className="td-footer">
          <div className="td-footer-line"/>
          <p>
            Annexure F — Pricing Schedule &nbsp;·&nbsp;
            {selectedTenderObj?.reference_number || ''} &nbsp;·&nbsp;
            {viewMode === 'bidder' && activeBidder ? activeBidder.company_name : 'ADMIN COMPARISON'} &nbsp;·&nbsp;
            26 March 2026
          </p>
          <p className="td-footer-conf">CONFIDENTIAL — FOR INVITED BIDDERS ONLY</p>
        </div>
      </div>
    </div>
  );
}
