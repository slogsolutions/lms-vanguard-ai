import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setLoading, setError } from '../store/slices/authSlice.js';
import { signUpUser } from '../services/authService.js';
import type { RootState } from '../store/store.js';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    serviceId: '',
    rank: 'Sepoy',
    batch: '2026-A',
    unit: '',
    role: 'soldier' as 'admin' | 'soldier'
  });
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));
    try {
      const response = await signUpUser(formData);
      if (response.success) {
        dispatch(setUser(response.data));
        navigate('/');
      }
    } catch (err: any) {
      dispatch(setError(err.message || "Registration failed"));
    } finally {
        dispatch(setLoading(false));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="section-card" style={{ width: '100%', maxWidth: '540px', margin: 0, border: '1px solid var(--gold)' }}>
        <div className="sidebar-logo" style={{ background: 'var(--navy)', border: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <div className="logo-badge">
                <div className="logo-emblem">A</div>
                <div className="logo-text" style={{ textAlign: 'left' }}>
                    <div className="title">Defence AI Lab</div>
                    <div className="sub">Registration • Classified</div>
                </div>
            </div>
        </div>
        <div className="card-body" style={{ padding: '30px' }}>
          <h2 style={{ fontFamily: 'Crimson Pro', fontSize: '24px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Personnel Enrollment</h2>
          
          {error && (
            <div style={{ background: '#FDEAEA', color: 'var(--red)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group full">
              <label className="form-label">Full Name</label>
              <input name="name" value={formData.name} onChange={handleChange} className="form-input" placeholder="e.g., Arjun Kumar" required />
            </div>

            <div className="form-group">
              <label className="form-label">Service Number (ID)</label>
              <input name="serviceId" value={formData.serviceId} onChange={handleChange} className="form-input" placeholder="e.g., BEG001" required />
            </div>

            <div className="form-group">
              <label className="form-label">Rank</label>
              <select name="rank" value={formData.rank} onChange={handleChange} className="form-select">
                <option value="Sepoy">Sepoy</option>
                <option value="Naik">Naik</option>
                <option value="Havildar">Havildar</option>
                <option value="Subedar">Subedar</option>
                <option value="Major">Major</option>
                <option value="Lt Col">Lt Col</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Batch</label>
              <input name="batch" value={formData.batch} onChange={handleChange} className="form-input" placeholder="e.g., 2026-A" />
            </div>

            <div className="form-group">
              <label className="form-label">Unit / Corps</label>
              <input name="unit" value={formData.unit} onChange={handleChange} className="form-input" placeholder="e.g., BEG Centre" />
            </div>

            <div className="form-group full">
              <label className="form-label">Service Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="id@defence.gov.in" required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="••••••••" required />
            </div>

            <div className="form-group">
              <label className="form-label">Access Level</label>
              <select name="role" value={formData.role} onChange={handleChange} className="form-select">
                <option value="soldier">Candidate (Student)</option>
                <option value="admin">Instructor (Admin)</option>
              </select>
            </div>

            <div className="form-group full" style={{ marginTop: '10px' }}>
                <button type="submit" className="topbar-btn gold primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
                {loading ? "Processing Service Record..." : "Register Personnel ▶"}
                </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '24px', color: 'var(--steel)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Personnel Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
