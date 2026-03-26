import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Calculator } from 'lucide-react';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout-container">
      <aside className="glass-sidebar">
        <div className="sidebar-header">
          <h2>🛡️ TenderEval</h2>
          <p>Security Services</p>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/tenders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <FileText size={20} />
            <span>Tenders</span>
          </NavLink>
          
          <NavLink to="/bidders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Users size={20} />
            <span>Bidders</span>
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <div className="topbar glass-card">
          <div className="topbar-title">South African PPPFA (80/20 & 90/10) Tender Evaluator</div>
        </div>
        
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
