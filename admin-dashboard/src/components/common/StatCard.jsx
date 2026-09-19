import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  bgLight = '#eff6ff',
  iconColor = '#087db5',
  borderLeftColor,
  borderTopColor,
  borderColor = '#e2e8f0',
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
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '124px',
        boxSizing: 'border-box',
        padding: '16px 18px',
        backgroundColor: '#ffffff',
        border: `1px solid ${borderColor}`,
        ...(borderLeftColor ? { borderLeft: `4px solid ${borderLeftColor}` } : {}),
        ...(borderTopColor ? { borderTop: `3px solid ${borderTopColor}` } : {}),
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.18s ease',
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
          marginBottom: '4px',
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
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                color: '#64748b',
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
                  backgroundColor: bgLight || '#e0f2fe',
                  color: iconColor || '#0284c7',
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
            backgroundColor: bgLight,
            color: iconColor,
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {Icon && <Icon size={16} />}
        </div>
      </div>

      {/* Value */}
      <div className="stat-value" style={{ lineHeight: '1.1', marginBottom: '4px' }}>
        {loading ? '...' : (value ?? 0)}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className="stat-subtitle"
          style={{
            color: isActive ? (iconColor || '#0284c7') : '#64748b',
            fontWeight: isActive ? '700' : '600',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
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

