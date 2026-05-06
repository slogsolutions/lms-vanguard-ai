import React from 'react';
import { useLocation } from 'react-router-dom';

const Topbar: React.FC = () => {
  const location = useLocation();

  const pageLabels: Record<string, { title: string, sub: string }> = {
    "/": { title: "Command Dashboard", sub: "AI Lab Operations Overview" },
    "/admin": { title: "Candidate Registry", sub: "Register & manage lab candidates" },
    "/chat": { title: "AI Workspace", sub: "Interactive AI model sessions" },
    "/courses": { title: "Lab Activities", sub: "Practical assessment tasks" },
    "/modules": { title: "Learning Modules", sub: "Lessons, examples, and code practice" },
    "/reports": { title: "Reports & Analysis", sub: "Performance analytics & export" },
    "/settings": { title: "Lab Configuration", sub: "System configuration" },
    "/profile": { title: "User Profile", sub: "Personal service record" }
  };

  const current = location.pathname.startsWith('/modules')
    ? pageLabels["/modules"]
    : pageLabels[location.pathname] || { title: "Defence AI Lab", sub: "LMS - Classified" };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="page-title">{current.title}</div>
        <div className="page-sub">{current.sub}</div>
      </div>
      <div className="topbar-right">
        {location.pathname === "/admin" && <button className="topbar-btn gold">+ Register Candidate</button>}
        {location.pathname === "/chat" && <button className="topbar-btn primary">📥 Save Session</button>}
        <button className="topbar-btn">🔔</button>
      </div>
    </header>
  );
};

export default Topbar;
