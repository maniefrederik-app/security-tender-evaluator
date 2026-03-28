import { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../api';

export default function Bidders() {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    company_name: '',
    registration_number: '',
    psira_number: '',
    bbbee_level: 1
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBidders();
  }, []);

  const fetchBidders = async () => {
    try {
      const res = await axios.get(`${API}/bidders`);
      setBidders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/bidders`, formData);
      setMessage('Bidder registered successfully!');
      setFormData({ company_name: '', registration_number: '', psira_number: '', bbbee_level: 1 });
      fetchBidders();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to register bidder');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '30px' }}>
      <div>
        <h1 className="page-title" style={{ fontSize: '1.4rem' }}>Register Bidder</h1>
        <div className="glass-card">
          {message && (
            <div style={{ padding: '10px', background: message.includes('success') ? 'var(--success)' : 'var(--danger)', color: 'white', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" name="company_name" required value={formData.company_name} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>Registration Number</label>
              <input type="text" name="registration_number" required value={formData.registration_number} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>PSIRA Registration Number</label>
              <input type="text" name="psira_number" required value={formData.psira_number} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>B-BBEE Level (1-8)</label>
              <select name="bbbee_level" value={formData.bbbee_level} onChange={handleChange}>
                {[1,2,3,4,5,6,7,8].map(level => (
                  <option key={level} value={level}>Level {level}</option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="btn" style={{ width: '100%' }}>Register Contractor</button>
          </form>
        </div>
      </div>

      <div>
        <h1 className="page-title" style={{ fontSize: '1.4rem' }}>Registered Contractors Database</h1>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
             <div style={{ padding: '24px' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
                <tr>
                  <th style={{ padding: '16px' }}>Company</th>
                  <th style={{ padding: '16px' }}>PSIRA No.</th>
                  <th style={{ padding: '16px' }}>B-BBEE</th>
                </tr>
              </thead>
              <tbody>
                {bidders.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center' }}>No bidders registered yet.</td></tr>
                ) : (
                  bidders.map(bidder => (
                    <tr key={bidder.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{bidder.company_name}<br/><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{bidder.registration_number}</span></td>
                      <td style={{ padding: '16px' }}><span className="badge badge-primary">{bidder.psira_number}</span></td>
                      <td style={{ padding: '16px' }}>Level {bidder.bbbee_level}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
