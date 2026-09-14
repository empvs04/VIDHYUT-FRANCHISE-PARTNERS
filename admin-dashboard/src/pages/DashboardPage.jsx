import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Building,
  MapPin,
  UserPlus,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  Building2,
  Clock,
  CheckCircle2,
  CreditCard,
  Wrench,
  BarChart3,
  Copy,
  Check,
  Send,
  FileText,
  AlertTriangle,
  Layers,
  DollarSign,
  ArrowRight,
  Zap,
  Sparkles,
  Award,
  X,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import CardAllotmentCelebrationModal from '../components/common/CardAllotmentCelebrationModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, partner: authPartner } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [recentPartners, setRecentPartners] = useState([]);
  const [stateDistribution, setStateDistribution] = useState([]);

  // Partner specific state
  const [partnerSummary, setPartnerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [dismissedBannerIds, setDismissedBannerIds] = useState(() => {
    try {
      const saved = localStorage.getItem('vs_dismissed_allotment_banners');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissBanner = (allotmentId) => {
    if (!allotmentId) return;
    setDismissedBannerIds((prev) => {
      const updated = [...prev, allotmentId];
      try {
        localStorage.setItem('vs_dismissed_allotment_banners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Transaction & Inventory Stats
  const [txnStats, setTxnStats] = useState({
    totalTransactions: 0,
    pending: 0,
    confirmed: 0,
    disputed: 0,
    totalCardsTransferred: 0,
    totalSalesValue: 0,
  });
  const [cardStats, setCardStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    transferred: 0,
    installed: 0,
    blocked: 0,
  });

  const { showToast } = useNotification();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [txnRes, cardRes] = await Promise.all([
        api.get('/transactions/stats/summary').catch(() => ({ data: { data: null } })),
        api.get('/cards/stats').catch(() => ({ data: { data: null } })),
      ]);

      if (txnRes.data?.data) {
        setTxnStats(txnRes.data.data);
      }
      if (cardRes.data?.data) {
        setCardStats(cardRes.data.data);
      }

      if (isSuperAdmin) {
        const res = await api.get('/dashboard/admin-metrics');
        if (res.data?.data) {
          setMetrics(res.data.data.overview);
          setRecentPartners(res.data.data.recentPartners || []);
          setStateDistribution(res.data.data.stateDistribution || []);
        }
      } else {
        const res = await api.get('/dashboard/partner-summary');
        if (res.data?.data) {
          const summary = res.data.data;
          setPartnerSummary(summary);

          // Check if there is a new unacknowledged card allotment
          if (summary?.latestAllotment?.allotmentId) {
            const isAck = localStorage.getItem(`vs_allotment_ack_${summary.latestAllotment.allotmentId}`);
            if (!isAck) {
              setTimeout(() => {
                setShowCelebrationModal(true);
              }, 450);
            }
          }
        }
      }
    } catch {
      showToast('Failed to load dashboard metrics from MongoDB Atlas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isSuperAdmin]);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    showToast(`Franchise ID "${id}" copied!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // RENDER: Franchise Partner Dashboard
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // RENDER: Franchise Partner Dashboard (District & Sub-Franchise)
  // -------------------------------------------------------------
  if (!isSuperAdmin) {
    const partner = partnerSummary?.partner || authPartner;
    const parent = partnerSummary?.parentPartner;
    const subStats = partnerSummary?.subFranchises;
    const isSub = partner?.franchiseType === 'SUB_FRANCHISE';
    const subPerformance = partnerSummary?.subFranchises?.performance || [];
    const custMetrics = partnerSummary?.customers;

    return (
      <div>
        {/* Welcome Header */}
        <div className="page-header-wrap">
          <div className="page-header-left">
            <div className="page-header-icon-box">
              <BarChart3 size={20} />
            </div>
            <div className="page-header-text">
              <h1 className="page-title">
                Welcome, {partner?.fullName || 'Partner'}!
              </h1>
              <p className="page-subtitle">
                {isSub ? 'Sub-Franchise Field Operations & Customer Portal' : 'Vidhyut Saathi Franchise Operations Portal'}
              </p>
            </div>
          </div>

          <div className="page-header-actions">
            <button onClick={fetchDashboardData} className="btn btn-outline" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link to="/customers/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} />
              <span>Install Card</span>
            </Link>
            {!isSub && (
              <Link to="/transactions/new" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={16} />
                <span>Distribute Stock</span>
              </Link>
            )}
          </div>
        </div>



        {/* Celebratory Card Allotment Banner (When new stock has been assigned) */}
        {partnerSummary?.latestAllotment && !dismissedBannerIds.includes(partnerSummary.latestAllotment.allotmentId) && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(16, 185, 129, 0.12) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.08)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>🎉 New Stock Allotted: +{partnerSummary.latestAllotment.cardCount} Smart Energy Cards</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                    }}
                  >
                    READY TO USE
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.4' }}>
                  Range: <strong style={{ color: '#0284C7', fontFamily: 'monospace' }}>{partnerSummary.latestAllotment.firstSerial} ➔ {partnerSummary.latestAllotment.lastSerial}</strong> • Allocated by {partnerSummary.latestAllotment.assignedBy}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCelebrationModal(true)}
                className="btn btn-outline"
                style={{
                  fontSize: '12.5px',
                  height: '36px',
                  borderColor: 'rgba(245, 158, 11, 0.5)',
                  color: '#D97706',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                }}
              >
                <Award size={15} color="#D97706" />
                <span>View Allotment Certificate</span>
              </button>
              <Link
                to={isSub ? '/customers/new' : '/cards/distribute'}
                className="btn btn-primary"
                style={{ fontSize: '12.5px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Zap size={14} />
                <span>{isSub ? 'Install Cards' : 'Distribute Stock'}</span>
              </Link>
              <button
                type="button"
                onClick={() => handleDismissBanner(partnerSummary.latestAllotment.allotmentId)}
                title="Dismiss Banner"
                aria-label="Dismiss Banner"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  background: '#FFFFFF',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}

        {/* Territory Authorization Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            marginBottom: '20px',
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid #334155',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.8px', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={12} color="#38bdf8" />
                <span>{isSub ? 'AUTHORIZED SUB-FRANCHISE TERRITORY' : 'AUTHORIZED FRANCHISE TERRITORY'}</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', lineHeight: '1.25' }}>
                {partner?.district ? `${partner.district}, ${partner.state}` : partner?.state || 'Territory Assigned'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#f8fafc',
                  }}
                >
                  {isSub ? 'Sub-Franchise Partner' : partner?.franchiseType?.replace('_', ' ')}
                </span>
                <StatusBadge status={partner?.accountStatus || 'ACTIVE'} />
                {parent && isSub && (
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Parent: <strong style={{ color: '#f1f5f9' }}>{parent.fullName} ({parent.franchiseId})</strong>
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PARTNER ID
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', fontFamily: 'monospace', marginTop: '2px' }}>
                  {partner?.franchiseId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyId(partner?.franchiseId)}
                style={{
                  background: copied ? '#16a34a' : 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  transition: 'all 0.15s ease',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Real Database Stat Cards */}
        {isSub ? (
          // Sub-Franchise Real Metrics
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <StatCard
              title="Total Cards"
              value={custMetrics?.totalCardsAllotted ?? ((custMetrics?.installedCardsCount || 0) + (custMetrics?.currentCardInventory || 0)) ?? cardStats.total ?? 0}
              icon={CreditCard}
              bgLight="#e0f2fe"
              iconColor="#0284c7"
              borderLeftColor="#0284c7"
              onClick={() => navigate('/cards')}
              subtitle="Total stock received →"
            />
            <StatCard
              title="My Customers"
              value={custMetrics?.totalCustomers ?? 0}
              icon={Users}
              bgLight="#dcfce7"
              iconColor="#16a34a"
              borderLeftColor="#16a34a"
              onClick={() => navigate('/customers')}
              subtitle="View customer list →"
            />
            <StatCard
              title="My Installed Cards"
              value={custMetrics?.installedCardsCount ?? 0}
              icon={Zap}
              bgLight="#faf5ff"
              iconColor="#9333ea"
              borderLeftColor="#9333ea"
              onClick={() => navigate('/installations')}
              subtitle="Active units in field →"
            />
            <StatCard
              title="Pending Verification"
              value={custMetrics?.pendingVerifications ?? 0}
              icon={Clock}
              bgLight={(custMetrics?.pendingVerifications || 0) > 0 ? '#fef2f2' : '#f8fafc'}
              iconColor={(custMetrics?.pendingVerifications || 0) > 0 ? '#dc2626' : '#64748b'}
              borderLeftColor={(custMetrics?.pendingVerifications || 0) > 0 ? '#dc2626' : '#94a3b8'}
              onClick={() => navigate('/installations')}
              subtitle={(custMetrics?.pendingVerifications || 0) > 0 ? 'Action required →' : 'All verified ✓'}
            />
          </div>
        ) : (
          // Parent Franchise (District / State) Real Metrics
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <StatCard
              title="My Active Card Stock"
              value={custMetrics?.currentCardInventory ?? cardStats.assigned ?? 0}
              icon={CreditCard}
              bgLight="#e0f2fe"
              iconColor="#0284c7"
              borderLeftColor="#0284c7"
              onClick={() => navigate('/cards')}
              subtitle="View card inventory →"
            />
            <StatCard
              title="Total Customers (Network)"
              value={custMetrics?.totalCustomers ?? 0}
              icon={Users}
              bgLight="#dcfce7"
              iconColor="#16a34a"
              borderLeftColor="#16a34a"
              onClick={() => navigate('/customers')}
              subtitle="View customer base →"
            />
            <StatCard
              title="Total Installations"
              value={custMetrics?.totalInstallations ?? 0}
              icon={Wrench}
              bgLight="#e0e7ff"
              iconColor="#4f46e5"
              borderLeftColor="#4f46e5"
              onClick={() => navigate('/installations')}
              subtitle="Installation logs →"
            />
            <StatCard
              title="Sub-Franchise Network"
              value={subStats?.total ?? 0}
              icon={Building2}
              bgLight="#faf5ff"
              iconColor="#9333ea"
              borderLeftColor="#9333ea"
              onClick={() => navigate('/partners')}
              subtitle={`${subStats?.active ?? 0} Active Partners →`}
            />
          </div>
        )}

        {/* SUB-FRANCHISE PERFORMANCE TABLE (FOR PARENT DISTRICT/STATE FRANCHISE) */}
        {!isSub && subPerformance.length > 0 && (
          <div className="card" style={{ marginBottom: '24px', padding: '0', overflow: 'hidden', borderRadius: '14px' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  Sub-Franchise Performance Overview
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Live aggregated customer additions, installations, and inventory across your authorized Sub-Franchise partners.
                </p>
              </div>
              <Link to="/partners" className="btn btn-outline btn-sm" style={{ fontSize: '12.5px' }}>
                <span>View Full Network</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PARTNER NAME & ID</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>TERRITORY</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>CUSTOMERS ADDED</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>INSTALLATIONS</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>CARDS INSTALLED</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>AVAILABLE STOCK</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>STATUS</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {subPerformance.map((sub) => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0F172A', whiteSpace: 'nowrap' }}>{sub.fullName}</div>
                        <div style={{ fontSize: '11.5px', color: '#0284C7', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap' }}>{sub.franchiseId}</div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: '600', color: '#0369A1', background: '#F0F9FF', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          <MapPin size={13} color="#0284C7" style={{ flexShrink: 0 }} />
                          <span>{sub.district || sub.city || sub.state}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: '#0284C7' }}>{sub.customersAdded}</span>
                          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>Customers</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: '#16A34A' }}>{sub.installationsCount}</span>
                          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>Completed</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: '#7E22CE' }}>{sub.cardsInstalled}</span>
                          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>Units</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: '#D97706' }}>{sub.currentInventory}</span>
                          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>Cards</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={sub.accountStatus || 'ACTIVE'} />
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Link to={`/partners/${sub._id}`} className="btn btn-outline btn-sm" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {subPerformance.map((sub) => (
                <div
                  key={sub._id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #7e22ce',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{sub.fullName}</div>
                      <div style={{ fontSize: '11.5px', color: '#0284c7', fontFamily: 'monospace', fontWeight: 700 }}>{sub.franchiseId}</div>
                    </div>
                    <StatusBadge status={sub.accountStatus || 'ACTIVE'} />
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#0284c7" />
                    <span>{sub.district || sub.city || sub.state}</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                    }}
                  >
                    <div>Customers: <strong style={{ color: '#0284c7' }}>{sub.customersAdded}</strong></div>
                    <div>Completed: <strong style={{ color: '#16a34a' }}>{sub.installationsCount}</strong></div>
                    <div>Installed: <strong style={{ color: '#7e22ce' }}>{sub.cardsInstalled}</strong></div>
                    <div>Stock: <strong style={{ color: '#d97706' }}>{sub.currentInventory}</strong></div>
                  </div>
                  <Link to={`/partners/${sub._id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', height: '34px', fontSize: '12px' }}>
                    View Profile →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Operations Modules */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-primary)' }}>
            Franchise Operations & Field Workflows
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <Link
              to="/customers/new"
              style={{
                textDecoration: 'none',
                padding: '18px',
                borderRadius: '8px',
                border: '1.5px solid #BBF7D0',
                backgroundColor: '#F0FDF4',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D' }}>
                  <UserPlus size={20} />
                  <span style={{ fontWeight: '800', fontSize: '14px', color: '#166534' }}>Install Card to Customer</span>
                </div>
                <ArrowRight size={16} color="#15803D" />
              </div>
              <p style={{ fontSize: '12.5px', color: '#166534', margin: 0 }}>
                Onboard new customer with GPS location tagging, MCB/bill photo evidence, and OTP confirmation.
              </p>
            </Link>

            <Link
              to="/cards"
              style={{
                textDecoration: 'none',
                padding: '18px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#FFFFFF',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7' }}>
                  <CreditCard size={20} />
                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>My Card Stock</span>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                View assigned serial numbers, status, and eligible inventory.
              </p>
            </Link>



            {!isSub && (
              <Link
                to="/transactions/new"
                style={{
                  textDecoration: 'none',
                  padding: '18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  display: 'block',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7E22CE' }}>
                    <Send size={20} />
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>Distribute Cards</span>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                  Transfer or sell card inventory downline to authorized sub-franchises.
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Celebratory Allotment Popup Modal */}
        <CardAllotmentCelebrationModal
          isOpen={showCelebrationModal}
          onClose={() => setShowCelebrationModal(false)}
          allotmentData={partnerSummary?.latestAllotment}
          partner={partner}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Super Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div className="page-container">
      {/* Page Title & Actions */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <BarChart3 size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              Super Admin Dashboard
            </h1>
            <p className="page-subtitle">
              Live network metrics, inventory movements & territory distribution overview
            </p>
          </div>
        </div>

        <div className="page-header-actions-grid">
          <button onClick={fetchDashboardData} className="btn btn-secondary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/transactions/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={15} />
            <span>Distribute Cards</span>
          </Link>
          <Link to="/partners/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={15} />
            <span>Add Partner</span>
          </Link>
        </div>
      </div>

      {/* PENDING TRANSACTIONS BANNER FOR SUPER ADMIN IF ANY */}
      {txnStats.pending > 0 && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={17} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', color: '#92400e', fontWeight: '800' }}>
                {txnStats.pending} Consignment(s) Awaiting Confirmation
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '1px' }}>
                Transferred card batches waiting for receiver partners to confirm receipt.
              </div>
            </div>
          </div>
          <Link
            to="/transactions?tab=PENDING"
            className="btn btn-sm"
            style={{
              background: '#f59e0b',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              padding: '6px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Manage Consignments</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Real DB Stat Cards Grid */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Franchise Partners"
          value={(metrics?.stateFranchises || 0) + (metrics?.districtFranchises || 0)}
          icon={Building2}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          borderLeftColor="#0284c7"
          onClick={() => navigate('/partners')}
          subtitle={`${metrics?.stateFranchises || 0} State • ${metrics?.districtFranchises || 0} District →`}
        />
        <StatCard
          title="Sub-Franchise Partners"
          value={metrics?.subFranchises ?? 0}
          icon={Users}
          bgLight="#faf5ff"
          iconColor="#9333ea"
          borderLeftColor="#9333ea"
          onClick={() => navigate('/sub-franchises')}
          subtitle={`${metrics?.activeSubFranchises || 0} Active Partners →`}
        />
        <StatCard
          title="Total Installed Cards"
          value={metrics?.installedCardsCount ?? 0}
          icon={Wrench}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderLeftColor="#16a34a"
          onClick={() => navigate('/installations')}
          subtitle={`${metrics?.subFranchiseCardsInstalledCount || 0} by Sub-Franchises →`}
        />
        <StatCard
          title="Consignment Value"
          value={`₹${(txnStats.totalSalesValue || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderLeftColor="#d97706"
          onClick={() => navigate('/transactions')}
          subtitle="Transaction ledger →"
        />
      </div>

      {/* Sub-Franchise Network Summary Card */}
      <div
        className="card"
        style={{
          padding: '16px 18px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #7e22ce',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14.5px', color: '#0f172a' }}>
              Sub-Franchise Network: <span style={{ color: '#7e22ce' }}>{metrics?.subFranchises || 0} Registered</span>
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', marginLeft: '6px', background: '#dcfce7', padding: '1px 7px', borderRadius: '10px' }}>
                {metrics?.activeSubFranchises || 0} Active
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
              {metrics?.subFranchiseCustomersCount || 0} customers onboarded • {metrics?.subFranchiseInstallationsCount || 0} installations executed downline.
            </div>
          </div>
        </div>
        <Link to="/sub-franchises" className="btn btn-secondary" style={{ fontSize: '12.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>View Sub-Franchise Registry</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* State-wise Coverage Overview */}
      {stateDistribution.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={17} color="#0284c7" />
              <h2 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                State Territory Coverage ({stateDistribution.length} States)
              </h2>
            </div>
            <Link to="/territories" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px', height: '32px' }}>
              <span>View Coverage Map</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {stateDistribution.map((item) => (
              <div
                key={item.state}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#1e293b' }}>
                  {item.state}
                </div>
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    fontWeight: '700',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {item.totalPartners} Partners ({item.districtsCoveredCount} Districts)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Registrations Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={17} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Recently Registered Franchise Partners
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                Latest partners onboarded onto the network from MongoDB Atlas
              </p>
            </div>
          </div>
          <Link to="/partners" className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 12px', height: '32px' }}>
            <span>View All Partners</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>Franchise ID</th>
                <th style={{ padding: '12px 16px' }}>Full Name</th>
                <th style={{ padding: '12px 16px' }}>Franchise Type</th>
                <th style={{ padding: '12px 16px' }}>State & District</th>
                <th style={{ padding: '12px 16px' }}>Parent Partner</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {loading
                      ? 'Fetching partner records from Atlas...'
                      : 'No franchise partners registered yet. Click "+ Add Franchise Partner" to create your first partner.'}
                  </td>
                </tr>
              ) : (
                recentPartners.map((p) => {
                  const isSub = p.franchiseType === 'SUB_FRANCHISE';
                  return (
                    <tr
                      key={p._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px',
                        backgroundColor: isSub ? 'rgba(250, 245, 255, 0.65)' : 'rgba(240, 249, 255, 0.65)',
                        borderLeft: isSub ? '4px solid #9333ea' : '4px solid #0284c7',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: '700', fontFamily: 'monospace', color: isSub ? '#9333ea' : '#0284c7' }}>
                        {p.franchiseId}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{p.fullName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <FranchiseTypeBadge type={p.franchiseType} />
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {p.district}, {p.state}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.parentPartnerId ? (
                          <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                            {p.parentPartnerId.fullName} <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>({p.parentPartnerId.franchiseId})</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>Direct Super Admin</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={p.accountStatus} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link
                          to={`/partners/${p._id}`}
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            borderColor: isSub ? '#D8B4FE' : '#BAE6FD',
                            color: isSub ? '#7E22CE' : '#0369A1',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Lucrative Mobile Cards View */}
        <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {recentPartners.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {loading ? 'Fetching records...' : 'No franchise partners registered yet.'}
            </div>
          ) : (
            recentPartners.map((p) => {
              const isSub = p.franchiseType === 'SUB_FRANCHISE';
              return (
                <div
                  key={p._id}
                  style={{
                    background: isSub ? '#FAF5FF' : '#F0F9FF',
                    border: `1px solid ${isSub ? '#E9D5FF' : '#BAE6FD'}`,
                    borderLeft: `4px solid ${isSub ? '#9333ea' : '#0284c7'}`,
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Header: Name, ID, Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{p.fullName}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isSub ? '#9333ea' : '#0284c7', fontFamily: 'monospace', marginTop: '2px' }}>
                        {p.franchiseId}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FranchiseTypeBadge type={p.franchiseType} />
                      <StatusBadge status={p.accountStatus} />
                    </div>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      background: '#ffffff',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      fontSize: '11.5px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} color="#64748b" /> Territory
                      </div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {p.district || 'N/A'}, {p.state}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={11} color="#64748b" /> Parent Partner
                      </div>
                      <div style={{ fontWeight: 600, color: '#0369a1' }}>
                        {p.parentPartnerId ? `${p.parentPartnerId.fullName}` : 'Direct HQ'}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/partners/${p._id}`}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', height: '36px', fontSize: '12.5px', fontWeight: 700 }}
                  >
                    <span>View Partner Profile</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
