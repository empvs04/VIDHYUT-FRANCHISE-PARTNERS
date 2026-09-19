import React from 'react';

export const formatActivationTime = (dateInput) => {
  if (!dateInput) return 'Never logged in';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never logged in';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const StatusBadge = ({ status, lastLoginAt, lastActiveAt, showActivation = false }) => {
  let badgeClass = 'badge-inactive';
  let dotColor = '#64748B';
  let label = status || 'Unknown';

  if (status === 'ACTIVE') {
    badgeClass = 'badge-active';
    dotColor = '#16A34A';
  } else if (status === 'SUSPENDED') {
    badgeClass = 'badge-suspended';
    dotColor = '#DC2626';
  } else if (status === 'EXPIRED') {
    badgeClass = 'badge-expired';
    dotColor = '#D97706';
  } else if (status === 'PENDING_APPROVAL') {
    badgeClass = 'badge-pending';
    dotColor = '#0284C7';
    label = 'Pending Approval';
  }

  const activeDate = lastActiveAt || lastLoginAt;
  const timeFormatted = activeDate ? formatActivationTime(activeDate) : null;
  const isRecent = activeDate && (Date.now() - new Date(activeDate).getTime() < 15 * 60 * 1000);

  const getStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: isRecent ? '#DCFCE7' : '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' };
      case 'SUSPENDED':
        return { backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' };
      case 'EXPIRED':
        return { backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' };
      case 'PENDING_APPROVAL':
        return { backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
    }
  };

  const displayText = status === 'ACTIVE' && (showActivation || timeFormatted) && timeFormatted && timeFormatted !== 'Never logged in'
    ? `Active • ${timeFormatted}`
    : label;

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        ...getStyle(),
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '11.5px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
      }}
      title={activeDate ? `Latest Activation / Session: ${new Date(activeDate).toLocaleString('en-IN')}` : undefined}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          boxShadow: isRecent ? '0 0 6px rgba(22, 163, 74, 0.6)' : 'none',
        }}
      />
      {displayText}
    </span>
  );
};

export const PartnerActivationBadge = ({ status = 'ACTIVE', lastLoginAt, lastActiveAt, createdAt, compact = false }) => {
  const activeDate = lastActiveAt || lastLoginAt;
  const parsedActive = activeDate ? new Date(activeDate) : null;
  const isValidActive = parsedActive && !isNaN(parsedActive.getTime());

  const parsedCreated = createdAt ? new Date(createdAt) : null;
  const isValidCreated = parsedCreated && !isNaN(parsedCreated.getTime());

  const now = new Date();
  const isToday = isValidActive && (parsedActive.toDateString() === now.toDateString());
  const isRecent = isValidActive && (now.getTime() - parsedActive.getTime() < 15 * 60 * 1000);

  if (status !== 'ACTIVE') {
    return <StatusBadge status={status} />;
  }

  if (isToday) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: compact ? '2px 7px' : '3px 9px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: isRecent ? '#DCFCE7' : '#F0FDF4',
            color: '#15803D',
            border: isRecent ? '1px solid #86EFAC' : '1px solid #BBF7D0',
            whiteSpace: 'nowrap',
          }}
          title={`Active today: ${parsedActive.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isRecent ? '#16A34A' : '#22C55E',
              display: 'inline-block',
              boxShadow: isRecent ? '0 0 6px rgba(22, 163, 74, 0.6)' : 'none',
            }}
          />
          <span>Active • Today</span>
        </span>
        {!compact && (
          <span style={{ fontSize: '9.5px', color: '#15803D', paddingLeft: '4px', fontWeight: '700' }}>
            {parsedActive.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        )}
      </div>
    );
  }

  // Not active today -> Show last active date or joined date
  const lastActiveText = isValidActive
    ? formatActivationTime(parsedActive)
    : isValidCreated
    ? `Joined ${parsedCreated.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : 'First Login Pending';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '2px 7px' : '3px 9px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '700',
          backgroundColor: '#F8FAFC',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          whiteSpace: 'nowrap',
        }}
        title={isValidActive ? `Last Session: ${parsedActive.toLocaleString('en-IN')}` : 'No session recorded'}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#94A3B8',
            display: 'inline-block',
          }}
        />
        <span>{isValidActive ? `Last Active: ${lastActiveText}` : lastActiveText}</span>
      </span>
      {!compact && isValidActive && (
        <span style={{ fontSize: '9.5px', color: '#94A3B8', paddingLeft: '4px', fontWeight: '600' }}>
          {parsedActive.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      )}
    </div>
  );
};

