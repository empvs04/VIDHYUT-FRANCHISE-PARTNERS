import React from 'react';
import { ShieldCheck, Circle, Menu, Building2, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = ({ onToggleSidebar }) => {
  const { user, partner, isSuperAdmin } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hamburger-btn"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#15803d',
              backgroundColor: '#dcfce7',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <Circle size={7} fill="#15803d" />
            Atlas Live
          </span>

          {partner && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#0284C7',
                backgroundColor: '#E0F2FE',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {partner.franchiseId} ({partner.district || partner.state})
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {partner?.fullName || user?.fullName || 'Super Administrator'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isSuperAdmin ? 'SUPER_ADMIN' : partner?.franchiseType?.replace('_', ' ') || user?.role}
          </div>
        </div>

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isSuperAdmin ? 'var(--color-primary-light)' : '#E0F2FE',
            color: '#0284C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
          }}
        >
          {isSuperAdmin ? <ShieldCheck size={18} /> : <Building2 size={18} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
