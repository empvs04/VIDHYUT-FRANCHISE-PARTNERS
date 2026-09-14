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
  const [recentMismatches, setRecentMismatches] = useState([]);

  // Modal States
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBreachModalOpen, setIsBreachModalOpen] = useState(false);
  const [breachAlertData, setBreachAlertData] = useState(null);

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

      let mismatches = [];
      if (listRes.data?.data) {
        setVerifications(listRes.data.data.verifications || []);
        setPagination(listRes.data.data.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
        if (listRes.data.data.recentMismatches?.length > 0) {
          mismatches = listRes.data.data.recentMismatches;
          setRecentMismatches(mismatches);
        }
      }

      if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
        if (statsRes.data.data.recentMismatches?.length > 0) {
          mismatches = statsRes.data.data.recentMismatches;
          setRecentMismatches(mismatches);
        }
      }

      // Check if we should trigger popup alert for latest unacknowledged breach
      if (mismatches.length > 0) {
        const latestBreach = mismatches[0];
        const dismissedKey = `dismissed_breach_${latestBreach.locationVerificationId || latestBreach._id}`;
        const isDismissed = sessionStorage.getItem(dismissedKey);
        if (!isDismissed && !isBreachModalOpen) {
          setBreachAlertData(latestBreach);
          setIsBreachModalOpen(true);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load location verification logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBreachModal = (record) => {
    setBreachAlertData(record);
    setIsBreachModalOpen(true);
  };

  const handleDismissBreachModal = () => {
    if (breachAlertData) {
      const dismissedKey = `dismissed_breach_${breachAlertData.locationVerificationId || breachAlertData._id}`;
      sessionStorage.setItem(dismissedKey, 'true');
    }
    setIsBreachModalOpen(false);
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

      {/* Top Geofence Breach Warning Notification Banner */}
      {(stats.mismatch > 0 || recentMismatches.length > 0) && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
            border: '2px solid #f87171',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#dc2626',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.2)',
                animation: 'pulseGlow 2s infinite',
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  🚨 Geofence Breach Alert
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#991b1b' }}>
                  {stats.mismatch} Out-of-Territory Installation Attempt(s) Detected
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#7f1d1d', lineHeight: '1.4' }}>
                {recentMismatches.length > 0 ? (
                  <>
                    <strong>Latest Attempt: </strong>
                    {recentMismatches[0].partnerId?.franchiseType === 'SUB_FRANCHISE' || recentMismatches[0].parentPartnerId ? (
                      <span>
                        Sub-Partner <strong>{recentMismatches[0].partnerId?.fullName}</strong> (Parent:{' '}
                        <strong>
                          {recentMismatches[0].partnerId?.parentPartnerId?.fullName ||
                            recentMismatches[0].parentPartnerId?.fullName ||
                            'Parent Partner'}
                        </strong>
                        ) in <strong>{recentMismatches[0].district}, {recentMismatches[0].state}</strong> (Authorized:{' '}
                        <strong>{recentMismatches[0].authorizedDistrict}, {recentMismatches[0].authorizedState}</strong>)
                      </span>
                    ) : (
                      <span>
                        Partner <strong>{recentMismatches[0].partnerId?.fullName}</strong> in{' '}
                        <strong>{recentMismatches[0].district}, {recentMismatches[0].state}</strong> (Authorized:{' '}
                        <strong>{recentMismatches[0].authorizedDistrict}, {recentMismatches[0].authorizedState}</strong>)
                      </span>
                    )}
                  </>
                ) : (
                  'GPS Tracker flagged unauthorized installation coordinates outside authorized territory boundary.'
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {recentMismatches.length > 0 && (
              <button
                onClick={() => handleOpenBreachModal(recentMismatches[0])}
                className="btn btn-primary"
                style={{
                  background: '#dc2626',
                  borderColor: '#b91c1c',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                }}
              >
                🚨 Inspect Breach Popup
              </button>
            )}
            <button
              onClick={() => {
                setAccuracyFilter('');
                setStatusFilter('TERRITORY_MISMATCH');
              }}
              className="btn btn-outline"
              style={{
                borderColor: '#f87171',
                color: '#991b1b',
                background: '#fff',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Filter Violations ({stats.mismatch})
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row (Interactive Clickable Filters) */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
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
          borderLeftColor={stats.mismatch > 0 ? '#dc2626' : undefined}
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
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} className="filter-bar-grid">
          <div className="filter-search-full">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by ID, partner, parent, city, district..."
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
                <option value="TERRITORY_MISMATCH">Territory Mismatch (Breach)</option>
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
                {verifications.map((item) => {
                  const isSubPartner = item.partnerId?.franchiseType === 'SUB_FRANCHISE' || Boolean(item.parentPartnerId) || Boolean(item.partnerId?.parentPartnerId);
                  const parentPartnerObj = item.partnerId?.parentPartnerId || item.parentPartnerId;
                  const isMismatch = !item.territoryMatch || item.verificationStatus === 'TERRITORY_MISMATCH';

                  return (
                    <tr
                      key={item._id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isMismatch ? '#fff5f5' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '13.5px' }}>
                          {item.locationVerificationId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <Clock size={11} /> {new Date(item.gpsCapturedAt || item.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {item.partnerId?.fullName || 'Franchise Partner'}
                          </span>
                          {isSubPartner && (
                            <span
                              style={{
                                background: '#f3e8ff',
                                color: '#7e22ce',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              SUB-FRANCHISE
                            </span>
                          )}
                        </div>

                        {isSubPartner && parentPartnerObj && (
                          <div style={{ fontSize: '11px', color: '#6b21a8', marginTop: '2px', fontWeight: 600 }}>
                            👤 Parent: {parentPartnerObj.fullName} ({parentPartnerObj.franchiseId})
                          </div>
                        )}

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
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: item.territoryMatch ? '#15803d' : '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {!item.territoryMatch && <AlertTriangle size={13} />}
                          <span>{item.district ? `${item.district}, ${item.state}` : item.formattedAddress?.slice(0, 35) || 'India'}</span>
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
                          {isMismatch && (
                            <button
                              onClick={() => handleOpenBreachModal(item)}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                background: '#dc2626',
                                borderColor: '#b91c1c',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Inspect Cross-Border Breach Details"
                            >
                              <AlertTriangle size={13} />
                              <span>Breach</span>
                            </button>
                          )}

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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {verifications.map((item) => {
              const isSubPartner = item.partnerId?.franchiseType === 'SUB_FRANCHISE' || Boolean(item.parentPartnerId) || Boolean(item.partnerId?.parentPartnerId);
              const parentPartnerObj = item.partnerId?.parentPartnerId || item.parentPartnerId;
              const isMismatch = !item.territoryMatch || item.verificationStatus === 'TERRITORY_MISMATCH';

              return (
                <div
                  key={item._id}
                  className="mobile-card-item"
                  style={{
                    border: isMismatch ? '1.5px solid #f87171' : '1px solid var(--border-color)',
                    backgroundColor: isMismatch ? '#fff8f8' : 'var(--bg-card)',
                  }}
                >
                  <div className="mobile-card-header">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.locationVerificationId}
                    </span>
                    <div>{renderStatusBadge(item.verificationStatus)}</div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {item.partnerId?.fullName || 'Partner'}
                      </h4>
                      {isSubPartner && (
                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                          SUB-FRANCHISE
                        </span>
                      )}
                    </div>

                    {isSubPartner && parentPartnerObj && (
                      <div style={{ fontSize: '11.5px', color: '#6b21a8', marginTop: '2px', fontWeight: 600 }}>
                        👤 Parent: {parentPartnerObj.fullName} ({parentPartnerObj.franchiseId})
                      </div>
                    )}

                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Auth Territory: <strong style={{ color: '#0369a1' }}>{item.authorizedDistrict}, {item.authorizedState}</strong>
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
                      <div style={{ marginTop: '4px', color: isMismatch ? '#b91c1c' : '#b45309', fontWeight: 600 }}>
                        ⚠️ {item.verificationReason}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {isMismatch && (
                      <button
                        onClick={() => handleOpenBreachModal(item)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '12.5px', background: '#dc2626', borderColor: '#b91c1c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <AlertTriangle size={14} /> Breach Popup
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenMap(item)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '8px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Navigation size={14} /> View Map
                    </button>

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
              );
            })}
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

      {/* 🚨 GEOFENCE BREACH POP-UP ALERT MODAL */}
      {isBreachModalOpen && breachAlertData && (
        <div className="modal-backdrop" onClick={handleDismissBreachModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '92%',
              border: '2px solid #ef4444',
              boxShadow: '0 20px 45px rgba(220, 38, 38, 0.25)',
              borderRadius: '16px',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                color: '#fff',
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={24} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
                    🚨 Out-of-Territory Installation Alert
                  </h3>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                    ID: {breachAlertData.locationVerificationId} • Captured:{' '}
                    {new Date(breachAlertData.gpsCapturedAt || breachAlertData.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismissBreachModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Alert Notice Callout */}
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertOctagon size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: '1.45' }}>
                  <strong>Cross-Border / Territory Violation Detected: </strong>
                  {breachAlertData.verificationReason ||
                    'GPS Tracker telemetry detected field coordinates outside the assigned territory boundary.'}
                </div>
              </div>

              {/* Partner & Parent Hierarchy Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    breachAlertData.partnerId?.franchiseType === 'SUB_FRANCHISE' ||
                    breachAlertData.parentPartnerId ||
                    breachAlertData.partnerId?.parentPartnerId
                      ? '1fr 1fr'
                      : '1fr',
                  gap: '12px',
                  marginBottom: '18px',
                }}
              >
                {/* Executing Sub / Franchise Partner Box */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                    }}
                  >
                    Executing Partner
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {breachAlertData.partnerId?.fullName || 'Franchise Partner'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                    ID: {breachAlertData.partnerId?.franchiseId || 'N/A'} (
                    {breachAlertData.partnerId?.franchiseType || 'FRANCHISE'})
                  </div>
                  {breachAlertData.partnerId?.mobileNumber && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      📱 {breachAlertData.partnerId.mobileNumber}
                    </div>
                  )}
                </div>

                {/* Parent Franchise Partner Box (if Sub-Franchise) */}
                {(breachAlertData.partnerId?.franchiseType === 'SUB_FRANCHISE' ||
                  breachAlertData.parentPartnerId ||
                  breachAlertData.partnerId?.parentPartnerId) && (
                  <div
                    style={{
                      background: '#faf5ff',
                      border: '1px solid #e9d5ff',
                      borderRadius: '10px',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#7e22ce',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '6px',
                      }}
                    >
                      👑 Parent Franchise Partner
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#581c87' }}>
                      {breachAlertData.partnerId?.parentPartnerId?.fullName ||
                        breachAlertData.parentPartnerId?.fullName ||
                        'District / State Partner'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 700, marginTop: '2px' }}>
                      ID:{' '}
                      {breachAlertData.partnerId?.parentPartnerId?.franchiseId ||
                        breachAlertData.parentPartnerId?.franchiseId ||
                        'N/A'}
                    </div>
                    {(breachAlertData.partnerId?.parentPartnerId?.mobileNumber ||
                      breachAlertData.parentPartnerId?.mobileNumber) && (
                      <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '3px' }}>
                        📱{' '}
                        {breachAlertData.partnerId?.parentPartnerId?.mobileNumber ||
                          breachAlertData.parentPartnerId?.mobileNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Side-by-Side Location Contrast */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                {/* Authorized Territory (Blue/Green) */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#15803d',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={13} /> Authorized Territory
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                    {breachAlertData.authorizedDistrict}, {breachAlertData.authorizedState}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#15803d', marginTop: '3px' }}>
                    Permitted operational boundary assigned by Vidhyut Saathi.
                  </div>
                </div>

                {/* Detected Target Location (Red) */}
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#b91c1c',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <XCircle size={13} /> Detected GPS Location
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>
                    {breachAlertData.district || 'Unknown'}, {breachAlertData.state || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px' }}>
                    Real GPS Coordinates: {breachAlertData.latitude.toFixed(5)}, {breachAlertData.longitude.toFixed(5)} (±
                    {breachAlertData.accuracyMeters?.toFixed(1)}m)
                  </div>
                </div>
              </div>

              {/* Full Address Details */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <strong>📍 Full Reverse-Geocoded Address: </strong>
                  {breachAlertData.formattedAddress || 'N/A'}
                </div>
                {breachAlertData.customerId && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Customer: </strong> {breachAlertData.customerId.fullName} (
                    {breachAlertData.customerId.mobileNumber})
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedLocation(breachAlertData);
                      setIsMapModalOpen(true);
                      setIsBreachModalOpen(false);
                    }}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <Navigation size={15} /> View Interactive Map
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${breachAlertData.latitude},${breachAlertData.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <ExternalLink size={14} /> Open in Google Maps
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isSuperAdmin && breachAlertData.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => {
                        setSelectedLocation(breachAlertData);
                        setReviewAction('REJECT');
                        setReviewReason('');
                        setIsReviewModalOpen(true);
                        setIsBreachModalOpen(false);
                      }}
                      className="btn btn-primary"
                      style={{ background: '#0284c7', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ShieldCheck size={15} /> Admin Review / Override
                    </button>
                  )}

                  <button
                    onClick={handleDismissBreachModal}
                    className="btn btn-primary"
                    style={{ background: '#dc2626', borderColor: '#b91c1c', fontSize: '13px' }}
                  >
                    Acknowledge & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationReviewPage;

