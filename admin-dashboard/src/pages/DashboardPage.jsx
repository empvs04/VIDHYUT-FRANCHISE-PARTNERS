import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const DashboardPage = () => {
  const { isSuperAdmin, partner: authPartner } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [recentPartners, setRecentPartners] = useState([]);
  const [stateDistribution, setStateDistribution] = useState([]);

  // Partner specific state
  const [partnerSummary, setPartnerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { showToast } = useNotification();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
          setPartnerSummary(res.data.data);
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
  if (!isSuperAdmin) {
    const partner = partnerSummary?.partner || authPartner;
    const parent = partnerSummary?.parentPartner;
    const subStats = partnerSummary?.subFranchises;

    return (
      <div>
        {/* Welcome Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Welcome, {partner?.fullName || 'Partner'}!
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Vidhyut Saathi Franchise Operations Portal
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={fetchDashboardData} className="btn btn-outline" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {partner?.franchiseType !== 'SUB_FRANCHISE' && (
              <Link to="/partners/new" className="btn btn-primary">
                <UserPlus size={16} />
                <span>Add Sub-Franchise</span>
              </Link>
            )}
          </div>
        </div>

        {/* Territory Authorization Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: 'white',
            marginBottom: '24px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.8px', marginBottom: '4px' }}>
                AUTHORIZED FRANCHISE TERRITORY
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#38BDF8' }}>
                {partner?.district ? `${partner.district}, ${partner.state}` : partner?.state || 'Territory Assigned'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {partner?.franchiseType?.replace('_', ' ')}
                </span>
                <StatusBadge status={partner?.accountStatus || 'ACTIVE'} />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>PARTNER ID</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>
                  {partner?.franchiseId}
                </span>
                <button
                  onClick={() => handleCopyId(partner?.franchiseId)}
                  style={{
                    background: copied ? '#16A34A' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real DB Sub-Franchise Statistics */}
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Sub-Franchises"
            value={subStats?.total ?? 0}
            icon={Building2}
            bgLight="#e0f2fe"
            iconColor="#0284c7"
          />
          <StatCard
            title="Active Sub-Franchises"
            value={subStats?.active ?? 0}
            icon={UserCheck}
            bgLight="#dcfce7"
            iconColor="#16a34a"
          />
          <StatCard
            title="Inactive / Pending"
            value={subStats?.inactive ?? 0}
            icon={UserX}
            bgLight="#fee2e2"
            iconColor="#dc2626"
          />
          {parent && (
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>PARENT PARTNER</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {parent.fullName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {parent.franchiseId}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Future Modules Section - Labeled 'Coming in Next Phase' */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
            Upcoming Operations Pipeline
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
                <CreditCard size={18} />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Card Inventory</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>Batch allocations & stock tracking</p>
              <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
            </div>

            <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
                <Wrench size={18} />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Customer Installations</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>GPS tagging & electricity bill sync</p>
              <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
            </div>

            <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
                <BarChart3 size={18} />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Revenue & Commission</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>Real-time earnings & settlement</p>
              <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Super Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div>
      {/* Page Title & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Super Admin Dashboard
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Live network metrics & territory allocation overview
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDashboardData} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/partners/new" className="btn btn-primary">
            <UserPlus size={16} />
            <span>Add Franchise Partner</span>
          </Link>
        </div>
      </div>

      {/* Real DB Stat Cards Grid */}
      <div className="stat-grid">
        <StatCard
          title="Total Franchise Partners"
          value={metrics?.totalPartners ?? 0}
          icon={Users}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
        />
        <StatCard
          title="Active Partners"
          value={metrics?.activePartners ?? 0}
          icon={UserCheck}
          bgLight="#dcfce7"
          iconColor="#16a34a"
        />
        <StatCard
          title="Inactive / Suspended"
          value={(metrics?.inactivePartners || 0) + (metrics?.suspendedPartners || 0)}
          icon={UserX}
          bgLight="#fee2e2"
          iconColor="#dc2626"
        />
        <StatCard
          title="State Franchises"
          value={metrics?.stateFranchises ?? 0}
          icon={Building}
          bgLight="#fef3c7"
          iconColor="#d97706"
        />
        <StatCard
          title="District Franchises"
          value={metrics?.districtFranchises ?? 0}
          icon={MapPin}
          bgLight="#e0e7ff"
          iconColor="#4f46e5"
        />
        <StatCard
          title="Sub-Franchises"
          value={metrics?.subFranchises ?? 0}
          icon={Building2}
          bgLight="#faf5ff"
          iconColor="#9333ea"
        />
      </div>

      {/* State-wise Coverage Overview */}
      {stateDistribution.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>State Territory Coverage</h2>
            <Link to="/territories" className="btn btn-outline btn-sm" style={{ fontSize: '12px' }}>
              <span>View Coverage Map</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {stateDistribution.map((item) => (
              <div
                key={item.state}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {item.state}
                </div>
                <span
                  style={{
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
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

      {/* Recent Registrations Table */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Recently Registered Franchise Partners
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Latest partners onboarded onto the network from MongoDB Atlas
            </p>
          </div>
          <Link to="/partners" className="btn btn-outline btn-sm" style={{ fontSize: '12px' }}>
            <span>View All Partners</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Franchise ID</th>
                <th>Full Name</th>
                <th>Franchise Type</th>
                <th>State & District</th>
                <th>Parent Partner</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading
                      ? 'Fetching partner records from Atlas...'
                      : 'No franchise partners registered yet. Click "+ Add Franchise Partner" to create your first partner.'}
                  </td>
                </tr>
              ) : (
                recentPartners.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{p.franchiseId}</td>
                    <td style={{ fontWeight: '600' }}>{p.fullName}</td>
                    <td>
                      <FranchiseTypeBadge type={p.franchiseType} />
                    </td>
                    <td>
                      {p.district}, {p.state}
                    </td>
                    <td>
                      {p.parentPartnerId ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.parentPartnerId.fullName} ({p.parentPartnerId.franchiseId})
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Direct Super Admin</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={p.accountStatus} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/partners/${p._id}`} className="btn btn-outline btn-sm">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
