import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Printer, Edit3, Save, RotateCcw, ChevronDown, ChevronUp,
  Plus, Trash2, ArrowLeft, FileText, Eye, Upload, X, Building2
} from 'lucide-react';
import './TenderDocument.css';

import API from '../api.js';

// ─── Default document data ────────────────────────────────────────
const DEFAULT_DOC = {
  entityName: '[ENTITY NAME]',
  entityAddress: '[Entity Physical Address, City, Province]',
  contactPerson: '[Name & Surname]',
  contactDesignation: 'Supply Chain Manager',
  contactEmail: '[email@entity.gov.za]',
  contactTel: '[+27 XX XXX XXXX]',
  briefingVenue: '[Main Site Address]',
  briefingDate: '[DATE]',
  tenderBoxAddress: '[Physical Address of Tender Box, City, Province, Postal Code]',
  contractDuration: '36 months (with option to extend by 24 months)',
  preferenceSystem: '80/20',
  validityPeriod: '90 days from closing date',
  minFunctionalityScore: '65',
  scopeOverview: `The Client requires a professional security guarding service that ensures the physical protection of personnel, assets, infrastructure, and information across all designated sites. The service must comply with all applicable South African legislation, sectoral determinations, and PSIRA regulations.`,
  reliefFactor: '1.4',
  sites: [
    { id: 1, name: 'Main Office Building', address: '[Address]', hours: '06:00–22:00 Mon–Fri', accessPoints: 3 },
    { id: 2, name: 'Warehouse / Depot',    address: '[Address]', hours: '24/7 continuous',     accessPoints: 2 },
    { id: 3, name: 'Technical Facility',   address: '[Address]', hours: '24/7 continuous',     accessPoints: 1 },
  ],
  personnelSummary: [
    { designation: 'Site Supervisors', grade: 'Grade B', perShift: 4,  fte: 6  },
    { designation: 'Senior Guards',    grade: 'Grade C', perShift: 10, fte: 15 },
    { designation: 'Guards',           grade: 'Grade D', perShift: 18, fte: 28 },
  ],
  vehicles: [
    { type: 'Armed response vehicle',      count: 1, requirement: 'Roadworthy, marked, SAPS Firearms licensed' },
    { type: 'Supervisor patrol vehicle',   count: 1, requirement: 'Marked, roadworthy, GPS tracking' },
    { type: 'Relief/replacement transport',count: 1, requirement: 'Available within 60 minutes' },
  ],
  termsConditions: `1. The appointed service provider must maintain a minimum 90% deployment rate at all times.\n2. Any guard vacancy must be filled within 2 hours of notification.\n3. All incidents must be reported in writing within 2 hours of occurrence.\n4. The service provider must conduct a formal site audit monthly and submit a written report.\n5. Sub-contracting is not permitted without prior written consent from the Client.\n6. All guards must wear the service provider's uniform — no mixing of uniforms.\n7. No guard may serve more than 12 consecutive hours on duty.\n8. The service provider must provide a dedicated account manager reachable 24/7.`,
};

function useDocData(tenderId) {
  const key = `tender_doc_${tenderId || 'default'}`;
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    setDoc(saved ? JSON.parse(saved) : { ...DEFAULT_DOC });
  }, [key]);

  const save = (data) => {
    localStorage.setItem(key, JSON.stringify(data));
    setDoc(data);
  };

  const reset = () => {
    localStorage.removeItem(key);
    setDoc({ ...DEFAULT_DOC });
  };

  return [doc, save, reset];
}

