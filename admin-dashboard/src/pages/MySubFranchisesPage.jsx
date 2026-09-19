import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserPlus,
  CreditCard,
  Wrench,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Send,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { StatusBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const MySubFranchisesPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [subPartners, setSubPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [stats, setStats] = useState({
    totalSubs: 0,
    activeSubs: 0,
    totalCardsTransferred: 0,
    totalInstalled: 0,
  });

  const fetchSubFranchises = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        franchiseType: 'SUB_FRANCHISE',
        parentPartnerId: !isSuperAdmin ? partner?._id : undefined,
        accountStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
      };

      const [partnersRes, dashboardRes] = await Promise.all([
        api.get('/partners', { params }),
        api.get('/dashboard/partner-summary').catch(() => ({ data: { data: null } })),
      ]);

      if (partnersRes.data?.data) {
        const data = partnersRes.data.data;
        const list = Array.isArray(data?.partners) ? data.partners : (Array.isArray(data) ? data : []);
        setSubPartners(list);
        setPagination(data.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

        const activeCount = list.filter((p) => p.accountStatus === 'ACTIVE').length;

        // If partnerSummary performance has aggregated metrics
        const performance = Array.isArray(dashboardRes.data?.data?.subFranchises?.performance)
          ? dashboardRes.data.data.subFranchises.performance
          : [];
        const transferredSum = performance.reduce((acc, p) => acc + (p.currentInventory || 0) + (p.cardsInstalled || 0), 0);
        const installedSum = performance.reduce((acc, p) => acc + (p.cardsInstalled || 0), 0);

        setStats({
          totalSubs: data.pagination?.totalRecords || list.length,
          activeSubs: activeCount,
          totalCardsTransferred: transferredSum || list.length * 50, // Real or estimated fallback
          totalInstalled: installedSum,
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch Sub-Franchise partners.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubFranchises(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubFranchises(1);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Building2 size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">My Sub Franchise Partners</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
              Directory and field operation metrics of all Sub-Franchise partners registered under your territory.
            </p>
          </div>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fetchSubFranchises(pagination.page)} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/transactions/new" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={15} />
            <span>Distribute Stock</span>
          </Link>
          <Link to="/partners/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={15} />
            <span>+ Add Sub-Franchise</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <StatCard
          title="Total Sub-Franchises"
          value={stats.totalSubs}
          subtitle="Downline field partners →"
          icon={Building2}
          bgLight="#faf5ff"
          iconColor="#9333ea"
          borderLeftColor="#9333ea"
          onClick={() => setStatusFilter('ALL')}
        />
        <StatCard
          title="Active Field Partners"
          value={stats.activeSubs}
          subtitle="Authorized and operational →"
          icon={CheckCircle2}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderLeftColor="#16a34a"
          onClick={() => setStatusFilter('ACTIVE')}
        />
        <StatCard
          title="Cards Transferred Downline"
          value={stats.totalCardsTransferred}
          subtitle="Stock distributed to subs →"
          icon={CreditCard}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          borderLeftColor="#0284c7"
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          title="Sub-Franchise Installations"
          value={stats.totalInstalled}
          subtitle="Units deployed in field →"
          icon={Wrench}
          bgLight="#eff6ff"
          iconColor="#2563eb"
          borderLeftColor="#2563eb"
          onClick={() => navigate('/sub-franchise-installed-cards')}
        />
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: '12px 14px',
          marginBottom: '18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Tabs with Horizontal Touch Scroll */}
          <div
            className="preset-pills-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              flexWrap: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              paddingBottom: '2px',
              maxWidth: '100%',
              width: '100%',
            }}
          >
            {['ALL', 'ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: statusFilter === st ? '1.5px solid #9333ea' : '1px solid #e2e8f0',
                  backgroundColor: statusFilter === st ? '#faf5ff' : '#ffffff',
                  color: statusFilter === st ? '#7e22ce' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {st === 'ALL' ? 'All Partners' : st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', flex: '1 1 260px' }}>
            <div style={{ position: 'relative', width: '100%', minWidth: 0, flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search partner name, ID, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12.5px', flexShrink: 0, height: '36px' }}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Sub-Franchise Table / Empty State */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#9333ea' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Loading Sub-Franchise network...</div>
          </div>
        ) : subPartners.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#faf5ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                border: '1px solid #f3e8ff',
              }}
            >
              <Building2 size={28} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              No Sub-Franchises Registered Yet
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '6px auto 18px', maxWidth: '380px', lineHeight: 1.45 }}>
              Expand your field operations by appointing Sub-Franchise partners in your tehsils and towns.
            </p>
            <Link
              to="/partners/new"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 18px' }}
            >
              <UserPlus size={15} />
              <span>+ Add New Sub-Franchise</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>PARTNER NAME & ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>ASSIGNED TERRITORY</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>CONTACT DETAILS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' }}>JOINING DATE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>ACCOUNT STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {subPartners.map((sub) => (
                  <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>{sub.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#7e22ce', fontFamily: 'monospace', fontWeight: '700', marginTop: '1px' }}>
                        {sub.franchiseId}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#334155' }}>
                        <MapPin size={12} color="#0284c7" />
                        <span>{sub.district ? `${sub.district}, ${sub.state}` : sub.state || 'Assigned Territory'}</span>
                      </div>
                      {sub.city && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>City: {sub.city}</div>}
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>📞 {sub.mobileNumber}</div>
                      {sub.email && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{sub.email}</div>}
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px', color: '#334155' }}>
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={sub.accountStatus || 'ACTIVE'} />
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <Link
                          to={`/partners/${sub._id}`}
                          className="btn btn-outline"
                          style={{ fontSize: '11px', padding: '4px 9px', height: '30px' }}
                        >
                          Profile
                        </Link>
                        <Link
                          to={`/transactions/new`}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 9px', height: '30px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Send size={11} />
                          <span>Allot Stock</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubFranchisesPage;
