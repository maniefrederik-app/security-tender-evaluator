import { useNavigate } from 'react-router-dom';
import {
  Database, ClipboardList, Shield, FileCheck,
  Building2, Briefcase, HelpCircle, ArrowRight,
  ChevronRight, Users, FileText, DollarSign
} from 'lucide-react';
import './StartPage.css';

const sidebarItems = [
  { label: 'Initial Data Entry',         path: '/initial-data',      icon: Database,    desc: 'Tender setup & bidder registration' },
  { label: 'Evaluator Panel',            path: '/evaluators',        icon: Users,       desc: 'Register & manage evaluators' },
  { label: 'Tender Document',            path: '/tender-document',   icon: FileText,    desc: 'Editable & printable RFP document' },
  { label: 'Pricing Schedule',           path: '/pricing-schedule',  icon: DollarSign,  desc: 'Annexure F — bidder pricing form' },
  { label: 'Summary Report',             path: '/summary',           icon: ClipboardList, desc: 'PPPFA-ranked evaluation results' },
  { label: '1. Guarding Personnel',      path: '/assess/guarding',   icon: Shield,      desc: 'Staff, grades & supervision' },
  { label: '2. Contract Management',     path: '/assess/contract',   icon: FileCheck,   desc: 'SLA, rostering & operations' },
  { label: '3. Contract Infrastructure', path: '/assess/infra',      icon: Building2,   desc: 'Equipment & technical support' },
  { label: '4. The Company',             path: '/assess/company',    icon: Briefcase,   desc: 'Credentials, B-BBEE & financials' },
  { label: 'Help & Guide',               path: '/help',              icon: HelpCircle,  desc: 'PPPFA formulas & user guide' },
];

export default function StartPage() {
  const navigate = useNavigate();

  return (
    <div className="start-layout">
      {/* ── Left Sidebar ── */}
      <aside className="start-sidebar">
        <div className="sidebar-logo-wrap">
          <img src="/logo111.png" alt="Logo" className="sidebar-logo" />
        </div>

        <p className="sidebar-tool-name">Assessment Tool</p>

        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Assessment Modules</p>
          {sidebarItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className="sidebar-nav-item"
                onClick={() => navigate(item.path)}
              >
                <span className="sni-icon"><Icon size={17} /></span>
                <span className="sni-text">
                  <span className="sni-label">{item.label}</span>
                  <span className="sni-desc">{item.desc}</span>
                </span>
                <ChevronRight size={14} className="sni-arrow" />
              </button>
            );
          })}
        </nav>

        <button className="sidebar-launch-btn" onClick={() => navigate('/app')}>
          Launch Application
          <ArrowRight size={18} />
        </button>
      </aside>

      {/* ── Main Hero Area ── */}
      <main className="start-hero">
        {/* Hero branding */}
        <div className="hero-brand">
          <img src="/logo111.png" alt="Tender Assessment Tool" className="hero-logo" />
          <h1 className="hero-title">Security Firms<br/>Assessment Tool</h1>
          <p className="hero-tagline">"Compliance Meets Clarity."</p>
          <p className="hero-desc">
            A comprehensive evaluation system for South African security guarding services tenders.
            Built on the PPPFA 80/20 &amp; 90/10 preferential procurement framework, PSIRA sectoral
            compliance, and B-BBEE scoring.
          </p>

          <button className="hero-cta" onClick={() => navigate('/app')}>
            Start Assessment
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Feature cards */}
        <div className="hero-cards">
          {[
            { icon: '⚖️', title: 'PPPFA Compliant',     body: '80/20 & 90/10 preference point systems automatically applied' },
            { icon: '🛡️', title: 'PSIRA Aligned',       body: 'Sectoral determination compliance checks built into every bid' },
            { icon: '📊', title: 'Compliance Scoring',  body: 'Not Applicable → Non-Compliant → Supposed → Compliant → Excellent' },
            { icon: '🏆', title: 'B-BBEE Integrated',   body: 'Preference points calculated per DTI Codes of Good Practice' },
          ].map(card => (
            <div key={card.title} className="hero-card">
              <span className="hero-card-icon">{card.icon}</span>
              <h3 className="hero-card-title">{card.title}</h3>
              <p className="hero-card-body">{card.body}</p>
            </div>
          ))}
        </div>

        {/* Footer strip */}
        <footer className="hero-footer">
          <span>South African Preferential Procurement Policy Framework Act (PPPFA) No. 5 of 2000</span>
          <span>·</span>
          <span>PSIRA Grade A–E Compliance</span>
          <span>·</span>
          <span>DTI B-BBEE Codes of Good Practice</span>
        </footer>
      </main>
    </div>
  );
}
