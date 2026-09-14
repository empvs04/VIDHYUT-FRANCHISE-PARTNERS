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
  FileText,
  Send,
  TrendingUp,
  Search,
  Shield,
  Activity,
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
    if (
      partner?.franchiseType === 'DISTRICT_FRANCHISE' ||
      partner?.franchiseType === 'NON_EXCLUSIVE_DISTRICT' ||
      partner?.franchiseType === 'STANDARD_EXCLUSIVE_DISTRICT' ||
      partner?.franchiseType === 'PREMIUM_EXCLUSIVE_DISTRICT'
    )
      return 'District Partner';
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
                  to="/sub-franchises"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={18} />
                  <span>Sub-Franchise Partners</span>
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
              <li>
                <NavLink
                  to="/transactions"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <FileText size={18} />
                  <span>Card Transactions</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/transactions/new"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Send size={18} />
                  <span>Distribute Cards</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customers"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>Customers</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/installations"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Wrench size={18} />
                  <span>Card Installations</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/location-verifications"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <MapPin size={18} />
                  <span>GPS Location Audit</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/analytics"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <TrendingUp size={18} />
                  <span>Analytics & BI</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/reports"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <FileText size={18} />
                  <span>Executive Reports</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/audit"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Search size={18} />
                  <span>Global Audit & Trace</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/audit-logs"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Shield size={18} />
                  <span>Immutable Audit Logs</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/system-health"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Activity size={18} />
                  <span>System Health</span>
                </NavLink>
              </li>
            </>


          ) : (
            <>
              <li>
                <NavLink
                  to="/customers"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>My Customers</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customers/new"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <UserPlus size={18} />
                  <span>Install Card</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/installations"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Wrench size={18} />
                  <span>Installations Log</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/location-verifications"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <MapPin size={18} />
                  <span>GPS Location Logs</span>
                </NavLink>
              </li>
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

              {partner?.franchiseType !== 'SUB_FRANCHISE' && (
                <li>
                  <NavLink
                    to="/transactions/new"
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Send size={18} />
                    <span>Distribute Stock</span>
                  </NavLink>
                </li>
              )}
              {partner?.franchiseType !== 'SUB_FRANCHISE' && (
                <>
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
                </>
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

          {(!partner || partner?.franchiseType !== 'SUB_FRANCHISE') && (
            <>
              <div className="nav-section-title">Upcoming Modules</div>
              <li className="nav-item disabled">
                <BarChart3 size={18} />
                <span>Franchise Settlements</span>
                <span className="nav-badge-soon">Phase 7</span>
              </li>
            </>
          )}

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
