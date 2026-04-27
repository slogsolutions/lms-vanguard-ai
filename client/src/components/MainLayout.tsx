import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.js';
import Topbar from './Topbar.js';

const MainLayout: React.FC = () => {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-wrapper">
        <Topbar />
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
