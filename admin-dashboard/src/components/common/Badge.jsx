import React from 'react';

export const StatusBadge = ({ status }) => {
  const isActive = status === 'ACTIVE';
  return (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isActive ? '#16a34a' : '#64748b',
          display: 'inline-block',
        }}
      />
      {status || 'Unknown'}
    </span>
  );
};

export const FranchiseTypeBadge = ({ type }) => {
  if (type === 'STATE_FRANCHISE') {
    return <span className="badge badge-state">State Franchise</span>;
  }
  return <span className="badge badge-district">District Franchise</span>;
};
