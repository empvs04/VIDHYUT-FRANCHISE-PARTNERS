import React from 'react';

export const StatusBadge = ({ status }) => {
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

  const getStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#DCFCE7', color: '#15803D' };
      case 'SUSPENDED':
        return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
      case 'EXPIRED':
        return { backgroundColor: '#FEF3C7', color: '#B45309' };
      case 'PENDING_APPROVAL':
        return { backgroundColor: '#E0F2FE', color: '#0369A1' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#475569' };
    }
  };

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

export const FranchiseTypeBadge = ({ type }) => {
  if (type === 'NON_EXCLUSIVE_DISTRICT') {
    return (
      <span
        style={{
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
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
          backgroundColor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
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
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
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
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
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
          backgroundColor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
        }}
      >
        District Franchise
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: '#FAF5FF',
        color: '#7E22CE',
        border: '1px solid #E9D5FF',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: '700',
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