// ─── Inlined editable field ───────────────────────────────────────
function EditField({ value, onChange, editMode, multiline, className = '' }) {
  if (!editMode) return <span className={className}>{value}</span>;
  if (multiline) return (
    <textarea
      className={`td-edit-area ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={Math.max(3, (value || '').split('\n').length)}
    />
  );
  return (
    <input
      className={`td-edit-input ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─── Logo Uploader ────────────────────────────────────────────────
function LogoUploader({ logo, onUpload, onClear, editMode }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onUpload(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  if (!editMode) {
    // Print / preview mode — show logo or nothing
    return logo
      ? <img src={logo} alt="Company Logo" className="td-logo" />
      : <div className="td-logo-placeholder-print"><Building2 size={36} /><span>YOUR LOGO</span></div>;
  }

  return (
    <div className="td-logo-wrap">
      {logo ? (
        <div className="td-logo-uploaded">
          <img src={logo} alt="Company Logo" className="td-logo" />
          <button className="td-logo-clear" onClick={onClear} title="Remove logo"><X size={14} /></button>
        </div>
      ) : (
        <div
          className={`td-logo-dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={22} className="td-logo-upload-icon" />
          <span className="td-logo-upload-label">Upload your logo</span>
          <span className="td-logo-upload-hint">PNG, JPG, SVG · Click or drag & drop</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible section wrapper ─────────────────────────────────
function DocSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="td-section">
      <button className="td-section-toggle" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {title}
      </button>
      {open && <div className="td-section-body">{children}</div>}
    </section>
  );
}

// ─── Logo storage (separate from doc to avoid large base64 in main data) ─────
const LOGO_KEY_PREFIX = 'tender_logo_';

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function TenderDocument() {
  const navigate = useNavigate();
  const printRef = useRef();

  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);

  const [doc, saveDoc, resetDoc] = useDocData(selectedTender);

  // Load tenders
  useEffect(() => {
    axios.get(`${API}/tenders`).then(res => {
      setTenders(res.data);
      if (res.data.length > 0) setSelectedTender(String(res.data[0].id));
    }).catch(() => {});
  }, []);

  // Load logo when tender changes
  useEffect(() => {
    if (!selectedTender) return;
    const stored = localStorage.getItem(`${LOGO_KEY_PREFIX}${selectedTender}`);
    setCompanyLogo(stored || null);
  }, [selectedTender]);

  const handleLogoUpload = (dataUrl) => {
    localStorage.setItem(`${LOGO_KEY_PREFIX}${selectedTender}`, dataUrl);
    setCompanyLogo(dataUrl);
  };

  const handleLogoClear = () => {
    localStorage.removeItem(`${LOGO_KEY_PREFIX}${selectedTender}`);
    setCompanyLogo(null);
  };

  // Auto-populate tender fields when tender changes
  useEffect(() => {
    if (!selectedTender || !tenders.length) return;
    const t = tenders.find(t => String(t.id) === selectedTender);
    if (!t || !doc) return;
    if (doc.tenderTitle === t.title) return; // already populated
    saveDoc({
      ...doc,
      tenderTitle: t.title,
      tenderRef: t.reference_number,
      tenderClosing: new Date(t.closing_date).toLocaleDateString('en-ZA'),
      preferenceSystem: t.system_type,
    });
  }, [selectedTender, tenders]);

  if (!doc) return <div className="td-shell"><p style={{ padding: 40 }}>Loading…</p></div>;

  const set = (key) => (val) => saveDoc({ ...doc, [key]: val });

  const handlePrint = () => window.print();

  const handleSave = () => {
    saveDoc({ ...doc });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Site table helpers
  const addSite = () => saveDoc({ ...doc, sites: [...doc.sites, { id: Date.now(), name: 'New Site', address: '[Address]', hours: '[Hours]', accessPoints: 1 }] });
  const removeSite = (id) => saveDoc({ ...doc, sites: doc.sites.filter(s => s.id !== id) });
  const updateSite = (id, field, val) => saveDoc({ ...doc, sites: doc.sites.map(s => s.id === id ? { ...s, [field]: val } : s) });

  // Personnel helpers
  const addPersonnel = () => saveDoc({ ...doc, personnelSummary: [...doc.personnelSummary, { designation: 'New Role', grade: 'Grade D', perShift: 1, fte: 2 }] });
  const removePersonnel = (i) => saveDoc({ ...doc, personnelSummary: doc.personnelSummary.filter((_, idx) => idx !== i) });
  const updatePersonnel = (i, field, val) => saveDoc({ ...doc, personnelSummary: doc.personnelSummary.map((r, idx) => idx === i ? { ...r, [field]: val } : r) });

  // Vehicle helpers
  const addVehicle = () => saveDoc({ ...doc, vehicles: [...doc.vehicles, { type: 'New Vehicle Type', count: 1, requirement: '' }] });
  const removeVehicle = (i) => saveDoc({ ...doc, vehicles: doc.vehicles.filter((_, idx) => idx !== i) });
  const updateVehicle = (i, field, val) => saveDoc({ ...doc, vehicles: doc.vehicles.map((r, idx) => idx === i ? { ...r, [field]: val } : r) });

  const selectedTenderObj = tenders.find(t => String(t.id) === selectedTender);

  return (
    <div className="td-shell">
      {/* ── Toolbar ── */}
      <div className="td-toolbar no-print">
        <div className="td-toolbar-left">
          <button className="back-link" onClick={() => navigate('/')} style={{ marginBottom: 0 }}>
            <ArrowLeft size={15} /> Menu
          </button>
          <FileText size={20} className="td-toolbar-icon" />
          <h1 className="td-toolbar-title">Tender Document</h1>

          {tenders.length > 0 && (
            <select
              className="td-tender-select"
              value={selectedTender}
              onChange={e => setSelectedTender(e.target.value)}
            >
              {tenders.map(t => <option key={t.id} value={t.id}>{t.reference_number} — {t.title}</option>)}
            </select>
          )}
        </div>

        <div className="td-toolbar-right">
          {saved && <span className="td-saved-badge">✓ Saved</span>}
          <button
            className={`btn btn-sm${editMode ? ' active-edit' : ' btn-outline'}`}
            onClick={() => setEditMode(e => !e)}
          >
            {editMode ? <><Eye size={15} /> Preview</> : <><Edit3 size={15} /> Edit</>}
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleSave}>
            <Save size={15} /> Save
          </button>
          <button className="btn btn-sm btn-outline" onClick={resetDoc}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="btn btn-sm" onClick={handlePrint}>
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {editMode && (
        <div className="td-edit-notice no-print">
          ✏️ Edit Mode — click any field to modify content. Changes are saved to browser storage per tender.
        </div>
      )}

      {/* ── Printable Document ── */}
      <div className="td-document" ref={printRef}>

        {/* Cover Page */}
        <div className="td-cover">
          <div className="td-cover-logo">
            <LogoUploader
              logo={companyLogo}
              onUpload={handleLogoUpload}
              onClear={handleLogoClear}
              editMode={editMode}
            />
          </div>
          <div className="td-cover-body">
            <p className="td-cover-label">REQUEST FOR PROPOSALS (RFP)</p>
            <h1 className="td-cover-title">
              <EditField value={doc.tenderTitle || 'PROVISION OF SECURITY GUARDING SERVICES'} onChange={set('tenderTitle')} editMode={editMode} />
            </h1>
            <div className="td-cover-meta">
              <div className="td-cover-row">
                <span className="td-meta-label">Document Reference:</span>
                <span className="td-meta-val"><EditField value={doc.tenderRef || '[ENTITY-REF/YEAR/001]'} onChange={set('tenderRef')} editMode={editMode} /></span>
              </div>
              <div className="td-cover-row">
                <span className="td-meta-label">Issue Date:</span>
                <span className="td-meta-val">26 March 2026</span>
              </div>
              <div className="td-cover-row">
                <span className="td-meta-label">Closing Date &amp; Time:</span>
                <span className="td-meta-val"><EditField value={doc.tenderClosing || '[DATE] at 11:00'} onChange={set('tenderClosing')} editMode={editMode} /> at 11:00</span>
              </div>
              <div className="td-cover-row">
                <span className="td-meta-label">Validity Period:</span>
                <span className="td-meta-val"><EditField value={doc.validityPeriod} onChange={set('validityPeriod')} editMode={editMode} /></span>
              </div>
              <div className="td-cover-row">
                <span className="td-meta-label">Contract Duration:</span>
                <span className="td-meta-val"><EditField value={doc.contractDuration} onChange={set('contractDuration')} editMode={editMode} /></span>
              </div>
              <div className="td-cover-row">
                <span className="td-meta-label">Preference System:</span>
                <span className="td-meta-val">PPPFA <EditField value={doc.preferenceSystem} onChange={set('preferenceSystem')} editMode={editMode} /></span>
              </div>
            </div>
            <div className="td-cover-notice">
              <strong>CONFIDENTIAL —</strong> This document is issued to invited bidders only and may not be shared without written consent.
            </div>
          </div>
        </div>

        <div className="td-page-break" />

        {/* Part A — Invitation */}
        <DocSection title="PART A — Invitation to Bid">
          <p>
            <EditField value={doc.entityName} onChange={set('entityName')} editMode={editMode} className="td-entity-name" />
            {' '}(hereinafter referred to as "the Client") hereby invites suitably qualified and experienced security service providers to submit proposals for the provision of security guarding services at the sites listed in Part C.
          </p>

          <h3 className="td-sub-heading">A1. Issuing Entity</h3>
          <table className="td-table">
            <tbody>
              {[
                ['Entity Name', 'entityName'],
                ['Physical Address', 'entityAddress'],
                ['Contact Person', 'contactPerson'],
                ['Designation', 'contactDesignation'],
                ['Email', 'contactEmail'],
                ['Telephone', 'contactTel'],
              ].map(([label, key]) => (
                <tr key={key}>
                  <td className="td-table-label">{label}</td>
                  <td><EditField value={doc[key]} onChange={set(key)} editMode={editMode} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="td-sub-heading">A2. Compulsory Briefing Session</h3>
          <table className="td-table">
            <tbody>
              <tr><td className="td-table-label">Venue</td><td><EditField value={doc.briefingVenue} onChange={set('briefingVenue')} editMode={editMode} /></td></tr>
              <tr><td className="td-table-label">Date</td><td><EditField value={doc.briefingDate} onChange={set('briefingDate')} editMode={editMode} /></td></tr>
              <tr><td className="td-table-label">Time</td><td>10:00</td></tr>
              <tr><td className="td-table-label">Note</td><td>Attendance mandatory — failure renders bid non-responsive</td></tr>
            </tbody>
          </table>

          <h3 className="td-sub-heading">A3. Bid Submission</h3>
          <p>Bids must be sealed and deposited in the Tender Box at:</p>
          <div className="td-address-block">
            <EditField value={doc.tenderBoxAddress} onChange={set('tenderBoxAddress')} editMode={editMode} multiline />
          </div>
          <p><strong>Electronic submissions are NOT accepted. Late bids will be returned unopened.</strong></p>
        </DocSection>

        {/* Part B — Scope */}
        <DocSection title="PART B — Scope of Services">
          <h3 className="td-sub-heading">B1. Overview</h3>
          <EditField value={doc.scopeOverview} onChange={set('scopeOverview')} editMode={editMode} multiline />

          <h3 className="td-sub-heading">B2. Key Service Deliverables</h3>
          <EditField
            value={doc.scopeDeliverables || `1. Static Guarding — deployment of PSIRA-registered guards at designated access and patrol points.\n2. Access Control — management of all personnel, contractor, and visitor access to all sites.\n3. Patrol & Monitoring — regular internal and external patrols using clocking/guard monitoring systems.\n4. Incident Response — immediate response to emergencies, alarms, and security incidents.\n5. Threat Management — implementation of threat and vulnerability assessments per site.\n6. Reporting — daily occurrence books, shift reports, monthly performance reports, and incident reports within 2 hours.\n7. Armed Response Backup — 24/7 armed response linked to a PSIRA Grade A control room.`}
            onChange={set('scopeDeliverables')}
            editMode={editMode}
            multiline
          />
        </DocSection>

        {/* Part C — Sites */}
        <DocSection title="PART C — Site Requirements">
          <h3 className="td-sub-heading">C1. Site Schedule</h3>
          <table className="td-table td-wide-table">
            <thead>
              <tr>
                <th>#</th><th>Site Name</th><th>Address</th><th>Operating Hours</th><th>Access Points</th>
                {editMode && <th className="no-print">Action</th>}
              </tr>
            </thead>
            <tbody>
              {doc.sites.map((site, i) => (
                <tr key={site.id}>
                  <td>{i + 1}</td>
                  <td>{editMode ? <input className="td-cell-input" value={site.name} onChange={e => updateSite(site.id, 'name', e.target.value)} /> : site.name}</td>
                  <td>{editMode ? <input className="td-cell-input" value={site.address} onChange={e => updateSite(site.id, 'address', e.target.value)} /> : site.address}</td>
                  <td>{editMode ? <input className="td-cell-input" value={site.hours} onChange={e => updateSite(site.id, 'hours', e.target.value)} /> : site.hours}</td>
                  <td style={{ textAlign: 'center' }}>{editMode ? <input className="td-cell-input td-num-input" type="number" value={site.accessPoints} onChange={e => updateSite(site.id, 'accessPoints', +e.target.value)} /> : site.accessPoints}</td>
                  {editMode && <td className="no-print"><button className="td-row-del" onClick={() => removeSite(site.id)}><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {editMode && (
            <button className="td-add-row no-print" onClick={addSite}><Plus size={14} /> Add Site</button>
          )}

          <h3 className="td-sub-heading">C2. Minimum Guard Deployment Summary</h3>
          <p>Relief factor: <strong><EditField value={doc.reliefFactor} onChange={set('reliefFactor')} editMode={editMode} /></strong>× base posts to cover leave, training, and public holidays.</p>
          <table className="td-table">
            <thead>
              <tr><th>Designation</th><th>Grade</th><th>Per Shift</th><th>Total FTEs</th>{editMode && <th className="no-print">Del</th>}</tr>
            </thead>
            <tbody>
              {doc.personnelSummary.map((row, i) => (
                <tr key={i}>
                  <td>{editMode ? <input className="td-cell-input" value={row.designation} onChange={e => updatePersonnel(i, 'designation', e.target.value)} /> : row.designation}</td>
                  <td>{editMode ? <input className="td-cell-input" value={row.grade} onChange={e => updatePersonnel(i, 'grade', e.target.value)} /> : row.grade}</td>
                  <td style={{ textAlign: 'center' }}>{editMode ? <input className="td-cell-input td-num-input" type="number" value={row.perShift} onChange={e => updatePersonnel(i, 'perShift', +e.target.value)} /> : row.perShift}</td>
                  <td style={{ textAlign: 'center' }}>{editMode ? <input className="td-cell-input td-num-input" type="number" value={row.fte} onChange={e => updatePersonnel(i, 'fte', +e.target.value)} /> : row.fte}</td>
                  {editMode && <td className="no-print"><button className="td-row-del" onClick={() => removePersonnel(i)}><Trash2 size={14} /></button></td>}
                </tr>
              ))}
              <tr className="td-total-row">
                <td colSpan={2}><strong>TOTAL</strong></td>
                <td style={{ textAlign: 'center' }}><strong>{doc.personnelSummary.reduce((a, r) => a + (+r.perShift || 0), 0)}</strong></td>
                <td style={{ textAlign: 'center' }}><strong>{doc.personnelSummary.reduce((a, r) => a + (+r.fte || 0), 0)}</strong></td>
                {editMode && <td />}
              </tr>
            </tbody>
          </table>
          {editMode && <button className="td-add-row no-print" onClick={addPersonnel}><Plus size={14} /> Add Role</button>}
        </DocSection>

        {/* Part D — Personnel */}
        <DocSection title="PART D — Personnel Requirements">
          <h3 className="td-sub-heading">D1. PSIRA Registration Requirements</h3>
          <EditField
            value={doc.psiraReqs || `• All guards: valid PSIRA registration certificate (Grade D or above)\n• Supervisors: Grade B minimum\n• Senior Management/Control Room: Grade A\n• Bidder must submit PSIRA business registration certificate + individual certificates for all proposed staff`}
            onChange={set('psiraReqs')}
            editMode={editMode}
            multiline
          />

          <h3 className="td-sub-heading">D2. Vetting & Training Requirements</h3>
          <EditField
            value={doc.vettingReqs || `• Criminal background check: cleared — no convictions\n• Identity verification: SA ID verified against Home Affairs\n• Previous employment verification: last 3 employers\n• Drug screening: pre-deployment and random quarterly\n• PSIRA basic training: completed and certified (pre-deployment)\n• First Aid Level 1: minimum 1 per shift\n• Emergency procedures training: annually\n• Health & Safety induction: OHSA compliant, before deployment`}
            onChange={set('vettingReqs')}
            editMode={editMode}
            multiline
          />

          <h3 className="td-sub-heading">D3. Employment Conditions</h3>
          <EditField
            value={doc.employmentConditions || `All personnel must be employed in accordance with Sectoral Determination No. 6 (Private Security Industry). Proof of wage compliance, employment contracts, and UIF/PAYE/Skills Levy deductions must be available for inspection on request.`}
            onChange={set('employmentConditions')}
            editMode={editMode}
            multiline
          />
        </DocSection>

        {/* Part E — Equipment & Vehicles */}
        <DocSection title="PART E — Equipment & Vehicle Requirements">
          <h3 className="td-sub-heading">E1. Communications & Monitoring Equipment</h3>
          <EditField
            value={doc.equipmentReqs || `• Two-way radios: 1 per guard post + 1 spare per site (operational and charged)\n• Guard monitoring system: MANDATORY electronic guard tour system — 100% coverage of all patrol routes, 12-month data retention\n• PSIRA Grade A control room: operational 24/7 with backup power (minimum 4 hours)\n• Response time: maximum 20 minutes (urban) / 45 minutes (rural)\n• Alarm system integration: interface with central monitoring`}
            onChange={set('equipmentReqs')}
            editMode={editMode}
            multiline
          />

          <h3 className="td-sub-heading">E2. Vehicle Requirements</h3>
          <table className="td-table td-wide-table">
            <thead>
              <tr><th>Vehicle Type</th><th>Min. Count</th><th>Requirements</th>{editMode && <th className="no-print">Del</th>}</tr>
            </thead>
            <tbody>
              {doc.vehicles.map((v, i) => (
                <tr key={i}>
                  <td>{editMode ? <input className="td-cell-input" value={v.type} onChange={e => updateVehicle(i, 'type', e.target.value)} /> : v.type}</td>
                  <td style={{ textAlign: 'center' }}>{editMode ? <input className="td-cell-input td-num-input" type="number" value={v.count} onChange={e => updateVehicle(i, 'count', +e.target.value)} /> : v.count}</td>
                  <td>{editMode ? <input className="td-cell-input" value={v.requirement} onChange={e => updateVehicle(i, 'requirement', e.target.value)} /> : v.requirement}</td>
                  {editMode && <td className="no-print"><button className="td-row-del" onClick={() => removeVehicle(i)}><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {editMode && <button className="td-add-row no-print" onClick={addVehicle}><Plus size={14} /> Add Vehicle Type</button>}

          <h3 className="td-sub-heading">E3. Vehicle Standards (all vehicles)</h3>
          <EditField
            value={doc.vehicleStandards || `• Valid roadworthiness certificate\n• Comprehensive insurance: minimum R5 million per incident\n• Company livery: clearly marked with company name and PSIRA number\n• GPS tracking: active 24/7 — access portal to be granted to Client\n• Fire extinguisher: 1 kg powder per vehicle\n• First aid kit: compliant, sealed`}
            onChange={set('vehicleStandards')}
            editMode={editMode}
            multiline
          />
        </DocSection>

        {/* Part F — Full Evaluation Criteria */}
        <DocSection title="PART F — Functionality Evaluation Criteria">
          <p>
            Bidders must score a minimum of <strong><EditField value={doc.minFunctionalityScore} onChange={set('minFunctionalityScore')} editMode={editMode} />%</strong> on the Functionality Evaluation to be deemed technically compliant. Non-compliant bids will be disqualified from financial evaluation.
          </p>
          <p>
            Each criterion will be assessed by an independent evaluation panel and scored on the compliance scale below. Bidders must address every criterion in their proposals and provide the required supporting evidence. Unsupported claims will be treated as <strong>Supposedly Compliant (50%)</strong>.
          </p>

          {/* Scoring Scale */}
          <h3 className="td-sub-heading">F0. Compliance Scoring Scale</h3>
          <table className="td-table">
            <thead>
              <tr><th>Level</th><th>Multiplier</th><th>Meaning &amp; Evidence Expectation</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Not Applicable</strong></td><td>0%</td><td>Criterion does not apply to this contract — bidder must motivate in writing</td></tr>
              <tr><td><strong>Non-Compliant</strong></td><td>0%</td><td>Does not meet the requirement — no qualifying evidence provided</td></tr>
              <tr><td><strong>Supposedly Compliant</strong></td><td>50%</td><td>Claim made but insufficient or vague supporting evidence provided</td></tr>
              <tr><td><strong>Compliant</strong></td><td>80%</td><td>Meets the requirement; clear supporting evidence provided</td></tr>
              <tr><td><strong>Excellent</strong></td><td>100%</td><td>Exceeds the requirement; comprehensive, verifiable evidence provided</td></tr>
            </tbody>
          </table>

          {/* Section 1 — Guarding Personnel */}
          <h3 className="td-sub-heading" style={{ marginTop: 24 }}>F1. Guarding Personnel &nbsp;<span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#6b7280' }}>(100 points maximum)</span></h3>
          <p>Bidders must demonstrate the quality, capability and conditions of their guarding personnel. Address each criterion below with evidence in your proposal.</p>

          <table className="td-table td-wide-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Sub-section</th>
                <th>Criterion</th>
                <th style={{ width: 60, textAlign: 'center' }}>Max Pts</th>
                <th>Required Evidence / Bidder Response</th>
              </tr>
            </thead>
            <tbody>
              <tr className="td-criteria-sub"><td colSpan={5}><strong>1.1 — Experience</strong></td></tr>
              <tr><td>1</td><td>1.1</td><td>Experience in the industry</td><td style={{ textAlign: 'center' }}>10</td><td>Company history, years in operation, notable contracts, PSIRA business registration date</td></tr>
              <tr className="even"><td>2</td><td>1.1</td><td>Contract-specific experience</td><td style={{ textAlign: 'center' }}>10</td><td>Experience in similar environments (government, industrial, commercial) — reference contracts</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>1.2 — Skills and Capabilities</strong></td></tr>
              <tr><td>3</td><td>1.2</td><td>Basic training</td><td style={{ textAlign: 'center' }}>5</td><td>PSIRA Grade D–A certificates, SETA accreditation evidence</td></tr>
              <tr className="even"><td>4</td><td>1.2</td><td>Additional training</td><td style={{ textAlign: 'center' }}>5</td><td>First Aid, Fire Fighting, OHSA, Incident Management certificates</td></tr>
              <tr><td>5</td><td>1.2</td><td>Contract-specific training</td><td style={{ textAlign: 'center' }}>8</td><td>Site-specific induction plan, SOP training methodology for this contract</td></tr>
              <tr className="even"><td>6</td><td>1.2</td><td>Recurring / refresher training</td><td style={{ textAlign: 'center' }}>5</td><td>Annual training calendar, proof of refresher frequency</td></tr>
              <tr><td>7</td><td>1.2</td><td>Other skills</td><td style={{ textAlign: 'center' }}>5</td><td>Firearm competency, K9 handler certification, CCTV operation, access control</td></tr>
              <tr className="even"><td>8</td><td>1.2</td><td>Career opportunities</td><td style={{ textAlign: 'center' }}>5</td><td>Promotion pathways, learnerships, career development plan</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>1.3 — Selection, Recruitment &amp; Vetting</strong></td></tr>
              <tr><td>9</td><td>1.3</td><td>Recruitment and selection methodology</td><td style={{ textAlign: 'center' }}>15</td><td>Recruitment process document, selection criteria, psychometric or competency assessments</td></tr>
              <tr className="even"><td>10</td><td>1.3</td><td>Vetting</td><td style={{ textAlign: 'center' }}>10</td><td>Criminal record checks, identity verification (Home Affairs), pre-employment drug screening policy</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>1.4 — Employment Conditions</strong></td></tr>
              <tr><td>11</td><td>1.4</td><td>Salary and benefit levels</td><td style={{ textAlign: 'center' }}>10</td><td>Current pay scales vs Sectoral Determination No. 6 (must exceed minimum), benefits schedule</td></tr>
              <tr className="even"><td>12</td><td>1.4</td><td>Working conditions</td><td style={{ textAlign: 'center' }}>8</td><td>Maximum consecutive hours policy, shift rotation schedule, leave entitlement</td></tr>
              <tr><td>13</td><td>1.4</td><td>Other criteria</td><td style={{ textAlign: 'center' }}>4</td><td>Wellness programme, EAP, uniform provision and maintenance</td></tr>

              <tr className="td-total-row"><td colSpan={3}><strong>SECTION TOTAL</strong></td><td style={{ textAlign: 'center' }}><strong>100</strong></td><td /></tr>
            </tbody>
          </table>

          {/* Section 2 — Contract Management */}
          <h3 className="td-sub-heading" style={{ marginTop: 28 }}>F2. Contract Management / Operations &nbsp;<span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#6b7280' }}>(100 points maximum)</span></h3>
          <p>Bidders must demonstrate their operational management capability and responsiveness. Address each criterion with documentary evidence.</p>

          <table className="td-table td-wide-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Sub-section</th>
                <th>Criterion</th>
                <th style={{ width: 60, textAlign: 'center' }}>Max Pts</th>
                <th>Required Evidence / Bidder Response</th>
              </tr>
            </thead>
            <tbody>
              <tr className="td-criteria-sub"><td colSpan={5}><strong>2.1 — The Management Team</strong></td></tr>
              <tr><td>1</td><td>2.1</td><td>Structure, organisation and skills of the management team</td><td style={{ textAlign: 'center' }}>10</td><td>Organogram with names, qualifications, years of experience per manager</td></tr>
              <tr className="even"><td>2</td><td>2.1</td><td>Contract-specific know-how of the management team</td><td style={{ textAlign: 'center' }}>10</td><td>CVs of proposed management team, demonstrating relevant contract environment experience</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>2.2 — On-Site Contract Manager</strong></td></tr>
              <tr><td>3</td><td>2.2</td><td>Skills and experience</td><td style={{ textAlign: 'center' }}>8</td><td>CV of proposed Contract Manager — minimum Grade B PSIRA, 3+ years contract management</td></tr>
              <tr className="even"><td>4</td><td>2.2</td><td>Contract-specific know-how</td><td style={{ textAlign: 'center' }}>8</td><td>Demonstrated knowledge of the tendered environment in CV or cover letter</td></tr>
              <tr><td>5</td><td>2.2</td><td>Contract-specific training</td><td style={{ textAlign: 'center' }}>8</td><td>Contract Manager's relevant training certificates (OHSA, SLA management, risk management)</td></tr>
              <tr className="even"><td>6</td><td>2.2</td><td>Availability</td><td style={{ textAlign: 'center' }}>6</td><td>Confirmation of dedicated assignment (% of time), backup/stand-in arrangement</td></tr>
              <tr><td>7</td><td>2.2</td><td>Response time</td><td style={{ textAlign: 'center' }}>6</td><td>Committed response time commitment in writing (e.g. 30 minutes on-site for incidents)</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>2.3 — Rostering</strong></td></tr>
              <tr><td>8</td><td>2.3</td><td>Rostering methodology</td><td style={{ textAlign: 'center' }}>8</td><td>Sample roster, rostering system used, statutory compliance (no split shifts &gt;12 hrs)</td></tr>
              <tr className="even"><td>9</td><td>2.3</td><td>Back-up capacity</td><td style={{ textAlign: 'center' }}>7</td><td>Relief / standby pool available within the area — deployment within 2 hours</td></tr>
              <tr><td>10</td><td>2.3</td><td>General and client-specific procedures</td><td style={{ textAlign: 'center' }}>7</td><td>SOP document or sample post orders relevant to this type of contract</td></tr>
              <tr className="even"><td>11</td><td>2.3</td><td>Reporting</td><td style={{ textAlign: 'center' }}>6</td><td>Occurrence book format, shift report, monthly management report samples</td></tr>
              <tr><td>12</td><td>2.3</td><td>Client contact</td><td style={{ textAlign: 'center' }}>6</td><td>Account manager contact structure, 24/7 escalation line commitment</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>2.4 — Support Services</strong></td></tr>
              <tr><td>13</td><td>2.4</td><td>Inspections</td><td style={{ textAlign: 'center' }}>5</td><td>Inspection frequency, inspection checklist sample, reporting format</td></tr>
              <tr className="even"><td>14</td><td>2.4</td><td>HQ Support</td><td style={{ textAlign: 'center' }}>4</td><td>Head office support structure — HR, payroll, compliance, legal available to contract</td></tr>
              <tr><td>15</td><td>2.4</td><td>Other criteria</td><td style={{ textAlign: 'center' }}>1</td><td>Any additional operational support or value-added services offered</td></tr>

              <tr className="td-total-row"><td colSpan={3}><strong>SECTION TOTAL</strong></td><td style={{ textAlign: 'center' }}><strong>100</strong></td><td /></tr>
            </tbody>
          </table>

          {/* Section 3 — Contract Infrastructure */}
          <h3 className="td-sub-heading" style={{ marginTop: 28 }}>F3. Contract Infrastructure &nbsp;<span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#6b7280' }}>(100 points maximum)</span></h3>
          <p>Bidders must demonstrate the physical and technical resources available to service this contract. Include asset registers, certificates and integration capabilities.</p>

          <table className="td-table td-wide-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Sub-section</th>
                <th>Criterion</th>
                <th style={{ width: 60, textAlign: 'center' }}>Max Pts</th>
                <th>Required Evidence / Bidder Response</th>
              </tr>
            </thead>
            <tbody>
              <tr className="td-criteria-sub"><td colSpan={5}><strong>3.1 — Equipment</strong></td></tr>
              <tr><td>1</td><td>3.1</td><td>Communications tools and systems</td><td style={{ textAlign: 'center' }}>10</td><td>Two-way radio asset list, radio licence, communication protocol</td></tr>
              <tr className="even"><td>2</td><td>3.1</td><td>IT hardware and software</td><td style={{ textAlign: 'center' }}>8</td><td>Incident management system, reporting software, mobile device policy</td></tr>
              <tr><td>3</td><td>3.1</td><td>Uniforms and personal protective equipment</td><td style={{ textAlign: 'center' }}>8</td><td>Uniform specification, PPE schedule (reflective vests, torches, wet weather gear)</td></tr>
              <tr className="even"><td>4</td><td>3.1</td><td>Weapons — type, licensing and control</td><td style={{ textAlign: 'center' }}>8</td><td>Firearm licences, safe storage certificate, Firearms Control Act compliance</td></tr>
              <tr><td>5</td><td>3.1</td><td>Vehicles — fleet, condition and GPS tracking</td><td style={{ textAlign: 'center' }}>10</td><td>Vehicle fleet list (reg. numbers, roadworthy certificates, GPS provider, insurance schedule)</td></tr>
              <tr className="even"><td>6</td><td>3.1</td><td>Dogs — SAPS-registered K9 units (if applicable)</td><td style={{ textAlign: 'center' }}>5</td><td>SAPS K9 registration certificates, handler licences, health certificates</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>3.2 — Technical Support</strong></td></tr>
              <tr><td>7</td><td>3.2</td><td>CCTV provision or integration capability</td><td style={{ textAlign: 'center' }}>10</td><td>CCTV system capability (own or third-party integration), monitoring access proposal</td></tr>
              <tr className="even"><td>8</td><td>3.2</td><td>Guard control / monitoring system (electronic)</td><td style={{ textAlign: 'center' }}>8</td><td>Guard tour system specification, data retention period (minimum 12 months), client access portal</td></tr>
              <tr><td>9</td><td>3.2</td><td>Access control system — biometric / card</td><td style={{ textAlign: 'center' }}>8</td><td>Access control technology proposal, integration with existing client systems if applicable</td></tr>
              <tr className="even"><td>10</td><td>3.2</td><td>Alarm installation and monitoring capability</td><td style={{ textAlign: 'center' }}>8</td><td>Alarm monitoring agreement, Grade A control room link, response time commitment</td></tr>
              <tr><td>11</td><td>3.2</td><td>Central monitoring — PSIRA Grade A control room</td><td style={{ textAlign: 'center' }}>10</td><td>PSIRA Grade A certificate (own or sub-contracted), backup power spec (min 4 hrs), 24/7 staffing</td></tr>
              <tr className="even"><td>12</td><td>3.2</td><td>Other technical systems</td><td style={{ textAlign: 'center' }}>7</td><td>Body-worn cameras, drone capability, smart patrol platforms — certificate/spec sheet</td></tr>

              <tr className="td-total-row"><td colSpan={3}><strong>SECTION TOTAL</strong></td><td style={{ textAlign: 'center' }}><strong>100</strong></td><td /></tr>
            </tbody>
          </table>

          {/* Section 4 — The Company */}
          <h3 className="td-sub-heading" style={{ marginTop: 28 }}>F4. The Company &nbsp;<span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#6b7280' }}>(100 points maximum)</span></h3>
          <p>Bidders must demonstrate organisational strength, compliance maturity and financial stability. All certificates must be valid at time of bid submission.</p>

          <table className="td-table td-wide-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Sub-section</th>
                <th>Criterion</th>
                <th style={{ width: 60, textAlign: 'center' }}>Max Pts</th>
                <th>Required Evidence / Bidder Response</th>
              </tr>
            </thead>
            <tbody>
              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.1 — Structure and Organisation</strong></td></tr>
              <tr><td>1</td><td>4.1</td><td>Organisation chart — clear reporting lines</td><td style={{ textAlign: 'center' }}>5</td><td>Corporate organogram with names, roles and reporting lines to this contract</td></tr>
              <tr className="even"><td>2</td><td>4.1</td><td>Range of security services offered</td><td style={{ textAlign: 'center' }}>5</td><td>Company profile listing all service lines (guarding, investigations, response, technology)</td></tr>
              <tr><td>3</td><td>4.1</td><td>Health, safety and environmental resources</td><td style={{ textAlign: 'center' }}>5</td><td>OHSA compliance certificate, OHS representative appointment, incident rate statistics</td></tr>
              <tr className="even"><td>4</td><td>4.1</td><td>Company procedures and quality management</td><td style={{ textAlign: 'center' }}>5</td><td>ISO 9001 certificate or equivalent QMS — or documented quality procedures</td></tr>
              <tr><td>5</td><td>4.1</td><td>24-hour control room support and escalation</td><td style={{ textAlign: 'center' }}>5</td><td>Control room certificate, 24/7 escalation matrix, backup communications plan</td></tr>
              <tr className="even"><td>6</td><td>4.1</td><td>Membership of trade associations (SASA, SASSETA, etc.)</td><td style={{ textAlign: 'center' }}>5</td><td>SASA/SASSETA/SABA or equivalent membership certificates</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.2 — Security Philosophy</strong></td></tr>
              <tr><td>7</td><td>4.2</td><td>Security philosophy and approach to service delivery</td><td style={{ textAlign: 'center' }}>10</td><td>Written philosophy statement, approach to this contract, threat-and-vulnerability methodology</td></tr>
              <tr className="even"><td>8</td><td>4.2</td><td>Track record and contract retention rate</td><td style={{ textAlign: 'center' }}>10</td><td>List of current and recent contracts (last 5 years), retention statistics, loss of contract explanations if any</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.3 — Quality</strong></td></tr>
              <tr><td>9</td><td>4.3</td><td>Quality management — ISO 9001 or equivalent standard</td><td style={{ textAlign: 'center' }}>10</td><td>Valid ISO 9001 certificate or documented QMS with audit evidence</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.4 — Human Resource Management</strong></td></tr>
              <tr><td>10</td><td>4.4</td><td>HR philosophy, policies and people practices</td><td style={{ textAlign: 'center' }}>5</td><td>HR policy extract, disciplinary code, grievance procedure</td></tr>
              <tr className="even"><td>11</td><td>4.4</td><td>Number of employees (total, guards, supervisors)</td><td style={{ textAlign: 'center' }}>5</td><td>Headcount breakdown by category — total, PSIRA-registered, supervisory and management</td></tr>
              <tr><td>12</td><td>4.4</td><td>Staff turnover rate (lower is better)</td><td style={{ textAlign: 'center' }}>5</td><td>Annual turnover % for last 2 years — guard / supervisor / management level</td></tr>
              <tr className="even"><td>13</td><td>4.4</td><td>Absenteeism management</td><td style={{ textAlign: 'center' }}>5</td><td>Absenteeism management policy, monthly average absence rate for last 12 months</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.5 — References</strong></td></tr>
              <tr><td>14</td><td>4.5</td><td>Sector-related references (minimum 2)</td><td style={{ textAlign: 'center' }}>5</td><td>Reference letters on client letterhead — name, contact number, contract value, duration</td></tr>
              <tr className="even"><td>15</td><td>4.5</td><td>Contract-related references (same environment)</td><td style={{ textAlign: 'center' }}>5</td><td>References specifically from similar contract environments (government, industrial, etc.)</td></tr>
              <tr><td>16</td><td>4.5</td><td>Relevant experience on similar tendered contracts</td><td style={{ textAlign: 'center' }}>5</td><td>List of public-sector / PPPFA procurement contracts awarded in last 5 years</td></tr>

              <tr className="td-criteria-sub"><td colSpan={5}><strong>4.6 — Certification and Awards</strong></td></tr>
              <tr><td>17</td><td>4.6</td><td>Relevant certifications (ISO, OHSAS, etc.)</td><td style={{ textAlign: 'center' }}>5</td><td>All valid industry certifications — ISO 9001, ISO 14001, OHSAS 18001, SABS mark etc.</td></tr>
              <tr className="even"><td>18</td><td>4.6</td><td>Industry awards or recognition</td><td style={{ textAlign: 'center' }}>5</td><td>SASA awards, SASSETA recognition, media coverage, industry body endorsements</td></tr>

              <tr className="td-total-row"><td colSpan={3}><strong>SECTION TOTAL</strong></td><td style={{ textAlign: 'center' }}><strong>100</strong></td><td /></tr>
            </tbody>
          </table>

          {/* Grand total */}
          <table className="td-table" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Section</th><th>Description</th><th style={{ textAlign: 'center' }}>Max Points</th></tr>
            </thead>
            <tbody>
              <tr><td>F1</td><td>Guarding Personnel</td><td style={{ textAlign: 'center' }}>100</td></tr>
              <tr><td>F2</td><td>Contract Management / Operations</td><td style={{ textAlign: 'center' }}>100</td></tr>
              <tr><td>F3</td><td>Contract Infrastructure</td><td style={{ textAlign: 'center' }}>100</td></tr>
              <tr><td>F4</td><td>The Company</td><td style={{ textAlign: 'center' }}>100</td></tr>
              <tr className="td-total-row"><td colSpan={2}><strong>GRAND TOTAL</strong></td><td style={{ textAlign: 'center' }}><strong>400</strong></td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: '0.84rem', color: '#6b7280', marginTop: 10 }}>
            Minimum qualifying score: <strong><EditField value={doc.minFunctionalityScore} onChange={set('minFunctionalityScore')} editMode={editMode} />%</strong> of 400 points = <strong>{Math.round((parseFloat(doc.minFunctionalityScore) || 65) * 4)} points</strong>. Bids below this threshold will not proceed to financial evaluation.
          </p>
        </DocSection>

        {/* Part G — PPPFA */}
        <DocSection title="PART G — Price & PPPFA Preference Points">
          <EditField
            value={doc.pppfaText || `Bidders must complete the Pricing Schedule (Annexure F) with monthly rates for all guard posts, vehicles, and management fees. Pricing below Sectoral Determination No. 6 minimum wage rates will result in automatic disqualification.\n\nPrice Points Formula (80/20 system):\nPs = 80 × (1 − (Pt − Pmin) / Pmin)\nWhere Ps = points scored, Pt = bid price, Pmin = lowest responsive bid\n\nB-BBEE contributions: Level 1 = 20 pts, Level 2 = 18 pts, Level 3 = 14 pts, Level 4 = 12 pts, Level 5 = 8 pts, Level 6 = 6 pts, Level 7 = 4 pts, Level 8 = 2 pts, Non-compliant = 0 pts.`}
            onChange={set('pppfaText')}
            editMode={editMode}
            multiline
          />
        </DocSection>

        {/* Part H — Submission Checklist */}
        <DocSection title="PART H — Bid Submission Checklist">
          <EditField
            value={doc.checklistText || `[M] = Mandatory — incomplete bids will be disqualified\n\n[M] Signed SBD 1 — Invitation to Bid\n[M] Signed SBD 4 — Declaration of Interest\n[M] Signed SBD 6.1 — Preference Points Claim Form\n[M] Signed SBD 8 — Declaration of Past Supply Chain Practices\n[M] Signed SBD 9 — Certificate of Independent Bid Determination\n[M] Valid B-BBEE Certificate or sworn affidavit\n[M] SARS Tax Clearance PIN (valid)\n[M] PSIRA Business Registration Certificate (valid)\n[M] CIPC Company Registration Documents\n[M] Completed Pricing Schedule (Annexure F)\n[M] Completed Post Schedule (Annexure E)\n[M] Company Profile (max 30 pages)\n[M] CV of proposed on-site Contract Manager\n[M] Organisation chart\n[M] List of current contracts with reference details (min 3)\n[M] Reference letters (minimum 2 on client letterhead)\n[M] Guard monitoring system documentation\n[M] Vehicle fleet list with registration & roadworthy dates\n[M] Vehicle insurance schedule\n[M] PSIRA Grade A control room certificate\n[O] Sample SOP / post orders\n[O] ISO or quality certificate\n[O] Firearms licences (if armed service proposed)`}
            onChange={set('checklistText')}
            editMode={editMode}
            multiline
          />
        </DocSection>

        {/* Part I — Terms */}
        <DocSection title="PART I — Special Conditions & Terms">
          <EditField value={doc.termsConditions} onChange={set('termsConditions')} editMode={editMode} multiline />
        </DocSection>

        {/* Footer */}
        <div className="td-footer">
          <div className="td-footer-line" />
          <p>
            Generated by the Security Firms Assessment Tool &nbsp;·&nbsp;
            <EditField value={doc.entityName} onChange={set('entityName')} editMode={editMode} /> &nbsp;·&nbsp;
            Ref: <EditField value={doc.tenderRef || '[REF]'} onChange={set('tenderRef')} editMode={editMode} /> &nbsp;·&nbsp;
            26 March 2026
          </p>
          <p className="td-footer-conf">CONFIDENTIAL — FOR INVITED BIDDERS ONLY</p>
        </div>
      </div>
    </div>
  );
}
