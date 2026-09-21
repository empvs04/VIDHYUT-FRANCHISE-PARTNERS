import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CreditCard,
  Building,
  Home,
  Factory,
  ChevronRight,
  Eye,
  RefreshCw,
  Zap,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [district, setDistrict] = useState('');
  const [districtsList, setDistrictsList] = useState([]);
  const [source, setSource] = useState('ALL'); // 'ALL' | 'MY_CUSTOMERS' | 'SUB_FRANCHISE_CUSTOMERS'

  const isSubFranchise = partner?.franchiseType === 'SUB_FRANCHISE';
  const isParentPartner = !isSuperAdmin && !isSubFranchise;

  // Metrics
  const [stats, setStats] = useState({
    total: 0,
    residential: 0,
    commercial: 0,
    industrial: 0,
    installedCards: 0,
  });

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const currentPartnerId = partner?._id || partner?.id || undefined;
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        customerType: customerType || undefined,
        district: district || undefined,
        source: isParentPartner && source !== 'ALL' ? source : undefined,
        partnerId: isSuperAdmin ? currentPartnerId : undefined,
      };

      const [res, statsRes] = await Promise.all([
        api.get('/customers', { params }),
        api.get('/customers', {
          params: {
            limit: 100,
            district: district || undefined,
            source: isParentPartner && source !== 'ALL' ? source : undefined,
            partnerId: isSuperAdmin ? currentPartnerId : undefined,
          },
        }).catch(() => null),
      ]);

      if (res.data?.data) {
        const data = res.data.data;
        const list = Array.isArray(data?.customers) ? data.customers : (Array.isArray(data) ? data : []);
        setCustomers(list);
        setPagination(data.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });

        // Calculate counts
        const allList = statsRes?.data?.data?.customers || list;
        const resCount = allList.filter((c) => c.customerType === 'RESIDENTIAL').length;
        const commCount = allList.filter((c) => c.customerType === 'COMMERCIAL').length;
        const indCount = allList.filter((c) => c.customerType === 'INDUSTRIAL').length;
        const totalCards = allList.reduce((acc, c) => acc + (c.installedCardCount || 0), 0);

        setStats({
          total: statsRes?.data?.data?.pagination?.totalRecords || allList.length,
          residential: resCount,
          commercial: commCount,
          industrial: indCount,
          installedCards: totalCards,
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [customerType, district, source]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <Home size={12} /> Residential
          </span>
        );
      case 'COMMERCIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <Building size={12} /> Commercial
          </span>
        );
      case 'INDUSTRIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            <Factory size={12} /> Industrial
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <div className="page-body">
      {/* Top Header & Actions */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <Users size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isSuperAdmin
                ? 'Customer Management & Network Installations'
                : isSubFranchise
                ? 'My Registered Customers'
                : 'Customer Management (Direct & Sub-Franchise)'}
            </h1>
            <p className="page-subtitle">
              {isSubFranchise
                ? 'Manage your registered energy consumers and active Vidhyut Saathi card installations in your territory.'
                : 'Manage registered energy consumer accounts, connected electricity loads, and active Vidhyut Saathi card installations.'}
            </p>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="page-header-actions">
            <button
              onClick={() => navigate('/customers/new')}
              className="btn btn-primary"
            >
              <UserPlus size={18} />
              <span>Add Customer / Install Card</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row (Interactive Filters with Top-Border Colors) */}
      <div className="stat-grid">
        <StatCard
          title="Total Registered Customers"
          value={stats.total}
          subtitle={customerType === '' ? '● All Accounts Showing' : 'Click to show all →'}
          icon={Users}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          borderTopColor="#0284c7"
          onClick={() => setCustomerType('')}
          isActive={customerType === ''}
          activeLabel="All"
          loading={loading}
        />

        <StatCard
          title="Installed Energy Cards"
          value={stats.installedCards}
          subtitle="Active in field units →"
          icon={CreditCard}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderTopColor="#16a34a"
          onClick={() => setCustomerType('')}
          loading={loading}
        />

        <StatCard
          title="Residential Consumers"
          value={stats.residential}
          subtitle="Homes & Apartments →"
          icon={Home}
          bgLight="#faf5ff"
          iconColor="#9333ea"
          borderTopColor="#9333ea"
          onClick={() => setCustomerType((prev) => (prev === 'RESIDENTIAL' ? '' : 'RESIDENTIAL'))}
          isActive={customerType === 'RESIDENTIAL'}
          activeLabel="Residential"
          loading={loading}
        />

        <StatCard
          title="Commercial Accounts"
          value={stats.commercial}
          subtitle="Offices & Commercial →"
          icon={Building}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderTopColor="#d97706"
          onClick={() => setCustomerType((prev) => (prev === 'COMMERCIAL' ? '' : 'COMMERCIAL'))}
          isActive={customerType === 'COMMERCIAL'}
          activeLabel="Commercial"
          loading={loading}
        />
      </div>

      {/* Unified Search and Filters Bar */}
      <div
        className="card"
        style={{
          padding: '14px 16px',
          marginBottom: '18px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        }}
      >
        <form onSubmit={handleSearchSubmit} className="customer-filter-form">
          {/* 1. Search Input */}
          <div className="filter-input-search" style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by Customer ID, Name, Mobile, City, District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: '38px',
                padding: '0 12px 0 36px',
                fontSize: '13px',
                borderRadius: '8px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 2. Customer Type Dropdown */}
          <div className="filter-select-type">
            <select
              className="select"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              style={{
                height: '38px',
                padding: '0 28px 0 10px',
                fontSize: '13px',
                borderRadius: '8px',
                width: '100%',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="">All Customer Types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </div>

          {/* 3. Source Dropdown (Direct vs Sub-Franchise) */}
          {isParentPartner && (
            <div className="filter-select-source">
              <select
                className="select"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 28px 0 10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All Sources (Direct + Sub-Franchise)</option>
                <option value="MY_CUSTOMERS">Direct Customers Only</option>
                <option value="SUB_FRANCHISE_CUSTOMERS">Sub-Franchise Customers Only</option>
              </select>
            </div>
          )}

          {/* 4. Action Buttons */}
          <div className="filter-actions">
            <button
              type="submit"
              className="btn btn-primary btn-search"
              style={{
                height: '38px',
                padding: '0 16px',
                fontSize: '13px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '700',
              }}
            >
              <Search size={14} />
              <span>Search</span>
            </button>

            {(search || customerType || district || source !== 'ALL') && (
              <button
                type="button"
                className="btn btn-outline btn-reset"
                onClick={() => {
                  setSearch('');
                  setCustomerType('');
                  setDistrict('');
                  setSource('ALL');
                  fetchCustomers(1);
                }}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                }}
                title="Reset all filters"
              >
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-refresh"
              onClick={() => fetchCustomers(pagination.page)}
              title="Refresh customer list"
              style={{
                height: '38px',
                padding: '0 12px',
                fontSize: '13px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>

      {/* Customers List Container */}
      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <div>Loading Vidhyut Saathi customer database...</div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Customers Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.5' }}>
            {search || customerType || district || source !== 'ALL'
              ? 'No registered customers match your search criteria. Try modifying your filter.'
              : isSuperAdmin
              ? 'No customer accounts registered across the network yet. When Franchise and Sub-Franchise partners register consumers during field card installations, they will appear here in real-time.'
              : 'You have not registered any customers yet. Click the button below to register a customer and record card installation.'}
          </p>
          {!isSuperAdmin && (
            <button
              onClick={() => navigate('/customers/new')}
              className="btn btn-primary"
              style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <UserPlus size={18} />
              <span>Add Customer / Install Card</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-only card" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer ID</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer Details</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Territory / City</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Connected Load</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Installed Cards</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Partner</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      {c.customerId}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{c.fullName}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '2px' }}>📱 {c.mobileNumber}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>{getTypeBadge(c.customerType)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.address?.district}, {c.address?.state}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PIN: {c.address?.pinCode}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#0284c7', background: '#f0f9ff', padding: '3px 8px', borderRadius: '6px', fontSize: '13px' }}>
                        <Zap size={13} /> {c.electricityDetails?.connectedLoadKw || 0} kW
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '12px', fontSize: '13px' }}>
                        <CreditCard size={13} /> {c.installedCardCount || 0} Cards
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.createdByPartnerId?.fullName || 'Direct HQ'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {c.createdByPartnerType === 'SUB_FRANCHISE' ? (
                          <span style={{ fontSize: '10.5px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Sub-Franchise
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Franchise Partner
                          </span>
                        )}
                        {c.createdByPartnerId?.franchiseId && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {c.createdByPartnerId.franchiseId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/customers/${c._id}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {customers.map((c) => (
              <div
                key={c._id}
                className="card"
                onClick={() => navigate(`/customers/${c._id}`)}
                style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                      {c.customerId}
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginTop: '6px', color: 'var(--text-primary)' }}>
                      {c.fullName}
                    </h4>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📱 {c.mobileNumber}</div>
                  </div>
                  {getTypeBadge(c.customerType)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12.5px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Territory</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.address?.district}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Load</div>
                    <div style={{ fontWeight: 600, color: '#0284c7' }}>⚡ {c.electricityDetails?.connectedLoadKw || 0} kW</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Installed Cards</div>
                    <div style={{ fontWeight: 700, color: '#15803d' }}>💳 {c.installedCardCount || 0} Cards</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Partner</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.createdByPartnerId?.fullName || 'HQ'}</div>
                    <div style={{ fontSize: '10.5px', color: c.createdByPartnerType === 'SUB_FRANCHISE' ? '#0284c7' : '#64748b', fontWeight: 600 }}>
                      {c.createdByPartnerType === 'SUB_FRANCHISE' ? 'Sub-Franchise' : 'Franchise Partner'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600, gap: '4px' }}>
                  <span>View Customer Profile & Installation</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {customers.length} of {pagination.totalRecords} customers (Page {pagination.page} of {pagination.totalPages})
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => fetchCustomers(pagination.page - 1)}
                className="btn btn-outline"
                style={{ padding: '6px 14px', opacity: pagination.hasPrevPage ? 1 : 0.5 }}
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => fetchCustomers(pagination.page + 1)}
                className="btn btn-outline"
                style={{ padding: '6px 14px', opacity: pagination.hasNextPage ? 1 : 0.5 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomersPage;
