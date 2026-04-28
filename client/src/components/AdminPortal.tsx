import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const AdminPortal: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    serviceId: '',
    rank: '',
    batch: '',
    unit: '',
    role: 'soldier'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data.success) {
        setCandidates(res.data.data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/auth/signup', formData);
      if (res.data.success) {
        setSuccess('User registered successfully!');
        setFormData({
          name: '',
          email: '',
          password: '',
          serviceId: '',
          rank: '',
          batch: '',
          unit: '',
          role: 'soldier'
        });
        setShowAddForm(false);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add user');
    }
  };

  const filtered = candidates.filter(c => {
    const s = search.toLowerCase();
    const match = !s || c.name.toLowerCase().includes(s) || (c.serviceId || c.id).toLowerCase().includes(s);
    const f = filter === "all" || c.status === filter || (filter === "pass" && c.score >= 60) || (filter === "fail" && c.score < 60 && c.score > 0);
    return match && f;
  });

  if (loading) return <div className="text-center py-20">Loading Candidates...</div>;

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title">🎖️ Candidate Registry — {candidates.length} Enrolled</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="topbar-btn" 
            style={{ backgroundColor: "var(--navy2)", color: "white", border: "none" }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Close Form' : '➕ Add Candidate'}
          </button>
          <input className="form-input" placeholder="🔍 Search by name or ID…" style={{ width: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="pass">Score ≥ 60</option>
            <option value="fail">Score &lt; 60</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
          <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <input className="form-input" name="name" placeholder="Full Name" required value={formData.name} onChange={handleInputChange} />
            <input className="form-input" name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleInputChange} />
            <input className="form-input" name="password" type="password" placeholder="Password" required value={formData.password} onChange={handleInputChange} />
            <input className="form-input" name="serviceId" placeholder="Service ID (e.g. BEG001)" value={formData.serviceId} onChange={handleInputChange} />
            <input className="form-input" name="rank" placeholder="Rank (e.g. Sepoy)" value={formData.rank} onChange={handleInputChange} />
            <input className="form-input" name="batch" placeholder="Batch (e.g. 2026-A)" value={formData.batch} onChange={handleInputChange} />
            <input className="form-input" name="unit" placeholder="Unit" value={formData.unit} onChange={handleInputChange} />
            <select className="form-select" name="role" value={formData.role} onChange={handleInputChange}>
              <option value="soldier">Soldier</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="submit" className="topbar-btn" style={{ background: 'var(--green)', color: 'white', border: 'none' }}>Register Candidate</button>
            </div>
            {error && <div style={{ color: 'var(--red)', gridColumn: '1 / -1', fontSize: '12px' }}>{error}</div>}
            {success && <div style={{ color: 'var(--green)', gridColumn: '1 / -1', fontSize: '12px' }}>{success}</div>}
          </form>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr><th>Service No</th><th>Name & Rank</th><th>Batch</th><th>Unit</th><th>Progress</th><th>Score</th><th>Actions</th></tr>
          </thead>
          <tbody>{filtered.map(c => (
            <tr key={c.id}>
              <td><span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--navy2)" }}>{c.serviceId || c.id}</span></td>
              <td>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--silver)" }}>{c.rank}</div>
              </td>
              <td><span className="chip">{c.batch || '2026-A'}</span></td>
              <td style={{ fontSize: 12, color: "var(--steel)" }}>{c.unit || 'BEG Centre'}</td>
              <td style={{ minWidth: 140 }}>
                <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 3 }}>{c.completed || 0}/{c.totalTasks || 0} tasks</div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: (c.progress || 0) + "%" }} /></div>
              </td>
              <td>
                <span style={{ fontFamily: "'Crimson Pro',serif", fontSize: 20, fontWeight: 700, color: (c.score || 0) >= 60 ? "var(--green)" : (c.score || 0) === 0 ? "var(--silver)" : "var(--red)" }}>
                  {c.score > 0 ? c.score + "%" : "—"}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="topbar-btn" style={{ fontSize: 11, padding: "4px 10px" }}>Report</button>
                  <button className="topbar-btn" style={{ fontSize: 11, padding: "4px 10px" }}>Edit</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPortal;
