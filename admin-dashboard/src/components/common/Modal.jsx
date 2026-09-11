import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '550px' }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'slideUp 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
