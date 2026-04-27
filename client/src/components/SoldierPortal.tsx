import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const SoldierPortal: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api.get('/content');
        if (res.data.success) {
          setActivities(res.data.data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const filtered = tab === "all" ? activities
    : tab === "offline" ? activities.filter(a => a.type.includes("Offline"))
    : activities.filter(a => a.type.includes("Online"));

  if (loading) return <div className="text-center py-20">Loading Mission Data...</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[["all", "All Activities"], ["offline", "Offline Only"], ["online", "Online Only"]].map(([v, l]) => (
            <div key={v} className={`tab${tab === v ? " active" : ""}`} onClick={() => setTab(v)}>{l}</div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--silver)" }}>{filtered.length} activities shown</div>
      </div>
      <div className="activity-grid">
        {filtered.map((a, i) => {
          const statusClass = a.status === "completed" ? "completed" : a.status === "inprogress" ? "inprog" : "";
          const statusLabel = a.status === "completed" ? "Completed" : a.status === "inprogress" ? "In Progress" : "Not Started";
          
          return (
            <div key={a.id} className={`activity-card ${statusClass}`}>
              <div className="act-title">{a.title}</div>
              <div className="act-header">
                <span className="act-num mono">TASK-{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="act-desc">{a.body.substring(0, 120)}...</div>
              <div className="act-meta">
                <span className="act-tag">⏱ {a.duration}</span>
                <span className="act-tag" style={{ background: a.type.includes("Offline") && a.type.includes("Online") ? "#EEF0F8" : a.type === "Offline" ? "#F0EEF8" : "#E6F3FF", color: a.type.includes("Offline") && a.type.includes("Online") ? "#3A3070" : a.type === "Offline" ? "#4A3580" : "#1A5FAB" }}>{a.type}</span>
                <span className="act-tag">{a.difficulty}</span>
                <span className="act-tag">{a.category}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="topbar-btn primary" style={{ fontSize: 12, padding: "5px 14px", flex: 1 }}
                  onClick={() => navigate(`/chat?activity=${a.id}`)}>
                  Explore in AI Workspace
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SoldierPortal;
