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
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        customerType: customerType || undefined,
        district: district || undefined,
        source: isParentPartner && source !== 'ALL' ? source : undefined,
      };

      const res = await api.get('/customers', { params });
      if (res.data?.data) {
        const data = res.data.data;
        setCustomers(data.customers || []);
        setPagination(data.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });

        // Calculate counts
        const allList = data.customers || [];
        const resCount = allList.filter((c) => c.customerType === 'RESIDENTIAL').length;
        const commCount = allList.filter((c) => c.customerType === 'COMMERCIAL').length;
        const indCount = allList.filter((c) => c.customerType === 'INDUSTRIAL').length;
        const totalCards = allList.reduce((acc, c) => acc + (c.installedCardCount || 0), 0);

        setStats({
          total: data.pagination?.totalRecords || allList.length,
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

      {/* Metrics Row (Interactive Filters) */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <StatCard
          title="Total Registered Customers"
          value={stats.total}
          subtitle={customerType === '' ? '● All Accounts Showing' : 'Click to show all'}
          icon={Users}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          onClick={() => setCustomerType('')}
          isActive={customerType === ''}
          activeLabel="All"
          loading={loading}
        />

        <StatCard
          title="Installed Energy Cards"
          value={stats.installedCards}
          subtitle="Active in field"
          icon={CreditCard}
          bgLight="#dcfce7"
          iconColor="#15803d"
          onClick={() => setCustomerType('')}
          loading={loading}
        />

        <StatCard
          title="Residential Consumers"
          value={stats.residential}
          subtitle="Homes & Apartments"
          icon={Home}
          bgLight="#e0f2fe"
          iconColor="#0369a1"
          onClick={() => setCustomerType((prev) => (prev === 'RESIDENTIAL' ? '' : 'RESIDENTIAL'))}
          isActive={customerType === 'RESIDENTIAL'}
          activeLabel="Filtered"
          loading={loading}
        />

        <StatCard
          title="Commercial Accounts"
          value={stats.commercial}
          subtitle="Offices & Shops"
          icon={Building}
          bgLight="#fef3c7"
          iconColor="#b45309"
          onClick={() => setCustomerType((prev) => (prev === 'COMMERCIAL' ? '' : 'COMMERCIAL'))}
          isActive={customerType === 'COMMERCIAL'}
          activeLabel="Filtered"
          loading={loading}
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} className="filter-form-responsive">
          <div className="search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by Customer ID, Name, Mobile, City, District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: '42px', paddingLeft: '40px' }}
            />
          </div>

          <div className="filter-select-wrap" style={{ width: '200px', minWidth: '160px' }}>
            <select
              className="form-control"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              style={{ height: '42px' }}
            >
              <option value="">All Customer Types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </div>

          {isParentPartner && (
            <div className="filter-select-wrap" style={{ width: '240px', minWidth: '180px' }}>
              <select
                className="form-control"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ height: '42px', fontWeight: 500 }}
              >
                <option value="ALL">All Sources (Direct + Sub-Franchise)</option>
                <option value="MY_CUSTOMERS">Direct Customers Only</option>
                <option value="SUB_FRANCHISE_CUSTOMERS">Sub-Franchise Customers Only</option>
              </select>
            </div>
          )}

          <div className="filter-actions-wrap" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '42px', padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Search size={16} />
              <span>Search</span>
            </button>

            {(search || customerType || district || source !== 'ALL') && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSearch('');
                  setCustomerType('');
                  setDistrict('');
                  setSource('ALL');
                  fetchCustomers(1);
                }}
                style={{ height: '42px', padding: '0 16px' }}
              >
                Reset
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fetchCustomers(pagination.page)}
              title="Refresh list"
              style={{ height: '42px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
