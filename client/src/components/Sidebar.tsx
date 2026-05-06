import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store.js';
import { logout as logoutAction } from '../store/slices/authSlice.js';
import api from '../api/axios.js';
import { learningModules } from '../data/learningModules.js';

const Sidebar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      dispatch(logoutAction());
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const NAV = [
    { section: "Main" },
    { id: "dashboard", label: "Dashboard", icon: "⬛", path: "/" },
    { id: "candidates", label: "Candidates", icon: "👤", path: "/admin", adminOnly: true },
    { section: "AI Lab" },
    { id: "workspace", label: "AI Workspace", icon: "🤖", path: "/chat" },
    { id: "activities", label: "Activity List", icon: "📋", path: "/courses" },
    { section: "Modules" },
    ...learningModules.map(module => ({
      id: `module-${module.id}`,
      label: module.shortTitle,
      icon: "ED",
      path: `/modules/${module.id}`,
    })),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div className="user-avatar">{user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "U"}</div>
          <div className="user-info" style={{ flex: 1 }}>
            <div className="name">{user?.name || "User"}</div>
            <div className="role">{user?.rank || "Cadet"} • {user?.role}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="topbar-btn" 
            style={{ padding: '6px', borderRadius: '8px', minWidth: 'auto' }}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
