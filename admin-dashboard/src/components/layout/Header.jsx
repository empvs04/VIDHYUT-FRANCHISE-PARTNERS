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
                fontWeight: '800',
                color: '#15803d',
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              <Circle size={6} fill="#15803d" />
              Live
            </span>

            {partner && (
              <span
                className="header-franchise-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: '#0284c7',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`${partner.franchiseId} (${partner.district || partner.state})`}
              >
                <span className="franchise-id-text" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                  {partner.franchiseId}
                </span>
                <span className="franchise-territory-text" style={{ fontWeight: 600, color: '#0369a1' }}>
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
            <Sparkles size={15} color="#ea580c" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: '14.5px',
                fontWeight: '900',
                letterSpacing: '0.4px',
                background: 'linear-gradient(90deg, #ea580c 0%, #d97706 32%, #15803d 68%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.08))',
              }}
            >
              WELCOME VIDHYUT SAATHI ENERGY SAVERS LTD
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
            backgroundColor: isSuperAdmin ? 'var(--color-primary-light)' : '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            flexShrink: 0,
            border: '1.5px solid #cbd5e1',
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
