import React from 'react';
import { ShieldCheck, Circle, Menu, Building2, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../common/NotificationDropdown';

const Header = ({ onToggleSidebar }) => {
  const { user, partner, isSuperAdmin } = useAuth();

  return (
    <header className="top-header">
      {/* Left Section: Hamburger & Status / Franchise Pill & Welcome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: '1 1 auto' }}>
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hamburger-btn"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span
              className="header-live-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#16a34a',
                backgroundColor: '#f0fdf4',
                border: '1px solid #dcfce7',
                padding: '2px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                letterSpacing: '0.3px',
              }}
            >
              <Circle size={6} fill="#16a34a" color="#16a34a" />
              Active System
            </span>

            {partner && (
              <span
                className="header-franchise-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: '#075985',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`${partner.franchiseId} (${partner.district || partner.state})`}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {partner.franchiseId}
                </span>
                <span style={{ color: '#64748b' }}>
                  ({partner.district || partner.state})
                </span>
              </span>
            )}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: '800',
                letterSpacing: '0.3px',
                color: '#0f172a',
                textTransform: 'uppercase',
              }}
            >
              VIDHYUT SAATHI <span style={{ color: '#087db5', fontWeight: '700' }}>ENERGY SAVERS</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Section: Notification & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <NotificationDropdown />

        <div className="header-user-info" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {partner?.fullName || user?.fullName || 'Super Administrator'}
          </div>

          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {isSuperAdmin ? 'SUPER ADMIN' : partner?.franchiseType?.replace(/_/g, ' ') || user?.role}
          </div>
        </div>

        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#087db5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            flexShrink: 0,
            border: '1.5px solid #bfdbfe',
          }}
          title={partner?.fullName || user?.fullName}
        >
          {isSuperAdmin ? <ShieldCheck size={17} /> : <Building2 size={17} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
