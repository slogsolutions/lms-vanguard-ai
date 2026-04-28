import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, setUser, setLoading, setError } from '../store/slices/authSlice.js';
import { loginUser } from '../services/authService.js';
import type { RootState } from '../store/store.js';

const Login: React.FC = () => {
  const [email, setEmail] = useState('priya@army.mil');
  const [password, setPassword] = useState('defense123');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(setLoading(true));
    try {
      const response = await loginUser({ email, password });
      if (response.success) {
        dispatch(setUser(response.data));
        navigate('/');
      }
    } catch (err: any) {
      dispatch(setError(err.message || "Login failed"));
    } finally {
        dispatch(setLoading(false));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="section-card" style={{ width: '100%', maxWidth: '400px', margin: 0, border: '1px solid var(--gold)' }}>
        <div className="sidebar-logo" style={{ background: 'var(--navy)', border: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <div className="logo-badge">
                <div className="logo-emblem">A</div>
                <div className="logo-text" style={{ textAlign: 'left' }}>
                    <div className="title">Defence AI Lab</div>
                    <div className="sub">Access Portal • Classified</div>
                </div>
            </div>
        </div>
        <div className="card-body" style={{ padding: '30px' }}>
          <h2 style={{ fontFamily: 'Crimson Pro', fontSize: '24px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Personnel Login</h2>
          
          {error && (
            <div style={{ background: '#FDEAEA', color: 'var(--red)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Service Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="id@defence.gov.in"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">Password</label>
                <a href="#" style={{ fontSize: '11px', color: 'var(--silver)', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="topbar-btn gold primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '15px' }}
              disabled={loading}
            >
              {loading ? "Verifying Credentials..." : "Authenticate ▶"}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '24px', color: 'var(--steel)' }}>
            New Personnel? <Link to="/signup" style={{ color: 'var(--gold)', fontWeight: 600 }}>Register Service Record</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
