import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  { title: 'Initial Data Entry', desc: 'Start here. Create the tender with reference number, closing date, and the applicable PPPFA system (80/20 or 90/10). Then register all competing security firms with their PSIRA number and B-BBEE level.' },
  { title: 'Summary Report', desc: 'Select a tender, submit bids from registered companies (entering the total price and functionality score), then click "Run Evaluation" to calculate PPPFA point scores and rankings automatically.' },
  { title: '1. Guarding Personnel', desc: 'Score the security firm\'s operational guard deployment — numbers, grades, training and supervision. Max 100 points.' },
  { title: '2. Contract Management', desc: 'Assess the company\'s contractual and compliance framework — SLAs, payroll compliance, performance management, and dispute resolution mechanisms.' },
  { title: '3. Contract Infrastructure', desc: 'Rate the company\'s physical infrastructure — control rooms, fleet, CCTV, communications, IT patrol management systems, and backup power.' },
  { title: '4. The Company', desc: 'Evaluate the company\'s credentials — PSIRA registration, B-BBEE status, financial standing, SARS tax compliance, CIPC status, and management experience.' },
];

const formulaRows = [
  ['80/20 Price Score', 'Ps = 80 × (1 − (Pt − Pmin) / Pmin)'],
  ['90/10 Price Score', 'Ps = 90 × (1 − (Pt − Pmin) / Pmin)'],
  ['B-BBEE Points (80/20)', 'Level 1=20, 2=18, 3=14, 4=12, 5=8, 6=6, 7=4, 8=2'],
  ['B-BBEE Points (90/10)', 'Level 1=10, 2=9, 3=6, 4=5, 5=4, 6=3, 7=2, 8=1'],
  ['Disqualification', 'Bid failing min functionality OR PSIRA non-compliant = removed before evaluation'],
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div style={{ width: '100%', maxWidth: 800 }}>
        <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to Menu</button>
        <h1 className="section-title">Help & User Guide</h1>
        <p className="section-subtitle">How to use the Security Firms Assessment Tool.</p>

        {/* Section guides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {sections.map(s => (
            <div className="glass-card" key={s.title} style={{ padding: '18px 24px', display: 'flex', gap: 18 }}>
              <div style={{ width: 8, borderRadius: 4, background: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PPPFA formulas */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 14 }}>PPPFA Evaluation Formulas</h2>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead style={{ background: 'rgba(26,43,140,0.04)' }}>
              <tr><th>Rule</th><th>Formula / Values</th></tr>
            </thead>
            <tbody>
              {formulaRows.map(([rule, formula]) => (
                <tr key={rule}>
                  <td style={{ fontWeight: 600 }}>{rule}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--primary)' }}>{formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 20, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
          <strong>Legislation:</strong> This tool is aligned with the <em>Preferential Procurement Policy Framework Act (PPPFA) No. 5 of 2000</em> and the PSIRA Sectoral Determination for the Private Security Industry. B-BBEE scoring uses the DTI Codes of Good Practice.
        </p>
      </div>
    </div>
  );
}
