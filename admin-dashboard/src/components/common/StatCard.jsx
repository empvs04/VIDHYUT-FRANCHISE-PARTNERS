import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  bgLight = '#e0f2fe',
  iconColor = '#0284c7',
  borderLeftColor,
  onClick,
  isActive = false,
  activeLabel = 'Active Filter',
  loading = false,
  style = {},
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
        ...(borderLeftColor ? { borderLeft: `4px solid ${borderLeftColor}` } : {}),
        ...style,
      }}
    >
      {isActive && (
        <span className="stat-card-badge">
          {activeLabel}
        </span>
      )}
      <div>
        <div className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{title}</span>
        </div>
        <div className="stat-value">
          {loading ? '...' : (value ?? 0)}
        </div>
        {subtitle && (
          <div style={{ fontSize: '11.5px', color: isActive ? (iconColor || '#0284c7') : 'var(--text-muted)', marginTop: '4px', fontWeight: isActive ? '600' : '400' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="stat-icon-wrap" style={{ backgroundColor: bgLight, color: iconColor }}>
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
};

export default StatCard;

