import React from 'react';

const StatCard = ({ title, value, icon: Icon, bgLight = '#e0f2fe', iconColor = '#0284c7' }) => {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value ?? 0}</div>
      </div>
      <div className="stat-icon-wrap" style={{ backgroundColor: bgLight, color: iconColor }}>
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
};

export default StatCard;
