import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Settings,
  CreditCard,
  Building2,
  Wrench,
  Bell,
  BarChart3,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-icon">
          <Zap size={20} />
        </div>
        <div>
          <div className="brand-title">Vidhyut Saathi</div>
          <div className="brand-subtitle">Energy Savers Pvt Ltd</div>
        </div>
      </div>

      <ul className="nav-menu">
        <div className="nav-section-title">Core Management</div>
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/partners"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Franchise Partners</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/territories"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <MapPin size={18} />
            <span>Territories</span>
          </NavLink>
        </li>

        <div className="nav-section-title">Future Modules (Phase 2+)</div>
        <li className="nav-item disabled">
          <CreditCard size={18} />
          <span>Card Inventory</span>
          <span className="nav-badge-soon">Soon</span>
        </li>
        <li className="nav-item disabled">
          <Building2 size={18} />
          <span>Sub-Franchises</span>
          <span className="nav-badge-soon">Soon</span>
        </li>
        <li className="nav-item disabled">
          <Wrench size={18} />
          <span>Installations</span>
          <span className="nav-badge-soon">Soon</span>
        </li>
        <li className="nav-item disabled">
          <Bell size={18} />
          <span>Notifications</span>
          <span className="nav-badge-soon">Soon</span>
        </li>
        <li className="nav-item disabled">
          <BarChart3 size={18} />
          <span>Reports</span>
          <span className="nav-badge-soon">Soon</span>
        </li>

        <div className="nav-section-title">System</div>
        <li>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </li>
      </ul>

      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={logout}
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'flex-start', color: '#dc2626' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
