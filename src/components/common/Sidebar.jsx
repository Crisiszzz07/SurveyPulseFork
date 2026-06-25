import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ClipboardList, BarChart3, Building2, LogOut, User, Users } from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin        = user?.role === 'ADMIN';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">📊</span>
          <span className="logo-text">SurveyPulse</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          end
        >
          <ClipboardList size={20} />
          <span>Encuestas</span>
        </NavLink>

        {/*  Ahora apunta a /metrics, que bajo el basename se vuelve /dashboard/metrics */}
        <NavLink 
          to="/metrics" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={20} />
          <span>Métricas Globales</span>
        </NavLink>

        <NavLink 
          to="/companies" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Building2 size={20} />
          <span>Vista por Empresa</span>
        </NavLink>

        {(isAdmin || isCompanyAdmin) && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Usuarios</span>
          </NavLink>
        )}

      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-details">
            <p className="user-name">{user.name}</p>
            <span className={`user-role-badge ${user.role.toLowerCase()}`}>
              {user.role}
            </span>
          </div>
        </div>
        
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
