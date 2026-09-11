import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  History,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Lock,
  ArrowUpRight,
  Copy,
  Check,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { CardStatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CardInventoryPage = () => {
  const { isSuperAdmin, partner } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    transferred: 0,
    installed: 0,
    blocked: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Cards List & Pagination
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [franchiseTypeFilter, setFranchiseTypeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  // States & Districts for filter dropdowns
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Copy indicator
  const [copiedId, setCopiedId] = useState(null);

  // 1. Fetch Aggregated Statistics
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/cards/stats');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch {
      showToast('Failed to load card inventory statistics.', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  // 2. Fetch States for Filter
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/territories/states');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setStatesList(res.data.data);
        }
      } catch {
        // Fallback
      }
    };
    fetchStates();
  }, []);

  // 3. Fetch Districts when State changes
  useEffect(() => {
    if (!stateFilter) {
      setDistrictsList([]);
      setDistrictFilter('');
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await api.get('/territories/districts', {
          params: { state: stateFilter },
        });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
        }
      } catch {
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [stateFilter]);

  // 4. Fetch Paginated Cards
  const fetchCards = useCallback(async (page = 1) => {
    try {
      setLoadingCards(true);
      const params = {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        franchiseType: franchiseTypeFilter || undefined,
        state: stateFilter || undefined,
        district: districtFilter || undefined,
      };

      const res = await api.get('/cards', { params });
      if (res.data?.data) {
        setCards(res.data.data.cards || []);
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Failed to load card records.', 'error');
    } finally {
      setLoadingCards(false);
    }
  }, [pagination.limit, search, statusFilter, franchiseTypeFilter, stateFilter, districtFilter, showToast]);

  // Initial Load & Filter change handler
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCards(1);
  }, [fetchCards]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCards(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFranchiseTypeFilter('');
    setStateFilter('');
    setDistrictFilter('');
  };

  const handleCopy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast(`Serial "${text}" copied!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={24} color="#0284c7" />
            <span>{isSuperAdmin ? 'Card Inventory Management' : 'My Allocated Card Inventory'}</span>
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isSuperAdmin
              ? 'Complete registry, serial tracking & ownership lifecycle of Vidhyut Saathi Electric Saver Cards'
              : `View active stock allocated to ${partner?.fullName || 'Partner'} (${partner?.franchiseId || ''})`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchCards(pagination.page);
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh inventory"
          >
            <RefreshCw size={15} className={loadingCards ? 'animate-spin' : ''} />
            <span className="hide-mobile">Refresh</span>
          </button>

          {isSuperAdmin && (
            <Link to="/cards/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} />
              <span>Add Cards Stock</span>
            </Link>
          )}
        </div>
      </div>

      {/* Real-time Statistics Cards (Direct from MongoDB Atlas) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title={isSuperAdmin ? 'Total Cards' : 'In Custody'}
          value={stats.total}
          subtitle="All physical units"
          icon={CreditCard}
          color="primary"
          loading={loadingStats}
        />
        <StatCard
          title="Available"
          value={stats.available}
          subtitle={isSuperAdmin ? 'HQ unallocated' : 'Ready to install'}
          icon={CheckCircle2}
          color="success"
          loading={loadingStats}
        />
        <StatCard
          title="Assigned"
          value={stats.assigned}
          subtitle="Allocated to Partners"
          icon={Building2}
          color="info"
          loading={loadingStats}
        />
        <StatCard
          title="Transferred"
          value={stats.transferred}
          subtitle="Inter-franchise move"
          icon={ArrowUpRight}
          color="warning"
          loading={loadingStats}
        />
        <StatCard
          title="Installed"
          value={stats.installed}
          subtitle="Active customers"
          icon={Sparkles}
          color="success"
          loading={loadingStats}
        />
        <StatCard
          title="Blocked / QC"
          value={stats.blocked}
          subtitle="Restricted units"
          icon={ShieldAlert}
          color="danger"
          loading={loadingStats}
        />
      </div>

      {/* Control Bar: Search & Filter Options */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '38px', width: '100%' }}
                placeholder="Search by Serial (e.g. VS000001), Partner ID, Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div style={{ flex: '1 1 150px' }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE (Available)</option>
                <option value="ASSIGNED">ASSIGNED (Allocated)</option>
                <option value="TRANSFERRED">TRANSFERRED (Transferred)</option>
                <option value="INSTALLED">INSTALLED (Installed)</option>
                <option value="BLOCKED">BLOCKED (QC / Hold)</option>
              </select>
            </div>

            {/* Super Admin Territory Filters */}
            {isSuperAdmin && (
              <>
                <div style={{ flex: '1 1 140px' }}>
                  <select
                    className="select"
                    value={franchiseTypeFilter}
                    onChange={(e) => setFranchiseTypeFilter(e.target.value)}
                  >
                    <option value="">All Franchise Types</option>
                    <option value="STATE_FRANCHISE">State Franchise</option>
                    <option value="DISTRICT_FRANCHISE">District Franchise</option>
                    <option value="SUB_FRANCHISE">Sub-Franchise</option>
                  </select>
                </div>

                <div style={{ flex: '1 1 140px' }}>
                  <select
                    className="select"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                  >
                    <option value="">All States</option>
                    {statesList.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {districtsList.length > 0 && (
                  <div style={{ flex: '1 1 140px' }}>
                    <select
                      className="select"
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                    >
                      <option value="">All Districts</option>
                      {districtsList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Buttons */}
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>
              <Filter size={15} />
              <span>Apply</span>
            </button>

            {(search || statusFilter || franchiseTypeFilter || stateFilter || districtFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline"
                style={{ padding: '8px 14px' }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Cards Table Container */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loadingCards ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Fetching Card Registry from MongoDB...</div>
          </div>
        ) : cards.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#64748B',
              }}
            >
              <CreditCard size={26} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No Cards Found</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
              {search || statusFilter || stateFilter
                ? 'No card records match your filter criteria. Try clearing search filters.'
                : 'No cards are currently recorded in the system. Super Admin can add cards using the batch generator.'}
            </p>
            {isSuperAdmin && (
              <Link to="/cards/new" className="btn btn-primary btn-sm">
                <Plus size={14} />
                <span>Add First Batch</span>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      SERIAL NUMBER
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      STATUS
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      CURRENT OWNER
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      FRANCHISE LEVEL
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      TERRITORY
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      ASSIGNED DATE
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => {
                    const isHQ = card.currentOwnerType === 'HEADQUARTERS' || !card.currentOwnerId;
                    const partnerOwner = card.currentOwnerId;

                    return (
                      <tr
                        key={card._id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/cards/${card._id}`)}
                        className="table-row-hover"
                      >
                        {/* Serial Number */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '13.5px',
                                fontWeight: '800',
                                color: '#0F172A',
                                letterSpacing: '0.8px',
                              }}
                            >
                              {card.serialNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(card.serialNumber, e)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: copiedId === card.serialNumber ? '#16A34A' : '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title="Copy Serial Number"
                            >
                              {copiedId === card.serialNumber ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <CardStatusBadge status={card.status} />
                        </td>

                        {/* Current Owner */}
                        <td style={{ padding: '14px 16px' }}>
                          {isHQ ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: '700', fontSize: '13px' }}>
                              <Building2 size={15} />
                              <span>Vidhyut Saathi HQ</span>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                {partnerOwner?.fullName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {partnerOwner?.franchiseId} • {partnerOwner?.mobileNumber}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Franchise Level */}
                        <td style={{ padding: '14px 16px' }}>
                          {isHQ ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Central Warehouse</span>
                          ) : (
                            <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                          )}
                        </td>

                        {/* Territory */}
                        <td style={{ padding: '14px 16px' }}>
                          {isHQ ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Central HQ</span>
                          ) : (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="#64748B" />
                              <span>
                                {partnerOwner?.district}, {partnerOwner?.state}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Assigned Date */}
                        <td style={{ padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {formatDate(card.assignedAt || card.createdAt)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <Link
                              to={`/cards/${card._id}`}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              title="View details & audit trail"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing{' '}
                <strong>
                  {cards.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong>{pagination.total}</strong> cards
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Rows:</span>
                  <select
                    className="select"
                    style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                    value={pagination.limit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value, 10);
                      setPagination((prev) => ({ ...prev, limit: newLimit }));
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchCards(pagination.page - 1)}
                    style={{ padding: '5px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ fontSize: '12.5px', fontWeight: '700', padding: '0 6px' }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchCards(pagination.page + 1)}
                    style={{ padding: '5px 8px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardInventoryPage;
