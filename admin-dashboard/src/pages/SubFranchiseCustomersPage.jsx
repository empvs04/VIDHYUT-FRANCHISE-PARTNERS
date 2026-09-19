import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Home,
  Building,
  Factory,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  CreditCard,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const SubFranchiseCustomersPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [customers, setCustomers] = useState([]);
  const [subPartners, setSubPartners] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('ALL');

  const [stats, setStats] = useState({
    total: 0,
    residential: 0,
    commercial: 0,
    industrial: 0,
    totalCards: 0,
  });

  const fetchSubPartnersList = async () => {
    try {
      const res = await api.get('/partners', {
        params: {
          franchiseType: 'SUB_FRANCHISE',
          parentPartnerId: !isSuperAdmin ? partner?._id : undefined,
          limit: 100,
        },
      });
      setSubPartners(Array.isArray(res.data?.data?.partners) ? res.data.data.partners : []);
    } catch {
      // ignore
    }
  };

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        customerType: customerType !== 'ALL' ? customerType : undefined,
        source: 'SUB_FRANCHISE_CUSTOMERS',
        partnerId: selectedSubId !== 'ALL' ? selectedSubId : (isSuperAdmin ? (partner?._id || undefined) : undefined),
      };

      const res = await api.get('/customers', { params });
      if (res.data?.data) {
        const data = res.data.data;
        const list = Array.isArray(data?.customers) ? data.customers : (Array.isArray(data) ? data : []);
        setCustomers(list);
        setPagination(data.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

        const resCount = list.filter((c) => c.customerType === 'RESIDENTIAL').length;
        const commCount = list.filter((c) => c.customerType === 'COMMERCIAL').length;
        const indCount = list.filter((c) => c.customerType === 'INDUSTRIAL').length;
        const cardsSum = list.reduce((sum, c) => sum + (c.installedCardCount || 0), 0);

        setStats({
          total: data.pagination?.totalRecords || list.length,
          residential: resCount,
          commercial: commCount,
          industrial: indCount,
          totalCards: cardsSum,
        });
      }
    } catch (err) {
      showToast('Failed to load Sub-Franchise customer base.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubPartnersList();
  }, []);

  useEffect(() => {
    fetchCustomers(1);
  }, [customerType, selectedSubId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return { label: 'Residential', bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', icon: <Home size={12} /> };
      case 'COMMERCIAL':
        return { label: 'Commercial', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: <Building size={12} /> };
      case 'INDUSTRIAL':
        return { label: 'Industrial', bg: '#fef3c7', border: '#fde68a', color: '#92400e', icon: <Factory size={12} /> };
      default:
        return { label: type || 'Standard', bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', icon: <Users size={12} /> };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <Users size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">Sub Franchise Customers</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
              Aggregated network of all customer installations and accounts created by your downline Sub-Franchises.
            </p>
          </div>
        </div>

        <div className="page-header-actions page-header-actions-grid">
          <button onClick={() => fetchCustomers(pagination.page)} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/my-customers" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} />
            <span>My Direct Customers</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <StatCard
          title="Total Sub Customers"
          value={stats.total}
          subtitle="Onboarded via sub-franchises →"
          icon={Users}
          bgLight="#faf5ff"
          iconColor="#9333ea"
          borderLeftColor="#9333ea"
          borderColor="#E9D5FF"
          borderHoverColor="#9333ea"
          onClick={() => setCustomerType('ALL')}
        />
        <StatCard
          title="Residential (Homes)"
          value={stats.residential}
          subtitle="Household connections →"
          icon={Home}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderLeftColor="#16a34a"
          borderColor="#A7F3D0"
          borderHoverColor="#16a34a"
          onClick={() => setCustomerType('RESIDENTIAL')}
        />
        <StatCard
          title="Commercial (Business)"
          value={stats.commercial}
          subtitle="Retail, shops & offices →"
          icon={Building}
          bgLight="#eff6ff"
          iconColor="#2563eb"
          borderLeftColor="#2563eb"
          borderColor="#BFDBFE"
          borderHoverColor="#2563eb"
          onClick={() => setCustomerType('COMMERCIAL')}
        />
        <StatCard
          title="Industrial (Heavy Load)"
          value={stats.industrial}
          subtitle="Workshops & industries →"
          icon={Factory}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderLeftColor="#d97706"
          borderColor="#FDE68A"
          borderHoverColor="#d97706"
          onClick={() => setCustomerType('INDUSTRIAL')}
        />
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Category Tabs with Touch Scroll */}
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
            }}
          >
            {[
              { id: 'ALL', label: 'All Customers', icon: Users },
              { id: 'RESIDENTIAL', label: 'Residential', icon: Home },
              { id: 'COMMERCIAL', label: 'Commercial', icon: Building },
              { id: 'INDUSTRIAL', label: 'Industrial', icon: Factory },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = customerType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomerType(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: isActive ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#f0fdf4' : '#ffffff',
                    color: isActive ? '#15803d' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <TabIcon size={14} color={isActive ? '#16a34a' : '#94a3b8'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-Franchise Partner Dropdown Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            {subPartners.length > 0 && (
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  maxWidth: '220px',
                }}
              >
                <option value="ALL">All Sub-Franchises ({subPartners.length})</option>
                {subPartners.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.fullName} ({sub.franchiseId})
                  </option>
                ))}
              </select>
            )}

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search name, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12.5px', flexShrink: 0, height: '36px' }}>
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#9333ea' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Loading Sub-Franchise network customers...</div>
          </div>
        ) : customers.length === 0 ? (
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
              <Users size={28} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              No Sub-Franchise Customers Found
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '6px auto 18px', maxWidth: '380px', lineHeight: 1.45 }}>
              Customers onboarded by your Sub-Franchise partners will automatically show up here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table-only" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="table" style={{ width: '100%', minWidth: '820px', margin: 0, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CUSTOMER NAME & ID</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>SUB-FRANCHISE (ONBOARDER)</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CATEGORY</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CONTACT</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>LOAD (kW)</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'center' }}>CARDS INSTALLED</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const typeBadge = getTypeBadge(c.customerType);
                    const creator = c.createdByPartnerId || {};

                    return (
                      <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>{c.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', fontWeight: '700', marginTop: '1px' }}>
                            {c.customerId}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#7e22ce' }}>
                            {creator.fullName || 'Sub-Franchise'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                            {creator.franchiseId}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: typeBadge.bg,
                              border: `1px solid ${typeBadge.border}`,
                              color: typeBadge.color,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                            }}
                          >
                            {typeBadge.icon}
                            <span>{typeBadge.label}</span>
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>📞 {c.mobileNumber}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            📍 {c.address?.district ? `${c.address.district}, ${c.address.state}` : c.address?.city || ''}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                            {c.electricityDetails?.connectedLoadKw || 0} kW
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {c.electricityDetails?.phase === 'THREE_PHASE' ? '3-Phase' : '1-Phase'}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              backgroundColor: (c.installedCardCount || 0) > 0 ? '#dcfce7' : '#f1f5f9',
                              color: (c.installedCardCount || 0) > 0 ? '#15803d' : '#64748b',
                              border: (c.installedCardCount || 0) > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                            }}
                          >
                            {c.installedCardCount || 0} Cards
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <Link
                            to={`/customers/${c._id}`}
                            className="btn btn-outline"
                            style={{ fontSize: '11px', padding: '4px 9px', height: '30px' }}
                          >
                            Profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Only View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {customers.map((c) => {
                const typeBadge = getTypeBadge(c.customerType);
                const creator = c.createdByPartnerId || {};
                return (
                  <div
                    key={c._id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{c.fullName}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            color: '#0284c7',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            backgroundColor: '#f0f9ff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #bae6fd',
                            marginTop: '2px',
                          }}
                        >
                          {c.customerId}
                        </span>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: typeBadge.bg,
                          border: `1px solid ${typeBadge.border}`,
                          color: typeBadge.color,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}
                      >
                        {typeBadge.icon}
                        <span>{typeBadge.label}</span>
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        backgroundColor: '#f8fafc',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sub-Franchise</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#7e22ce', marginTop: '1px' }}>
                          {creator.fullName || 'Sub-Partner'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Contact</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '1px' }}>📞 {c.mobileNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Connected Load</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', marginTop: '1px' }}>
                          ⚡ {c.electricityDetails?.connectedLoadKw || 0} kW
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Installed Stock</div>
                        <div style={{ marginTop: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '800',
                              backgroundColor: (c.installedCardCount || 0) > 0 ? '#dcfce7' : '#f1f5f9',
                              color: (c.installedCardCount || 0) > 0 ? '#15803d' : '#64748b',
                              border: (c.installedCardCount || 0) > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                            }}
                          >
                            💳 {c.installedCardCount || 0} Cards
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <Link
                        to={`/customers/${c._id}`}
                        className="btn btn-outline"
                        style={{ width: '100%', fontSize: '12px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        View Customer Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total)
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchCustomers(pagination.page - 1)}
                    className="btn btn-outline"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => fetchCustomers(pagination.page + 1)}
                    className="btn btn-outline"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubFranchiseCustomersPage;
