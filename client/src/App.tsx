import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Login from './pages/Login.js';
import SignUp from './pages/SignUp.js';
import { useAuth } from './hooks/useAuth.js';
import ChatInterface from './components/ChatInterface.js';
import AdminPortal from './components/AdminPortal.js';
import SoldierPortal from './components/SoldierPortal.js';
import Profile from './pages/Profile.js';
import Dashboard from './pages/Dashboard.js';

const Reports = () => <div className="section-card"><div className="card-header"><div className="card-title">Reports & Analysis</div></div><div className="card-body">Coming soon...</div></div>;
const Settings = () => <div className="section-card"><div className="card-header"><div className="card-title">Lab Configuration</div></div><div className="card-body">Coming soon...</div></div>;

function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  useAuth(!isAuthPage);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="admin" element={<AdminPortal />} />
        <Route path="courses" element={<SoldierPortal />} />
        <Route path="chat" element={<ChatInterface />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
