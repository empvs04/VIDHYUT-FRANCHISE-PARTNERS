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
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'mobile-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="brand-box" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon">
              <Zap size={18} />
            </div>
            <div>
              <div className="brand-title">Vidhyut Saathi</div>
              <div className="brand-subtitle">Franchise Portal</div>
            </div>
          </div>

          {/* Close Button on Mobile */}
          <button
            type="button"
            onClick={onClose}
            className="hamburger-btn"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <ul className="nav-menu">
          <div className="nav-section-title">Core Management</div>
          <li>
            <NavLink
              to="/"
              end
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/partners"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Franchise Partners</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/territories"
              onClick={handleNavClick}
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
              onClick={handleNavClick}
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
    </>
  );
};

export default Sidebar;
