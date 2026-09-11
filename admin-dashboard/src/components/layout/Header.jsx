import React from 'react';
import { ShieldCheck, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>System Status:</span>
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
          <Circle size={8} fill="#15803d" />
          Live Atlas Connected
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {user?.fullName || 'Super Administrator'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {user?.email || 'admin@vidhyutsaathi.com'}
          </div>
        </div>

        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
          }}
        >
          <ShieldCheck size={20} />
        </div>
      </div>
    </header>
  );
};

export default Header;
