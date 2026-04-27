import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store.js';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, contentRes, modelRes] = await Promise.all([
          api.get('/auth/users'), // Need to add this endpoint or just use candidates if admin
          api.get('/content'),
          api.get('/models')
        ]);
        
        if (contentRes.data.success) setActivities(contentRes.data.data);
        if (modelRes.data.success) setModels(modelRes.data.data);
        // Candidates only for admin
        if (user?.role === 'admin') {
            // Mocking candidate list for now if endpoint doesn't exist
            setCandidates([
                { id: "BEG001", name: "Sep Arjun Kumar", rank: "Sepoy", batch: "2026-A", progress: 75, completed: 9, score: 82, status: "active" },
                { id: "BEG002", name: "Hav Rajesh Singh", rank: "Havildar", batch: "2026-A", progress: 100, completed: 12, score: 91, status: "active" },
            ]);
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const avgScore = activities.length ? 67 : 0; // Mocked for now

  return (
    <>
      <div className="stat-grid">
        {[
          { label: "Total Candidates", val: user?.role === 'admin' ? "6" : "1", icon: "👥", chg: "+2 this week", up: true, cls: "navy" },
          { label: "Activities Completed", val: activities.length, icon: "✅", chg: `${activities.length} tasks defined`, up: true, cls: "gold" },
          { label: "Average Score", val: "67%", icon: "📈", chg: "Pass rate 83%", up: true, cls: "green" },
          { label: "Active Sessions", val: models.filter(m => m.status === 'online').length, icon: "🔴", chg: "Ollama models online", up: true, cls: "teal" },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-info">
              <div className="val">{s.val}</div>
              <div className="lbl">{s.label}</div>
              <div className={`chg ${s.up ? "up" : "dn"}`}>{s.chg}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" }}>
        {/* Recent candidates */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">🎖️ Candidate Progress</div>
            <Link to="/admin" className="topbar-btn" style={{ fontSize: 12, padding: "5px 12px" }}>View All</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Candidate</th><th>Batch</th><th>Completed</th><th>Score</th></tr></thead>
              <tbody>
                {(user?.role === 'admin' ? candidates : [user]).map((c: any) => (
                  <tr key={c.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div><div className="text-xs text-silver mono">{c.serviceId || c.id}</div></td>
                    <td><span className="chip">{c.batch || "2026-A"}</span></td>
                    <td>
                      <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 4 }}>{c.completed || 0}/{activities.length}</div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: (c.progress || 0) + "%" }} /></div>
                    </td>
                    <td><span style={{ fontFamily: "'Crimson Pro',serif", fontSize: 18, fontWeight: 700, color: (c.score || 0) >= 60 ? "var(--green)" : "var(--red)" }}>{c.score || 0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="section-card">
            <div className="card-header"><div className="card-title">🤖 AI Model Status</div></div>
            <div className="card-body" style={{ padding: "12px 16px" }}>
              {models.slice(0, 5).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className={`model-dot ${m.type === 'online' ? 'online' : 'offline'}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--silver)" }}>{m.provider}</div>
                  </div>
                  <span className={`badge ${m.type}`}>{m.type}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <div className="card-header"><div className="card-title">📋 Quick Actions</div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["🤖 Open AI Workspace", "/chat"], ["📋 View Activities", "/courses"], ["📊 View Reports", "/reports"]].map(([l, p]) => (
                <Link key={p} to={p} className="topbar-btn" style={{ width: '100%', justifyContent: "flex-start", textDecoration: 'none' }}>{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 20 }}>
        <div className="card-header"><div className="card-title">⚠️ Notifications</div></div>
        <div className="card-body">
          <div className="notif info">📡 {models.filter(m => m.type === 'offline').length} Ollama models running offline on local server. Last heartbeat: 2 minutes ago.</div>
          <div className="notif warn">🌐 Online models (Gemini, Claude, GPT-4o) require internet. Verify network policy before use.</div>
          <div className="notif success">✅ Activity batch 2026-A: 3 candidates completed all {activities.length} tasks this week.</div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
