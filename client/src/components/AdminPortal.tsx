import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const AdminPortal: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // In a real app, this would be a real endpoint. 
        // For now, using the seeded users or mock if not available.
        const res = await api.get('/auth/users'); // Need to ensure this exists or use mock
        if (res.data.success) {
          setCandidates(res.data.data);
        } else {
            // Mock if endpoint fails
            setCandidates([
                { id: "BEG001", serviceId: "BEG001", name: "Sep Arjun Kumar", rank: "Sepoy", batch: "2026-A", unit: "BEG Centre", progress: 75, score: 82, completed: 9, status: "active" },
                { id: "BEG002", serviceId: "BEG002", name: "Hav Rajesh Singh", rank: "Havildar", batch: "2026-A", unit: "BEG Centre", progress: 100, score: 91, completed: 12, status: "active" },
                { id: "BEG003", serviceId: "BEG003", name: "Rfn Suresh Yadav", rank: "Rifleman", batch: "2026-A", unit: "10 Inf Div", progress: 50, score: 74, completed: 6, status: "active" },
            ]);
        }
      } catch (err) {
        console.error('Fetch users error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = candidates.filter(c => {
    const s = search.toLowerCase();
    const match = !s || c.name.toLowerCase().includes(s) || (c.serviceId || c.id).toLowerCase().includes(s);
    const f = filter === "all" || c.status === filter || (filter === "pass" && c.score >= 60) || (filter === "fail" && c.score < 60 && c.score > 0);
    return match && f;
  });

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title">🎖️ Candidate Registry — {candidates.length} Enrolled</div>
        <div style={{ display: "flex", gap: 8 }}>
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
                <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 3 }}>{c.completed || 0}/12 tasks</div>
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