export const FranchiseTypeBadge = ({ type }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '700',
    lineHeight: '1.2',
    width: 'fit-content',
  };

  if (type === 'NON_EXCLUSIVE_DISTRICT') {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
        }}
      >
        Non Exclusive District
      </span>
    );
  }

  if (type === 'STANDARD_EXCLUSIVE_DISTRICT') {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
        }}
      >
        Standard Exclusive District
      </span>
    );
  }

  if (type === 'PREMIUM_EXCLUSIVE_DISTRICT') {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
        }}
      >
        Premium Exclusive District
      </span>
    );
  }

  if (type === 'STATE_FRANCHISE') {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
        }}
      >
        State Franchise
      </span>
    );
  }

  if (type === 'DISTRICT_FRANCHISE') {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
        }}
      >
        District Franchise
      </span>
    );
  }

  return (
    <span
      style={{
        ...baseStyle,
        backgroundColor: '#FAF5FF',
        color: '#7E22CE',
        border: '1px solid #E9D5FF',
      }}
    >
      Sub-Franchise
    </span>
  );
};

export const CardStatusBadge = ({ status }) => {
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#CBD5E1';
  let dotColor = '#64748B';
  let label = status || 'UNKNOWN';

  switch (status) {
    case 'AVAILABLE':
      bg = '#F0FDF4';
      color = '#15803D';
      border = '#BBF7D0';
      dotColor = '#16A34A';
      label = 'AVAILABLE';
      break;
    case 'ASSIGNED':
      bg = '#EFF6FF';
      color = '#1D4ED8';
      border = '#BFDBFE';
      dotColor = '#2563EB';
      label = 'ASSIGNED';
      break;
    case 'TRANSFERRED':
      bg = '#FAF5FF';
      color = '#7E22CE';
      border = '#E9D5FF';
      dotColor = '#9333EA';
      label = 'TRANSFERRED';
      break;
    case 'PENDING_TRANSFER':
      bg = '#FFFBEB';
      color = '#B45309';
      border = '#FDE68A';
      dotColor = '#F59E0B';
      label = 'PENDING TRANSFER';
      break;
    case 'INSTALLED':
      bg = '#ECFDF5';
      color = '#047857';
      border = '#A7F3D0';
      dotColor = '#059669';
      label = 'INSTALLED';
      break;
    case 'BLOCKED':
      bg = '#FEF2F2';
      color = '#B91C1C';
      border = '#FECACA';
      dotColor = '#DC2626';
      label = 'BLOCKED';
      break;
    default:
      break;
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '800',
        letterSpacing: '0.4px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
};

export const TransactionStatusBadge = ({ status }) => {
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#CBD5E1';
  let dotColor = '#64748B';
  let label = status || 'UNKNOWN';

  switch (status) {
    case 'PENDING_CONFIRMATION':
      bg = '#FFFBEB';
      color = '#B45309';
      border = '#FDE68A';
      dotColor = '#F59E0B';
      label = 'PENDING CONFIRMATION';
      break;
    case 'CONFIRMED':
      bg = '#F0FDF4';
      color = '#15803D';
      border = '#BBF7D0';
      dotColor = '#16A34A';
      label = 'CONFIRMED';
      break;
    case 'DISPUTED':
      bg = '#FEF2F2';
      color = '#B91C1C';
      border = '#FECACA';
      dotColor = '#DC2626';
      label = 'DISPUTED';
      break;
    case 'CANCELLED':
      bg = '#F1F5F9';
      color = '#64748B';
      border = '#CBD5E1';
      dotColor = '#94A3B8';
      label = 'CANCELLED';
      break;
    default:
      break;
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '800',
        letterSpacing: '0.4px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
};

export const PaymentStatusBadge = ({ status }) => {
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#CBD5E1';
  let label = status || 'PENDING';

  switch (status) {
    case 'VERIFIED':
      bg = '#DCFCE7';
      color = '#15803D';
      border = '#BBF7D0';
      label = 'PAYMENT VERIFIED';
      break;
    case 'SUBMITTED':
      bg = '#EFF6FF';
      color = '#1D4ED8';
      border = '#BFDBFE';
      label = 'PROOF SUBMITTED';
      break;
    case 'REJECTED':
      bg = '#FEE2E2';
      color = '#B91C1C';
      border = '#FECACA';
      label = 'PAYMENT REJECTED';
      break;
    default:
      bg = '#F1F5F9';
      color = '#64748B';
      border = '#E2E8F0';
      label = 'PAYMENT PENDING';
      break;
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10.5px',
        fontWeight: '700',
        letterSpacing: '0.3px',
      }}
    >
      {label}
    </span>
  );
};

export const TransactionTypeBadge = ({ type }) => {
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#E2E8F0';

  if (type === 'SALE') {
    bg = '#ECFDF5';
    color = '#047857';
    border = '#A7F3D0';
  } else if (type === 'TRANSFER') {
    bg = '#EFF6FF';
    color = '#1D4ED8';
    border = '#BFDBFE';
  } else if (type === 'COMPLIMENTARY') {
    bg = '#F0FDF4';
    color = '#0284C7';
    border = '#BAE6FD';
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '800',
        letterSpacing: '0.3px',
      }}
    >
      {type || 'TRANSFER'}
    </span>
  );
};

