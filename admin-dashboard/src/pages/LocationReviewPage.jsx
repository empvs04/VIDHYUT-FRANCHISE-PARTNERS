import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Filter,
  ExternalLink,
  Navigation,
  Clock,
  User,
  Building,
  ChevronRight,
  Compass,
  AlertOctagon,
  FileCheck,
  Check,
  X,
  History,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const LocationReviewPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accuracyFilter, setAccuracyFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    mismatch: 0,
    lowAccuracy: 0,
    reviewRequired: 0,
    rejected: 0,
  });

  // Modal States
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Review Form State
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Fetch Verifications
  const fetchVerifications = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        verificationStatus: statusFilter || undefined,
        accuracyStatus: accuracyFilter || undefined,
      };

      const [listRes, statsRes] = await Promise.all([
        api.get('/location-verifications', { params }),
        api.get('/location-verifications/stats').catch(() => null),
      ]);

      if (listRes.data?.data) {
        setVerifications(listRes.data.data.verifications || []);
        setPagination(listRes.data.data.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
      }

      if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load location verification logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications(1);
  }, [statusFilter, accuracyFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVerifications(1);
  };

  const handleOpenMap = (item) => {
    setSelectedLocation(item);
    setIsMapModalOpen(true);
  };

  const handleOpenReview = (item) => {
    setSelectedLocation(item);
    setReviewAction(item.verificationStatus === 'TERRITORY_MISMATCH' ? 'APPROVE' : 'REJECT');
    setReviewReason('');
    setIsReviewModalOpen(true);
  };

  const handleOpenAudit = (item) => {
    setSelectedLocation(item);
    setIsAuditModalOpen(true);
  };

  const handleAdminReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewReason.trim()) {
      showToast('Please enter an administrative reason/justification for this decision.', 'error');
      return;
    }

    try {
      setReviewSubmitting(true);
      const res = await api.post(`/location-verifications/${selectedLocation._id}/review`, {
        action: reviewAction,
        reason: reviewReason.trim(),
      });

      if (res.data?.data) {
        showToast(
          reviewAction === 'APPROVE'
            ? 'Location verified and approved successfully!'
            : 'Location verification rejected.',
          'success'
        );
        setIsReviewModalOpen(false);
        fetchVerifications(pagination.page);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit review.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Helper for Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <CheckCircle2 size={13} /> Verified
          </span>
        );
      case 'ADMIN_OVERRIDDEN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ede9fe', color: '#6d28d9', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <ShieldCheck size={13} /> Admin Approved
          </span>
        );
      case 'TERRITORY_MISMATCH':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <AlertTriangle size={13} /> Territory Mismatch
          </span>
        );
      case 'LOW_ACCURACY':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <Compass size={13} /> Low Accuracy
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#991b1b', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <XCircle size={13} /> Rejected
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ffedd5', color: '#c2410c', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <AlertOctagon size={13} /> Review Required
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            {status}
          </span>
        );
    }
  };

  // Helper for Accuracy Badge
  const renderAccuracyBadge = (accuracy, status) => {
    const accNum = parseFloat(accuracy) || 0;
    let bg = '#dcfce7';
    let col = '#15803d';
    if (accNum > 100 || status === 'POOR') {
      bg = '#fee2e2';
      col = '#b91c1c';
    } else if (accNum > 50 || status === 'ACCEPTABLE') {
      bg = '#fef3c7';
      col = '#b45309';
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: bg, color: col, padding: '2px 7px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 700 }}>
        ±{accNum.toFixed(1)} m ({status || (accNum <= 50 ? 'GOOD' : accNum <= 100 ? 'ACCEPTABLE' : 'POOR')})
      </span>
    );
  };

  return (
    <div className="page-body">
      {/* Top Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <MapPin size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">GPS Location & Territory Audit Trail</h1>
            <p className="page-subtitle">
              Immutable audit log of live field GPS coordinates, reverse geocoding telemetry, and territory boundary verification.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            onClick={() => fetchVerifications(pagination.page)}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Interactive Clickable Filters) */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <StatCard
          title="Total GPS Verifications"
          value={stats.total}
          subtitle={statusFilter === '' && accuracyFilter === '' ? '● All Records Showing' : 'Click to show all'}
          icon={MapPin}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          onClick={() => {
            setStatusFilter('');
            setAccuracyFilter('');
          }}
          isActive={statusFilter === '' && accuracyFilter === ''}
          activeLabel="All Logs"
          loading={loading}
        />
        <StatCard
          title="In-Territory Verified"
          value={stats.verified}
          subtitle="Within assigned boundary"
          icon={CheckCircle2}
          bgLight="#dcfce7"
          iconColor="#15803d"
          onClick={() => {
            setAccuracyFilter('');
            setStatusFilter((prev) => (prev === 'VERIFIED' ? '' : 'VERIFIED'));
          }}
          isActive={statusFilter === 'VERIFIED'}
          activeLabel="Filtered"
          loading={loading}
        />
        <StatCard
          title="Territory Mismatches"
          value={stats.mismatch}
          subtitle="Outside authorized district"
          icon={AlertTriangle}
          bgLight="#fee2e2"
          iconColor="#b91c1c"
          onClick={() => {
            setAccuracyFilter('');
            setStatusFilter((prev) => (prev === 'TERRITORY_MISMATCH' ? '' : 'TERRITORY_MISMATCH'));
          }}
          isActive={statusFilter === 'TERRITORY_MISMATCH'}
          activeLabel="Filtered"
          loading={loading}
        />
        <StatCard
          title="Low Accuracy"
          value={stats.lowAccuracy}
          subtitle="Accuracy > 100m"
          icon={Compass}
          bgLight="#fef3c7"
          iconColor="#b45309"
          onClick={() => {
            setStatusFilter('');
            setAccuracyFilter((prev) => (prev === 'POOR' ? '' : 'POOR'));
          }}
          isActive={accuracyFilter === 'POOR' || statusFilter === 'LOW_ACCURACY'}
          activeLabel="Filtered"
          loading={loading}
        />
        <StatCard
          title="Admin Approved"
          value={stats.reviewRequired || stats.verified || 0}
          subtitle="Super Admin Overrides"
          icon={ShieldCheck}
          bgLight="#ede9fe"
          iconColor="#6d28d9"
          onClick={() => {
            setAccuracyFilter('');
            setStatusFilter((prev) => (prev === 'ADMIN_OVERRIDDEN' ? '' : 'ADMIN_OVERRIDDEN'));
          }}
          isActive={statusFilter === 'ADMIN_OVERRIDDEN'}
          activeLabel="Filtered"
          loading={loading}
        />
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} className="filter-bar-grid">
          <div className="filter-search-full">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by ID, partner, city, district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '34px', height: '40px', fontSize: '13px' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="filter-selects-grid">
            <div className="filter-select-item">
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '40px', fontSize: '12.5px' }}
              >
                <option value="">All Verification Statuses</option>
                <option value="VERIFIED">Verified (In Territory)</option>
                <option value="TERRITORY_MISMATCH">Territory Mismatch</option>
                <option value="LOW_ACCURACY">Low Accuracy (&gt;100m)</option>
                <option value="ADMIN_OVERRIDDEN">Admin Overridden</option>
                <option value="REVIEW_REQUIRED">Review Required</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="filter-select-item">
              <select
                className="form-control"
                value={accuracyFilter}
                onChange={(e) => setAccuracyFilter(e.target.value)}
                style={{ height: '40px', fontSize: '12.5px' }}
              >
                <option value="">All Accuracies</option>
                <option value="GOOD">Good (≤ 50m)</option>
                <option value="ACCEPTABLE">Acceptable (50-100m)</option>
                <option value="POOR">Poor (&gt; 100m)</option>
              </select>
            </div>
          </div>

          <div className="filter-actions-row">
            <button type="submit" className="btn btn-primary" style={{ height: '40px', padding: '0 16px', fontSize: '13px' }}>
              Filter
            </button>

            {(search || statusFilter || accuracyFilter) && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setAccuracyFilter('');
                }}
                style={{ height: '40px', padding: '0 12px', fontSize: '13px' }}
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Table / Mobile Cards */}
      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <div>Loading GPS verification records...</div>
        </div>
      ) : verifications.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <MapPin size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No GPS Verification Records Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
            {search || statusFilter || accuracyFilter
              ? 'No records match the selected filters. Try broadening your criteria.'
              : 'GPS verifications are automatically recorded whenever a partner captures live field coordinates during installation.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-only card" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verification ID & Date</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Partner & Territory</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>GPS Coordinates</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Detected Location</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '13.5px' }}>
                        {item.locationVerificationId}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <Clock size={11} /> {new Date(item.gpsCapturedAt || item.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                        {item.partnerId?.fullName || 'Franchise Partner'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Auth: <span style={{ fontWeight: 600, color: '#0369a1' }}>{item.authorizedDistrict}, {item.authorizedState}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        {renderAccuracyBadge(item.accuracyMeters, item.accuracyStatus)}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: item.territoryMatch ? '#15803d' : '#b91c1c' }}>
                        {item.district ? `${item.district}, ${item.state}` : item.formattedAddress?.slice(0, 35) || 'India'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Customer Addr: {item.customerEnteredDistrict || 'Same'}, {item.customerEnteredState || 'Same'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {renderStatusBadge(item.verificationStatus)}
                      {item.auditHistory?.length > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#6d28d9', marginTop: '3px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <History size={10} /> {item.auditHistory.length} Override Note(s)
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenMap(item)}
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View on Interactive Map"
                        >
                          <Navigation size={13} />
                          <span>Map</span>
                        </button>

                        {item.auditHistory?.length > 0 && (
                          <button
                            onClick={() => handleOpenAudit(item)}
                            className="btn btn-outline"
                            style={{ padding: '6px 8px', fontSize: '12px', color: '#6d28d9', borderColor: '#ddd6fe' }}
                            title="View Audit Trail"
                          >
                            <History size={13} />
                          </button>
                        )}

                        {isSuperAdmin && item.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => handleOpenReview(item)}
                            className="btn btn-primary"
                            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#0284c7' }}
                            title="Super Admin Review & Override"
                          >
                            <ShieldCheck size={13} />
                            <span>Review</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {verifications.map((item) => (
              <div key={item._id} className="mobile-card-item">
                <div className="mobile-card-header">
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                    {item.locationVerificationId}
                  </span>
                  <div>{renderStatusBadge(item.verificationStatus)}</div>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {item.partnerId?.fullName || 'Partner'}
                  </h4>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Auth: <strong style={{ color: '#0369a1' }}>{item.authorizedDistrict}, {item.authorizedState}</strong>
                  </div>
                </div>

                <div className="mobile-card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <div className="mobile-card-label">Detected Location</div>
                    <div className="mobile-card-value" style={{ color: item.territoryMatch ? '#15803d' : '#b91c1c', fontWeight: 700, fontSize: '13px' }}>
                      {item.district || 'Detected'}, {item.state}
                    </div>
                  </div>
                  <div>
                    <div className="mobile-card-label">GPS Accuracy</div>
                    <div className="mobile-card-value">
                      {renderAccuracyBadge(item.accuracyMeters, item.accuracyStatus)}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <div><strong>Coordinates:</strong> {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</div>
                  <div style={{ marginTop: '2px' }}><strong>Customer Addr:</strong> {item.customerEnteredDistrict || 'Same'}, {item.customerEnteredState || 'Same'}</div>
                  {item.verificationReason && (
                    <div style={{ marginTop: '4px', color: '#b45309', fontWeight: 500 }}>
                      ⚠️ {item.verificationReason}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => handleOpenMap(item)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '8px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Navigation size={14} /> View Map
                  </button>

                  {item.auditHistory?.length > 0 && (
                    <button
                      onClick={() => handleOpenAudit(item)}
                      className="btn btn-outline"
                      style={{ padding: '8px 12px', fontSize: '12.5px', color: '#6d28d9', borderColor: '#ddd6fe' }}
                    >
                      <History size={14} />
                    </button>
                  )}

                  {isSuperAdmin && item.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => handleOpenReview(item)}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#0284c7' }}
                    >
                      <ShieldCheck size={14} /> Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total verifications)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => fetchVerifications(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchVerifications(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Map View Modal */}
      {isMapModalOpen && selectedLocation && (
        <div className="modal-backdrop" onClick={() => setIsMapModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '8px' }}>
                  <Navigation size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    GPS Pin & Boundary Inspection
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ID: {selectedLocation.locationVerificationId}
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsMapModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              {/* Map Preview Frame */}
              <div style={{ height: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px', position: 'relative', background: '#e2e8f0' }}>
                <iframe
                  title="GPS Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.longitude - 0.01}%2C${selectedLocation.latitude - 0.01}%2C${selectedLocation.longitude + 0.01}%2C${selectedLocation.latitude + 0.01}&layer=mapnik&marker=${selectedLocation.latitude}%2C${selectedLocation.longitude}`}
                  style={{ border: 0 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Exact GPS Coordinates</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    {renderAccuracyBadge(selectedLocation.accuracyMeters, selectedLocation.accuracyStatus)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Detected Territory</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: selectedLocation.territoryMatch ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                    {selectedLocation.district || 'District'}, {selectedLocation.state || 'State'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Auth: {selectedLocation.authorizedDistrict}, {selectedLocation.authorizedState}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <div><strong>Full Address:</strong> {selectedLocation.formattedAddress || 'N/A'}</div>
                {selectedLocation.verificationReason && (
                  <div style={{ marginTop: '6px', color: '#b45309' }}>
                    <strong>Verification Note:</strong> {selectedLocation.verificationReason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.latitude},${selectedLocation.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <ExternalLink size={14} /> Open in Google Maps
                </a>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="btn btn-primary"
                  style={{ fontSize: '13px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Review / Override Modal */}
      {isReviewModalOpen && selectedLocation && (
        <div className="modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ede9fe', color: '#6d28d9', padding: '8px', borderRadius: '8px' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Super Admin Location Override
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ID: {selectedLocation.locationVerificationId}
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsReviewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdminReviewSubmit} className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px', color: '#92400e' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> Flagged Reason:
                </div>
                <div>{selectedLocation.verificationReason || 'Territory boundary mismatch or low accuracy.'}</div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                  Select Administrative Action
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${reviewAction === 'APPROVE' ? '#15803d' : 'var(--border-color)'}`,
                      background: reviewAction === 'APPROVE' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: reviewAction === 'APPROVE' ? '#15803d' : 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="reviewAction"
                      value="APPROVE"
                      checked={reviewAction === 'APPROVE'}
                      onChange={() => setReviewAction('APPROVE')}
                    />
                    <span>Approve (Override)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${reviewAction === 'REJECT' ? '#b91c1c' : 'var(--border-color)'}`,
                      background: reviewAction === 'REJECT' ? '#fef2f2' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: reviewAction === 'REJECT' ? '#b91c1c' : 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="reviewAction"
                      value="REJECT"
                      checked={reviewAction === 'REJECT'}
                      onChange={() => setReviewAction('REJECT')}
                    />
                    <span>Reject Verification</span>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                  Mandatory Audit Reasoning / Justification *
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="E.g. Customer property falls on boundary line verified via electricity bill and authorized by Regional Director."
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  This reason will be permanently recorded in the immutable audit log with your Super Admin user ID and timestamp.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting || !reviewReason.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', background: reviewAction === 'APPROVE' ? '#15803d' : '#b91c1c' }}
                >
                  {reviewSubmitting ? 'Saving Review...' : `Confirm ${reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {isAuditModalOpen && selectedLocation && (
        <div className="modal-backdrop" onClick={() => setIsAuditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ede9fe', color: '#6d28d9', padding: '8px', borderRadius: '8px' }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                    Immutable Audit Trail
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ID: {selectedLocation.locationVerificationId}
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAuditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(selectedLocation.auditHistory || []).map((audit, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      borderLeft: `4px solid ${audit.action === 'APPROVE' ? '#15803d' : '#b91c1c'}`,
                      borderRadius: '6px',
                      padding: '12px 14px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: audit.action === 'APPROVE' ? '#15803d' : '#b91c1c' }}>
                        Action: {audit.action} ({audit.previousStatus} → {audit.newStatus})
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(audit.reviewedAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <strong>Reason:</strong> {audit.reviewReason}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Reviewed By User ID: {audit.reviewedBy}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="btn btn-primary"
                  style={{ fontSize: '13px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationReviewPage;
