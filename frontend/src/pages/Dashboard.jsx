import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, Trophy, AlertCircle } from 'lucide-react';
import API from '../api';

export default function Dashboard() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      const res = await axios.get(`${API}/tenders`);
      setTenders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Active Tenders</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : tenders.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h3>No tenders found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Get started by creating a new tender.</p>
          <Link to="/tenders" className="btn">Create Tender</Link>
        </div>
      ) : (
        <div className="tenders-grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {tenders.map((tender) => (
            <div key={tender.id} className="glass-card tender-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-primary">{tender.reference_number}</span>
                <span className="badge" style={{ background: '#f3f4f6' }}>{tender.system_type} System</span>
              </div>
              
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>{tender.title}</h3>
              
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                <div>Min Functionality: {tender.min_functionality_score}%</div>
                <div>Closing: {new Date(tender.closing_date).toLocaleDateString()}</div>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                <Link to={`/evaluate/${tender.id}`} className="btn" style={{ flex: 1 }}>
                  Manage Bids & Evaluate <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
