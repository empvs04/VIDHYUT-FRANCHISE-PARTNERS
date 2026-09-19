import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  bgLight = '#EFF6FF',
  iconColor = '#087DB5',
  borderLeftColor,
  borderTopColor,
  borderColor = '#E2E8F0',
  borderHoverColor,
  accentGradient,
  onClick,
  isActive = false,
  activeLabel = 'Active Filter',
  loading = false,
  style = {},
  headerRight,
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`stat-card ${isClickable ? 'clickable' : ''} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={(e) => {
        const hoverColor = borderHoverColor || (
          borderColor === '#FDE68A' ? '#FACC15' :
          borderColor === '#A7F3D0' ? '#34D399' :
          borderColor === '#FED7AA' ? '#FB923C' :
          borderColor === '#BAE6FD' ? '#60A5FA' :
          '#94A3B8'
        );
        e.currentTarget.style.borderColor = hoverColor;
        e.currentTarget.style.boxShadow = `0 6px 18px -2px rgba(15, 23, 42, 0.08), 0 0 12px ${hoverColor}35`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = borderColor || '#E2E8F0';
        e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 2px 0 rgba(15, 23, 42, 0.02)';
        e.currentTarget.style.transform = 'none';
      }}
      title={isClickable ? `Click to filter by ${title}` : undefined}
      style={{
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '124px',
        boxSizing: 'border-box',
        padding: '16px 18px',
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${borderColor || '#E2E8F0'}`,
        ...(borderLeftColor ? { borderLeft: `4px solid ${borderLeftColor}` } : {}),
        ...(borderTopColor ? { borderTop: `3px solid ${borderTopColor}` } : {}),
        borderRadius: '14px',
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 2px 0 rgba(15, 23, 42, 0.02)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: isClickable ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Top Header Row: Title & Badge on Left, Icon on Right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              className="stat-title"
              style={{
                margin: 0,
                minHeight: '22px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#64748B',
                lineHeight: 1.25,
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              title={typeof title === 'string' ? title : undefined}
            >
              {title}
            </span>
            {headerRight && <span onClick={(e) => e.stopPropagation()}>{headerRight}</span>}
          </div>
          {isActive && (
            <div>
              <span
                className="stat-card-badge"
                style={{
                  display: 'inline-block',
                  fontSize: '9.5px',
                  fontWeight: '800',
                  padding: '1.5px 6px',
                  borderRadius: '4px',
                  backgroundColor: bgLight || '#EFF6FF',
                  color: iconColor || '#087DB5',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeLabel}
              </span>
            </div>
          )}
        </div>

        <div
          className="stat-icon-wrap"
          style={{
            background: bgLight || '#EFF6FF',
            color: iconColor || '#087DB5',
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${borderColor || '#E2E8F0'}`,
          }}
        >
          {Icon && <Icon size={17} />}
        </div>
      </div>

      {/* Value */}
      <div
        className="stat-value"
        style={{
          lineHeight: '1.1',
          marginBottom: '4px',
          fontSize: '25px',
          fontWeight: '900',
          letterSpacing: '-0.3px',
          color: '#0F172A',
        }}
      >
        {loading ? '...' : (value ?? 0)}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className="stat-subtitle"
          style={{
            color: isActive ? (iconColor || '#087DB5') : '#64748B',
            fontWeight: isActive ? '700' : '600',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={typeof subtitle === 'string' ? subtitle : undefined}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default StatCard;

