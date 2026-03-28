import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function Tenders() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    reference_number: '',
    closing_date: '',
    system_type: '80/20',
    min_functionality_score: 70
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/tenders`, formData);
      setMessage('Tender created successfully!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tenders-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-title">Create New Tender</h1>
      
      <div className="glass-card">
        {message && (
          <div style={{ padding: '12px', background: message.includes('success') ? 'var(--success)' : 'var(--danger)', color: 'white', borderRadius: '8px', marginBottom: '20px' }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tender Title</label>
            <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Guarding Services 2026" />
          </div>
          
          <div className="form-group">
            <label>Reference Number</label>
            <input type="text" name="reference_number" required value={formData.reference_number} onChange={handleChange} placeholder="e.g. SEC-2026-001" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label>Closing Date</label>
              <input type="datetime-local" name="closing_date" required value={formData.closing_date} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>PPPFA Point System</label>
              <select name="system_type" value={formData.system_type} onChange={handleChange}>
                <option value="80/20">80/20 Principals (Under R50M)</option>
                <option value="90/10">90/10 Principals (Above R50M)</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Minimum Functionality Score (%)</label>
            <input type="number" name="min_functionality_score" required min="1" max="100" value={formData.min_functionality_score} onChange={handleChange} />
          </div>
          
          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
            {loading ? 'Processing...' : 'Publish Tender'}
          </button>
        </form>
      </div>
    </div>
  );
}
