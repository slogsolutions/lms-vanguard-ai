import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store.js';

const Sidebar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const NAV = [
    { section: "Main" },
    { id: "dashboard", label: "Dashboard", icon: "⬛", path: "/" },
    { id: "candidates", label: "Candidates", icon: "👤", path: "/admin", adminOnly: true },
    { section: "AI Lab" },
    { id: "workspace", label: "AI Workspace", icon: "🤖", path: "/chat" },
    { id: "activities", label: "Activity List", icon: "📋", path: "/courses" },
    { section: "Analytics" },
    { id: "reports", label: "Reports & Analysis", icon: "📊", path: "/reports" },
    { section: "Admin" },
    { id: "settings", label: "Lab Settings", icon: "⚙️", path: "/settings", adminOnly: true },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-badge">
          <div className="logo-emblem">A</div>
          <div className="logo-text">
            <div className="title">Defence AI Lab</div>
            <div className="sub">LMS • Classified</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((n, i) => {
          if (n.section) return <div key={i} className="nav-section">{n.section}</div>;
          if (n.adminOnly && user?.role !== 'admin') return null;

          return (
            <NavLink
              key={n.id}
              to={n.path!}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="user-avatar">{user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "U"}</div>
        <div className="user-info">
          <div className="name">{user?.name || "User"}</div>
          <div className="role">{user?.rank || "Cadet"} • {user?.role}</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
