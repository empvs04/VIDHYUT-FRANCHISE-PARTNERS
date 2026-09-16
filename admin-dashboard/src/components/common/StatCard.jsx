import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  bgLight = '#e0f2fe',
  iconColor = '#0284c7',
  borderLeftColor,
  borderTopColor,
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
      title={isClickable ? `Click to filter by ${title}` : undefined}
      style={{
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        minHeight: '102px',
        boxSizing: 'border-box',
        ...(borderLeftColor ? { borderLeft: `3.5px solid ${borderLeftColor}` } : {}),
        ...(borderTopColor ? { borderTop: `2.5px solid ${borderTopColor}` } : {}),
        ...style,
      }}
    >
      {borderTopColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2.5px',
            backgroundColor: borderTopColor,
            zIndex: 1,
          }}
        />
      )}
      {isActive && (
        <span className="stat-card-badge">
          {activeLabel}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, paddingRight: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <div className="stat-title" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', minHeight: '28px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            {headerRight && <span onClick={(e) => e.stopPropagation()}>{headerRight}</span>}
          </span>
        </div>
        <div className="stat-value" style={{ lineHeight: '1.15' }}>
          {loading ? '...' : (value ?? 0)}
        </div>
        {subtitle && (
          <div
            className="stat-subtitle"
            style={{
              color: isActive ? (iconColor || '#0284c7') : '#64748b',
              fontWeight: isActive ? '700' : '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '4px',
            }}
            title={typeof subtitle === 'string' ? subtitle : undefined}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div
        className="stat-icon-wrap"
        style={{
          backgroundColor: bgLight,
          color: iconColor,
          width: '36px',
          height: '36px',
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          alignSelf: 'flex-start',
          marginTop: '2px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        {Icon && <Icon size={18} />}
      </div>
    </div>
  );
};

export default StatCard;

