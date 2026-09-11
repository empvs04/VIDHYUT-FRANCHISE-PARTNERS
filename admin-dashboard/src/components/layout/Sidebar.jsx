import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  MapPin,
  Settings,
  CreditCard,
  Building2,
  Wrench,
  UserCircle,
  BarChart3,
  LogOut,
  Zap,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, partner, isSuperAdmin, logout } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (partner?.franchiseType === 'STATE_FRANCHISE') return 'State Partner';
    if (partner?.franchiseType === 'DISTRICT_FRANCHISE') return 'District Partner';
    if (partner?.franchiseType === 'SUB_FRANCHISE') return 'Sub-Franchise';
    return 'Partner';
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
              <div className="brand-subtitle">{getRoleBadge()}</div>
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
          <div className="nav-section-title">Navigation</div>
          <li>
            <NavLink
              to="/"
              end
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>{isSuperAdmin ? 'Admin Dashboard' : 'Partner Dashboard'}</span>
            </NavLink>
          </li>

          {isSuperAdmin ? (
            <>
              <li>
                <NavLink
                  to="/partners"
                  end
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>Franchise Partners</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/partners/new"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <UserPlus size={18} />
                  <span>Add Partner</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/territories"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <MapPin size={18} />
                  <span>Territory Coverage</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <CreditCard size={18} />
                  <span>Card Inventory</span>
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink
                  to="/cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <CreditCard size={18} />
                  <span>My Card Inventory</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/partners"
                  end
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={18} />
                  <span>Sub-Franchise Network</span>
                </NavLink>
              </li>
              {partner?.franchiseType !== 'SUB_FRANCHISE' && (
                <li>
                  <NavLink
                    to="/partners/new"
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <UserPlus size={18} />
                    <span>Add Sub-Franchise</span>
                  </NavLink>
                </li>
              )}
              {partner?._id && (
                <li>
                  <NavLink
                    to={`/partners/${partner._id}`}
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <UserCircle size={18} />
                    <span>My Profile</span>
                  </NavLink>
                </li>
              )}
            </>
          )}

          <div className="nav-section-title">Future Modules</div>
          <li className="nav-item disabled">
            <Wrench size={18} />
            <span>Customer Installations</span>
            <span className="nav-badge-soon">Phase 4</span>
          </li>
          <li className="nav-item disabled">
            <BarChart3 size={18} />
            <span>Financial Settlements</span>
            <span className="nav-badge-soon">Phase 5</span>
          </li>

          <div className="nav-section-title">Account</div>
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
