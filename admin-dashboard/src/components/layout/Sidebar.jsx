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
  X,
  FileText,
  Send,
  TrendingUp,
  Search,
  Shield,
  Activity,
  Sparkles,
  Clock,
  Zap,
  UserCheck,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, partner, isSuperAdmin, logout } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const displayName = isSuperAdmin
    ? (user?.name || user?.username || 'Super Admin')
    : (partner?.fullName || user?.name || 'Franchise Partner');

  const displaySubtitle = isSuperAdmin
    ? 'System Administrator'
    : (partner?.franchiseId || (partner?.franchiseType ? partner.franchiseType.replace(/_/g, ' ') : 'Partner Portal'));

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'mobile-open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Brand Box / Official Logo Header */}
        <div
          className="brand-box"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '12px 16px',
            height: '84px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <NavLink
            to="/"
            onClick={handleNavClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* High Definition Official Logo */}
            <div
              style={{
                position: 'relative',
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                padding: '2px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src="/vidhyut-logo.jpg"
                alt="Vidhyut Saathi Logo"
                style={{
                  height: '100%',
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: '10px',
                }}
              />
            </div>

            {/* Brand Title: VIDHYUT SAATHI */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  letterSpacing: '-0.2px',
                  lineHeight: '1.15',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <span style={{ color: '#ea580c', filter: 'drop-shadow(0 1px 1px rgba(234, 88, 12, 0.2))' }}>
                  VIDHYUT{' '}
                </span>
                <span style={{ color: '#16a34a', filter: 'drop-shadow(0 1px 1px rgba(22, 163, 74, 0.2))' }}>
                  SAATHI
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#a16207',
                    backgroundColor: '#fefce8',
                    border: '1px solid #fef08a',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚡ ENERGY SAVERS
                </span>
              </div>
            </div>
          </NavLink>

          {/* Close Button on Mobile */}
          <button
            type="button"
            onClick={onClose}
            className="hamburger-btn"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <ul className="nav-menu">
          <div className="nav-section-title">Core Navigation</div>
          <li>
            <NavLink
              to="/"
              end
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>{isSuperAdmin ? 'Super Admin Dashboard' : 'Partner Dashboard'}</span>
            </NavLink>
          </li>

          {isSuperAdmin ? (
            <>
              <div className="nav-section-title">Franchise Network</div>
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
                  to="/rewards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Award size={18} />
                  <span>Rewards & Recognitions</span>
                </NavLink>
              </li>

              <div className="nav-section-title">Card Distribution</div>
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

              <div className="nav-section-title">Operations & Field</div>
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

              <div className="nav-section-title">Franchise Partner Views</div>
              <li>
                <NavLink
                  to="/my-customers"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>My Customer</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/my-installed-cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Zap size={18} />
                  <span>My Installed Cards</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/my-pending-cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Clock size={18} />
                  <span>My Pending Cards</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/my-sub-franchises"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Building2 size={18} />
                  <span>My Sub Franchise Partners</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/sub-franchise-installed-cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Wrench size={18} />
                  <span>My Sub Franchise Installed Cards</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/sub-franchise-customers"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <UserCheck size={18} />
                  <span>Sub Franchise Customers</span>
                </NavLink>
              </li>

              <div className="nav-section-title">Intelligence & Audit</div>
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
              {/* FRANCHISE OPERATIONS */}
              <div className="nav-section-title">Franchise Operations</div>
              <li>
                <NavLink
                  to="/my-customers"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>My Customers</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/my-installed-cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Zap size={18} />
                  <span>My Installed Cards</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/my-pending-cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Clock size={18} />
                  <span>My Pending Cards</span>
                </NavLink>
              </li>

              {/* SUB-FRANCHISE NETWORK */}
              {partner?.franchiseType !== 'SUB_FRANCHISE' && (
                <>
                  <div className="nav-section-title">Sub-Franchise Network</div>
                  <li>
                    <NavLink
                      to="/my-sub-franchises"
                      onClick={handleNavClick}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Building2 size={18} />
                      <span>My Sub-Franchise Partners</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/sub-franchise-installed-cards"
                      onClick={handleNavClick}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Wrench size={18} />
                      <span>My Sub-Franchise Installed Cards</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/sub-franchise-customers"
                      onClick={handleNavClick}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                      <UserCheck size={18} />
                      <span>Sub-Franchise Customers</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* INVENTORY MANAGEMENT */}
              <div className="nav-section-title">Inventory Management</div>
              <li>
                <NavLink
                  to="/cards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <CreditCard size={18} />
                  <span>My Total Stock</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/transactions"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <FileText size={18} />
                  <span>Stock Transfer History</span>
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

              {/* REWARDS & RECOGNITION */}
              <div className="nav-section-title">Performance & Recognition</div>
              <li>
                <NavLink
                  to="/rewards"
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Award size={18} />
                  <span>Rewards & Recognitions</span>
                </NavLink>
              </li>

              {/* ACCOUNT & SUPPORT */}
              <div className="nav-section-title">Account & Support</div>
              {partner?._id && (
                <li>
                  <NavLink
                    to={`/partners/${partner._id}`}
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <UserCircle size={18} />
                    <span>Profile & KYC</span>
                  </NavLink>
                </li>
              )}
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
            </>
          )}
        </ul>

        {/* Sidebar Footer: User Status Card & Logout */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Mini User Profile Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: isSuperAdmin ? '#0284c7' : '#16a34a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '13px',
                flexShrink: 0,
                boxShadow: isSuperAdmin ? '0 2px 6px rgba(2, 132, 199, 0.3)' : '0 2px 6px rgba(22, 163, 74, 0.3)',
              }}
            >
              {isSuperAdmin ? <Sparkles size={16} /> : <UserCircle size={17} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.2',
                }}
                title={displayName}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: '600',
                  color: isSuperAdmin ? '#0284c7' : '#16a34a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                }}
              >
                {displaySubtitle}
              </div>
            </div>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 0 2px #dcfce7',
                flexShrink: 0,
              }}
              title="Online & Connected"
            />
          </div>

          {/* High-End Red Accent Logout Button */}
          <button
            onClick={logout}
            className="sidebar-logout-btn"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '9px',
              fontSize: '12.5px',
              fontWeight: '700',
              border: '1px solid #fee2e2',
              backgroundColor: '#fff5f5',
              color: '#dc2626',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
