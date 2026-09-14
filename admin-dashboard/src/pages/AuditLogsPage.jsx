import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Activity,
  FileText,
  Building2,
  CreditCard,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const AUDIT_ACTIONS_LIST = [
  'ADMIN_LOGIN',
  'PARTNER_LOGIN',
  'PARTNER_CREATED',
  'PARTNER_UPDATED',
  'PARTNER_STATUS_CHANGED',
  'CARD_CREATED',
  'CARD_ASSIGNED',
  'CARD_TRANSFERRED',
  'CARD_INSTALLED',
  'CARD_BLOCKED',
  'TRANSACTION_CREATED',
  'TRANSACTION_CONFIRMED',
  'TRANSACTION_DISPUTED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'CUSTOMER_CREATED',
  'INSTALLATION_CREATED',
  'INSTALLATION_VERIFIED',
  'GPS_CAPTURED',
  'TERRITORY_MISMATCH_DETECTED',
  'ADMIN_LOCATION_OVERRIDE',
];

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();

  // Filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        search: search.trim(),
        action,
        entityType,
        actorRole,
        startDate,
        endDate,
      };

      const res = await api.get('/audit', { params });
      if (res.data?.data) {
        setLogs(res.data.data.logs || []);
        setPagination(res.data.data.pagination || { total: 0, page: 1, totalPages: 1 });
      }
    } catch {
      showToast('Failed to retrieve immutable audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, action, entityType, actorRole, startDate, endDate, showToast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Shield size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">Immutable System Audit Logs</h1>
            <p className="page-subtitle">
              Read-only chronological audit trail capturing security events, partner administration, card lifecycle, and transaction changes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 16px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <div className="filter-bar-grid">
          <div className="filter-search-full">
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Search (ID / Description)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search audit ID, entity, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px', paddingLeft: '32px' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
            </div>
          </div>

          <div className="filter-selects-grid">
            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Action Type
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '8px 10px' }}
              >
                <option value="">All Actions</option>
                {AUDIT_ACTIONS_LIST.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '8px 10px' }}
              >
                <option value="">All Entities</option>
                <option value="USER">USER</option>
                <option value="PARTNER">PARTNER</option>
                <option value="CARD">CARD</option>
                <option value="TRANSACTION">TRANSACTION</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="INSTALLATION">INSTALLATION</option>
                <option value="LOCATION_VERIFICATION">LOCATION_VERIFICATION</option>
              </select>
            </div>

            <div className="filter-select-item filter-full-width">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Actor Role
              </label>
              <select
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '8px 10px' }}
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="STATE_FRANCHISE">STATE_FRANCHISE</option>
                <option value="DISTRICT_FRANCHISE">DISTRICT_FRANCHISE</option>
                <option value="SUB_FRANCHISE">SUB_FRANCHISE</option>
              </select>
            </div>

            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '7px 8px' }}
              />
            </div>

            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '7px 8px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Container Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="#0284c7" />
            <span>Total Audit Events:</span>
            <span style={{ color: '#0284c7', background: '#e0f2fe', padding: '1px 8px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 800 }}>
              {pagination.total}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Audit ID</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Actor</th>
                <th style={{ padding: '12px 16px' }}>Entity</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px' }}>IP / Agent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                    {log.auditId}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {log.actorUserId?.name || 'System'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {log.actorRole} {log.actorPartnerId ? `(${log.actorPartnerId.franchiseId})` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0369a1' }}>{log.entityType}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{log.entityId}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', maxWidth: '300px' }}>
                    {log.description}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lucrative Mobile Cards View */}
        <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {logs.map((log) => {
            const isDanger = log.action.includes('BLOCKED') || log.action.includes('DISPUTED') || log.action.includes('MISMATCH');
            const isSuccess = log.action.includes('VERIFIED') || log.action.includes('CONFIRMED') || log.action.includes('LOGIN');
            const accentColor = isDanger ? '#dc2626' : isSuccess ? '#16a34a' : '#0284c7';
            const actionBg = isDanger ? '#fee2e2' : isSuccess ? '#dcfce7' : '#e0f2fe';
            const actionColor = isDanger ? '#991b1b' : isSuccess ? '#166534' : '#0369a1';

            return (
              <div
                key={log._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${accentColor}`,
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header: Audit ID & Action Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} color={accentColor} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {log.auditId}
                    </span>
                  </div>
                  <span
                    style={{
                      background: actionBg,
                      color: actionColor,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {log.action}
                  </span>
                </div>

                {/* Description */}
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500, lineHeight: '1.4' }}>
                  {log.description}
                </div>

                {/* Structured 2-Col Actor & Entity Box */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={11} color="#64748b" /> Actor
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>
                      {log.actorUserId?.name || 'System'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                      {log.actorRole}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={11} color="#64748b" /> Entity
                    </div>
                    <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '12.5px' }}>
                      {log.entityType}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {log.entityId ? (log.entityId.length > 14 ? `${log.entityId.slice(0, 14)}...` : log.entityId) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Footer: IP and Timestamp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                  <span>IP: <strong style={{ color: '#64748b' }}>{log.ipAddress || 'Internal'}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {logs.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            No audit logs found matching criteria.
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
