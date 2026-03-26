import { useNavigate } from 'react-router-dom';
import { Database, ClipboardList, Shield, FileCheck, Building2, Briefcase, HelpCircle, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import './HomePage.css';

const menuItems = [
  { label: 'Initial Data Entry',           path: '/initial-data',    icon: Database,       desc: 'Set up the tender and register security companies' },
  { label: 'Evaluator Panel',              path: '/evaluators',      icon: Users,          desc: 'Register evaluators and manage the assessment panel' },
  { label: 'Summary Report',              path: '/summary',          icon: ClipboardList,  desc: 'View ranked evaluation with PPPFA scoring' },
  { label: '1.  Guarding Personnel',      path: '/assess/guarding',  icon: Shield,         desc: 'Assess staff numbers, grades & supervision' },
  { label: '2.  Contract Management',     path: '/assess/contract',  icon: FileCheck,      desc: 'Evaluate SLA, reporting & contract compliance' },
  { label: '3.  Contract Infrastructure', path: '/assess/infra',     icon: Building2,      desc: 'Rate control rooms, vehicles & communications' },
  { label: '4.  The Company',             path: '/assess/company',   icon: Briefcase,      desc: 'Score PSIRA registration, B-BBEE & financials' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-shell">
      <div className="home-wrapper">
        {/* Header card */}
        <div className="home-header glass-card">
          <button className="back-link" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
            <ArrowLeft size={15} /> Start Page
          </button>
          <img src="/logo111.png" alt="Tender Assessment Tool Logo" className="home-logo-img" />
          <h1 className="home-title">Security Firms Assessment Tool</h1>
          <p className="home-sub">South African PPPFA (80/20 &amp; 90/10) Tender Evaluation System</p>
        </div>

        {/* Menu card */}
        <div className="menu-card glass-card">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className="menu-item"
                onClick={() => navigate(item.path)}
              >
                <span className="menu-icon"><Icon size={22} /></span>
                <span className="menu-text">
                  <span className="menu-label">{item.label}</span>
                  <span className="menu-desc">{item.desc}</span>
                </span>
                <ChevronRight size={18} className="menu-arrow" />
              </button>
            );
          })}
        </div>

        {/* Help button */}
        <button className="help-btn btn btn-outline" onClick={() => navigate('/help')}>
          <HelpCircle size={18} />
          Help
        </button>
      </div>
    </div>
  );
}
