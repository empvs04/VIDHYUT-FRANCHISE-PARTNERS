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
  Users,
  Layers,
  ArrowRight,
  PackageCheck,
  Send,
  Warehouse,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { CardStatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';


const CardInventoryPage = () => {
  const { isSuperAdmin, partner } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Active Main View Tab ('cards' | 'distribution')
  const [activeTab, setActiveTab] = useState('cards');

  // Card View Mode: 'ranges' (Consolidated serial ranges) vs 'individual' (1-by-1 cards)
  const [cardViewMode, setCardViewMode] = useState('ranges');

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

  // Grouped Card Ranges List & Pagination
  const [ranges, setRanges] = useState([]);
  const [loadingRanges, setLoadingRanges] = useState(true);
  const [rangesPagination, setRangesPagination] = useState({
    total: 0,
    totalCards: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  // Range Details Modal
  const [selectedRange, setSelectedRange] = useState(null);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeModalSearch, setRangeModalSearch] = useState('');

  // Cards List & Pagination (Individual)
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  // Partner Distribution State
  const [distributionData, setDistributionData] = useState({
    overview: {
      totalCards: 0,
      warehouseAvailable: 0,
      distributedToPartners: 0,
      installedCustomers: 0,
      blockedQC: 0,
    },
    partners: [],
  });
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');

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

  // Purge / Delete Batch State (Super Admin)
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeMode, setPurgeMode] = useState('RANGE'); // 'RANGE' or 'BATCH_ID'
  const [purgePrefix, setPurgePrefix] = useState('VS');
  const [purgeStart, setPurgeStart] = useState('');
  const [purgeEnd, setPurgeEnd] = useState('');
  const [purgeBatchId, setPurgeBatchId] = useState('');
  const [purgeReason, setPurgeReason] = useState('Wrong stock added by mistake');
  const [purgeLoading, setPurgeLoading] = useState(false);

  // Single Card Delete State (Super Admin)
  const [singleDeleteModalOpen, setSingleDeleteModalOpen] = useState(false);
  const [targetCardToDelete, setTargetCardToDelete] = useState(null);
  const [singleDeleteReason, setSingleDeleteReason] = useState('Wrong stock entry mistake');
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);

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

  // 1.5 Fetch Grouped Serial Ranges
  const fetchRanges = useCallback(async (page = 1) => {
    try {
      setLoadingRanges(true);
      const params = {
        page,
        limit: rangesPagination.limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        franchiseType: franchiseTypeFilter || undefined,
        state: stateFilter || undefined,
        district: districtFilter || undefined,
      };

      const res = await api.get('/cards/ranges', { params });
      if (res.data?.data) {
        setRanges(res.data.data.ranges || []);
        setRangesPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Failed to load card serial ranges.', 'error');
    } finally {
      setLoadingRanges(false);
    }
  }, [rangesPagination.limit, search, statusFilter, franchiseTypeFilter, stateFilter, districtFilter, showToast]);


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

  // 5. Fetch Partner Distribution Breakdown
  const fetchDistribution = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingDistribution(true);
      const params = {
        state: stateFilter || undefined,
        district: districtFilter || undefined,
        search: partnerSearch.trim() || undefined,
      };
      const res = await api.get('/cards/partner-distribution', { params });
      if (res.data?.data) {
        setDistributionData(res.data.data);
      }
    } catch {
      showToast('Failed to load partner stock breakdown.', 'error');
    } finally {
      setLoadingDistribution(false);
    }
  }, [isSuperAdmin, stateFilter, districtFilter, partnerSearch, showToast]);

  // Initial Load & Filter change handler
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'cards') {
      if (cardViewMode === 'ranges') {
        fetchRanges(1);
      } else {
        fetchCards(1);
      }
    } else if (activeTab === 'distribution') {
      fetchDistribution();
    }
  }, [activeTab, cardViewMode, fetchCards, fetchRanges, fetchDistribution]);

  // Click Stat Card to filter
  const handleStatCardClick = (status) => {
    setActiveTab('cards');
    if (status === 'TOTAL') {
      setStatusFilter('');
    } else {
      setStatusFilter((prev) => (prev === status ? '' : status));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (cardViewMode === 'ranges') {
      fetchRanges(1);
    } else {
      fetchCards(1);
    }
  };

  const handlePartnerSearchSubmit = (e) => {
    e.preventDefault();
    fetchDistribution();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFranchiseTypeFilter('');
    setStateFilter('');
    setDistrictFilter('');
  };

  const handleViewPartnerCards = (partnerItem) => {
    setActiveTab('cards');
    setStatusFilter('');
    setSearch(partnerItem.franchiseId || partnerItem.fullName);
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

  // Handle Single Card Delete
  const handleSingleDelete = async () => {
    if (!targetCardToDelete) return;
    try {
      setSingleDeleteLoading(true);
      const res = await api.delete(`/cards/${targetCardToDelete._id}`, {
        data: { reason: singleDeleteReason },
      });
      showToast(res.data?.message || 'Card successfully deleted from stock.', 'success');
      setSingleDeleteModalOpen(false);
      setTargetCardToDelete(null);
      fetchStats();
      fetchCards(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete card.', 'error');
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  // Handle Purge Batch Range Delete
  const handlePurgeBatch = async (e) => {
    e.preventDefault();
    try {
      setPurgeLoading(true);
      const payload = {
        mode: purgeMode,
        reason: purgeReason,
      };

      if (purgeMode === 'ALL_HQ') {
        payload.purgeAllAvailableHQ = true;
      } else if (purgeMode === 'RANGE') {
        if (!purgePrefix || !purgeStart || !purgeEnd) {
          showToast('Please enter prefix, starting and ending serial numbers.', 'error');
          return;
        }
        payload.prefix = purgePrefix.trim().toUpperCase();
        payload.startNumber = parseInt(purgeStart, 10);
        payload.endNumber = parseInt(purgeEnd, 10);
      } else {
        if (!purgeBatchId.trim()) {
          showToast('Please enter Batch ID.', 'error');
          return;
        }
        payload.batchId = purgeBatchId.trim();
      }

      const res = await api.delete('/cards/batch/purge', { data: payload });
      showToast(res.data?.message || `Successfully purged ${res.data?.data?.deletedCount} cards.`, 'success');
      setPurgeModalOpen(false);
      fetchStats();
      fetchCards(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to purge stock batch.', 'error');
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <CreditCard size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isSuperAdmin ? 'Card Inventory & Partner Stock Management' : 'My Allocated Card Inventory'}
            </h1>
            <p className="page-subtitle">
              {isSuperAdmin
                ? 'Click any stat card to filter instantly, track cards given to partners, and view remaining warehouse stock.'
                : `View active stock allocated to ${partner?.fullName || 'Partner'} (${partner?.franchiseId || ''})`}
            </p>
          </div>
        </div>

        <div className="page-header-actions-grid">
          <button
            type="button"
            onClick={() => {
              fetchStats();
              if (activeTab === 'cards') {
                if (cardViewMode === 'ranges') fetchRanges(rangesPagination.page);
                else fetchCards(pagination.page);
              }
              if (activeTab === 'distribution') fetchDistribution();
            }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh inventory"
          >
            <RefreshCw size={14} className={loadingCards || loadingRanges || loadingDistribution ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setPurgeModalOpen(true)}
                className="btn btn-danger-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Purge/Delete wrong stock added by mistake"
              >
                <Trash2 size={14} />
                <span>Purge Stock</span>
              </button>

              <Link
                to="/cards/assign"
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0284C7',
                  borderColor: '#BAE6FD',
                  backgroundColor: '#F0F9FF',
                }}
              >
                <Send size={14} />
                <span>Assign to Partner</span>
              </Link>

              <Link
                to="/cards/new"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Add Cards Stock</span>
              </Link>
            </>
          )}
        </div>
      </div>


      {/* Interactive Real-time Statistics Cards (Clickable) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title={isSuperAdmin ? 'Total Cards' : 'In Custody'}
          value={stats.total}
          subtitle={activeTab === 'cards' && statusFilter === '' ? '● All Records Showing' : 'Click to show all'}
          icon={CreditCard}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          onClick={() => handleStatCardClick('TOTAL')}
          isActive={activeTab === 'cards' && statusFilter === ''}
          activeLabel="All"
          loading={loadingStats}
        />
        <StatCard
          title="Available"
          value={stats.available}
          subtitle={isSuperAdmin ? 'HQ unallocated stock' : 'Ready to install'}
          icon={CheckCircle2}
          bgLight="#dcfce7"
          iconColor="#15803d"
          onClick={() => handleStatCardClick('AVAILABLE')}
          isActive={activeTab === 'cards' && statusFilter === 'AVAILABLE'}
          activeLabel="Filtered"
          loading={loadingStats}
        />
        <StatCard
          title="Assigned"
          value={stats.assigned}
          subtitle="Allocated to Partners"
          icon={Building2}
          bgLight="#e0e7ff"
          iconColor="#4338ca"
          onClick={() => handleStatCardClick('ASSIGNED')}
          isActive={activeTab === 'cards' && statusFilter === 'ASSIGNED'}
          activeLabel="Filtered"
          loading={loadingStats}
        />
        <StatCard
          title="Transferred"
          value={stats.transferred}
          subtitle="Inter-franchise move"
          icon={ArrowUpRight}
          bgLight="#fef3c7"
          iconColor="#b45309"
          onClick={() => handleStatCardClick('TRANSFERRED')}
          isActive={activeTab === 'cards' && statusFilter === 'TRANSFERRED'}
          activeLabel="Filtered"
          loading={loadingStats}
        />
        <StatCard
          title="Installed"
          value={stats.installed}
          subtitle="Active customers"
          icon={Sparkles}
          bgLight="#dcfce7"
          iconColor="#059669"
          onClick={() => handleStatCardClick('INSTALLED')}
          isActive={activeTab === 'cards' && statusFilter === 'INSTALLED'}
          activeLabel="Filtered"
          loading={loadingStats}
        />
        <StatCard
          title="Blocked / QC"
          value={stats.blocked}
          subtitle="Restricted / hold"
          icon={ShieldAlert}
          bgLight="#fee2e2"
          iconColor="#b91c1c"
          onClick={() => handleStatCardClick('BLOCKED')}
          isActive={activeTab === 'cards' && statusFilter === 'BLOCKED'}
          activeLabel="Filtered"
          loading={loadingStats}
        />
      </div>

      {/* Main Navigation Tabs for Super Admin */}
      {isSuperAdmin && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '2px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'cards' ? '700' : '500',
              color: activeTab === 'cards' ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'cards' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={16} />
            <span>All Cards Registry ({stats.total})</span>
            {statusFilter && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                }}
              >
                Filtered: {statusFilter}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'distribution' ? '700' : '500',
              color: activeTab === 'distribution' ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'distribution' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={16} />
            <span>Partner Stock Breakdown</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
              }}
            >
              {stats.assigned} Assigned
            </span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: ALL CARDS REGISTRY                                 */}
      {/* ========================================================= */}
      {activeTab === 'cards' && (
        <>
          {/* Control Bar: Search & Filter Options */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <form onSubmit={handleSearchSubmit} className="filter-bar-grid">
              {/* Search Input */}
              <div className="filter-search-full">
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

              {/* Status Filter & Territory Selects Grid */}
              <div className="filter-selects-grid">
                <div className={`filter-select-item ${!isSuperAdmin ? 'filter-full-width' : ''}`}>
                  <select
                    className="select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="AVAILABLE">AVAILABLE (HQ Stock)</option>
                    <option value="PENDING_TRANSFER">PENDING TRANSFER</option>
                    <option value="ASSIGNED">ASSIGNED (In Field)</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="INSTALLED">INSTALLED (Active)</option>
                    <option value="BLOCKED">BLOCKED (Hold)</option>
                  </select>
                </div>

                {isSuperAdmin && (
                  <>
                    <div className="filter-select-item">
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

                    <div className="filter-select-item">
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
                      <div className="filter-select-item">
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
              </div>

              {/* Action Buttons Row */}
              <div className="filter-actions-row">
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
                    Clear All
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* View Mode Switch Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                padding: '4px',
                borderRadius: '8px',
                gap: '4px',
                width: '100%',
                maxWidth: '650px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setCardViewMode('ranges');
                  fetchRanges(1);
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: cardViewMode === 'ranges' ? '#FFFFFF' : 'transparent',
                  color: cardViewMode === 'ranges' ? '#0F172A' : '#64748B',
                  fontWeight: cardViewMode === 'ranges' ? '700' : '500',
                  fontSize: '12.5px',
                  boxShadow: cardViewMode === 'ranges' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                }}
              >
                <Layers size={14} color={cardViewMode === 'ranges' ? '#0284C7' : '#64748B'} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Serial Ranges</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor: cardViewMode === 'ranges' ? '#E0F2FE' : '#E2E8F0',
                    color: cardViewMode === 'ranges' ? '#0284C7' : '#64748B',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {rangesPagination.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCardViewMode('individual');
                  fetchCards(1);
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: cardViewMode === 'individual' ? '#FFFFFF' : 'transparent',
                  color: cardViewMode === 'individual' ? '#0F172A' : '#64748B',
                  fontWeight: cardViewMode === 'individual' ? '700' : '500',
                  fontSize: '12.5px',
                  boxShadow: cardViewMode === 'individual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  minWidth: 0,
                }}
              >
                <CreditCard size={14} color={cardViewMode === 'individual' ? '#0284C7' : '#64748B'} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>All Cards (1-by-1)</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor: cardViewMode === 'individual' ? '#E0F2FE' : '#E2E8F0',
                    color: cardViewMode === 'individual' ? '#0284C7' : '#64748B',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {pagination.total}
                </span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <Sparkles size={13} color="#0284C7" style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: 1.35 }}>
                {cardViewMode === 'ranges'
                  ? 'Consolidated serial ranges (from start serial to end serial) assigned per partner.'
                  : 'Displaying individual cards one-by-one with direct card action controls.'}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODE A: SERIAL RANGES / BATCHES TABLE                     */}
          {/* ========================================================= */}
          {cardViewMode === 'ranges' && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {loadingRanges ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Grouping and calculating serial number ranges...</div>
                </div>
              ) : ranges.length === 0 ? (
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
                    <Layers size={26} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No Card Ranges Found</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                    {search || statusFilter || stateFilter
                      ? 'No card ranges match your filter criteria. Try clearing search filters.'
                      : 'No card ranges available. Add new card stock to get started.'}
                  </p>
                  {isSuperAdmin && (
                    <Link to="/cards/new" className="btn btn-primary btn-sm">
                      <Plus size={14} />
                      <span>Add Cards Stock</span>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="desktop-table-only table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            CARD SERIAL RANGE
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
                        {ranges.map((rng) => {
                          const isHQ = rng.currentOwnerType === 'HEADQUARTERS' || !rng.currentOwner;
                          const partnerOwner = rng.currentOwner;
                          const isSingleCard = rng.startSerial === rng.endSerial;
                          const rangeLabel = isSingleCard ? rng.startSerial : `${rng.startSerial} - ${rng.endSerial}`;

                          return (
                            <tr
                              key={rng.rangeId}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                transition: 'background-color 0.15s ease',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setSelectedRange(rng);
                                setRangeModalSearch('');
                                setRangeModalOpen(true);
                              }}
                              className="table-row-hover"
                            >
                              {/* Serial Range */}
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  {isSingleCard ? (
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '13.5px',
                                        fontWeight: '800',
                                        color: '#0F172A',
                                        letterSpacing: '0.8px',
                                      }}
                                    >
                                      {rng.startSerial}
                                    </span>
                                  ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '13.5px',
                                          fontWeight: '800',
                                          color: '#0284C7',
                                          letterSpacing: '0.8px',
                                          backgroundColor: '#F0F9FF',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #BAE6FD',
                                        }}
                                      >
                                        {rng.startSerial}
                                      </span>
                                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        to
                                      </span>
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '13.5px',
                                          fontWeight: '800',
                                          color: '#0284C7',
                                          letterSpacing: '0.8px',
                                          backgroundColor: '#F0F9FF',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #BAE6FD',
                                        }}
                                      >
                                        {rng.endSerial}
                                      </span>
                                    </div>
                                  )}

                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      backgroundColor: isSingleCard ? '#F1F5F9' : '#DCFCE7',
                                      color: isSingleCard ? '#475569' : '#15803D',
                                      border: isSingleCard ? '1px solid #E2E8F0' : '1px solid #BBF7D0',
                                    }}
                                  >
                                    {rng.totalCards} {rng.totalCards === 1 ? 'Card' : 'Cards'}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(rangeLabel, e)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: copiedId === rangeLabel ? '#16A34A' : '#94A3B8',
                                      cursor: 'pointer',
                                      padding: '2px',
                                    }}
                                    title="Copy Serial Range"
                                  >
                                    {copiedId === rangeLabel ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </td>

                              {/* Status */}
                              <td style={{ padding: '14px 16px' }}>
                                <CardStatusBadge status={rng.status} />
                              </td>

                              {/* Current Owner */}
                              <td style={{ padding: '14px 16px' }}>
                                {isHQ ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: '700', fontSize: '13px' }}>
                                    <Warehouse size={15} />
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
                                {formatDate(rng.assignedAt)}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRange(rng);
                                      setRangeModalSearch('');
                                      setRangeModalOpen(true);
                                    }}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    title="View full serial numbers list in this range"
                                  >
                                    <Eye size={13} />
                                    <span>View Serials ({rng.totalCards})</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Responsive Ranges View */}
                  <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                    {ranges.map((rng) => {
                      const isHQ = rng.currentOwnerType === 'HEADQUARTERS' || !rng.currentOwner;
                      const partnerOwner = rng.currentOwner;
                      const isSingleCard = rng.startSerial === rng.endSerial;
                      const rangeLabel = isSingleCard ? rng.startSerial : `${rng.startSerial} - ${rng.endSerial}`;

                      return (
                        <div
                          key={rng.rangeId}
                          className="mobile-card-item"
                          onClick={() => {
                            setSelectedRange(rng);
                            setRangeModalSearch('');
                            setRangeModalOpen(true);
                          }}
                        >
                          <div className="mobile-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '13.5px',
                                  fontWeight: '800',
                                  color: '#0F172A',
                                }}
                              >
                                {rangeLabel}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                }}
                              >
                                {rng.totalCards} Cards
                              </span>
                            </div>
                            <CardStatusBadge status={rng.status} />
                          </div>

                          <div className="mobile-card-grid">
                            <div>
                              <div className="mobile-card-label">Current Owner</div>
                              <div className="mobile-card-value">
                                {isHQ ? (
                                  <span style={{ color: '#0284C7' }}>Vidhyut Saathi HQ</span>
                                ) : (
                                  partnerOwner?.fullName || '—'
                                )}
                              </div>
                              {!isHQ && partnerOwner?.franchiseId && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {partnerOwner.franchiseId}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="mobile-card-label">Franchise Level</div>
                              <div className="mobile-card-value">
                                {isHQ ? (
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Central HQ</span>
                                ) : (
                                  <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="mobile-card-label">Territory</div>
                              <div className="mobile-card-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {isHQ ? 'Central HQ' : `${partnerOwner?.district || '—'}, ${partnerOwner?.state || ''}`}
                              </div>
                            </div>

                            <div>
                              <div className="mobile-card-label">Assigned Date</div>
                              <div className="mobile-card-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {formatDate(rng.assignedAt)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', gap: '4px' }}>
                              <span>View All {rng.totalCards} Serials</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for Ranges */}
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
                        {ranges.length > 0 ? (rangesPagination.page - 1) * rangesPagination.limit + 1 : 0}
                      </strong>{' '}
                      to{' '}
                      <strong>
                        {Math.min(rangesPagination.page * rangesPagination.limit, rangesPagination.total)}
                      </strong>{' '}
                      of <strong>{rangesPagination.total}</strong> contiguous ranges ({rangesPagination.totalCards} total cards)
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>Rows:</span>
                        <select
                          className="select"
                          style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                          value={rangesPagination.limit}
                          onChange={(e) => {
                            const newLimit = parseInt(e.target.value, 10);
                            setRangesPagination((prev) => ({ ...prev, limit: newLimit }));
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
                          disabled={rangesPagination.page <= 1}
                          onClick={() => fetchRanges(rangesPagination.page - 1)}
                          style={{ padding: '5px 8px' }}
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <span style={{ fontSize: '12.5px', fontWeight: '700', padding: '0 6px' }}>
                          Page {rangesPagination.page} of {rangesPagination.totalPages}
                        </span>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={rangesPagination.page >= rangesPagination.totalPages}
                          onClick={() => fetchRanges(rangesPagination.page + 1)}
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
          )}

          {/* ========================================================= */}
          {/* MODE B: ALL INDIVIDUAL CARDS (1-BY-1) TABLE               */}
          {/* ========================================================= */}
          {cardViewMode === 'individual' && (
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
                      : 'No cards are currently recorded in the system. Add new cards to stock to get started.'}
                  </p>
                  {isSuperAdmin && (
                    <Link to="/cards/new" className="btn btn-primary btn-sm">
                      <Plus size={14} />
                      <span>Add Cards Stock</span>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="desktop-table-only table-responsive">
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
                                    <Warehouse size={15} />
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

                                  {isSuperAdmin && card.status === 'AVAILABLE' && (card.currentOwnerType === 'HEADQUARTERS' || !card.currentOwnerId) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetCardToDelete(card);
                                        setSingleDeleteModalOpen(true);
                                      }}
                                      className="btn btn-danger-outline btn-sm"
                                      style={{ padding: '5px 8px', fontSize: '12px', color: '#EF4444', borderColor: '#FCA5A5' }}
                                      title="Delete/Purge wrong card from stock"
                                    >
                                      <Trash2 size={13} />
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

                  {/* Mobile Responsive Cards View */}
                  <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                    {cards.map((card) => {
                      const isHQ = card.currentOwnerType === 'HEADQUARTERS' || !card.currentOwnerId;
                      const partnerOwner = card.currentOwnerId;

                      return (
                        <div
                          key={card._id}
                          className="mobile-card-item"
                          onClick={() => navigate(`/cards/${card._id}`)}
                        >
                          <div className="mobile-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '14px',
                                  fontWeight: '800',
                                  color: '#0F172A',
                                  letterSpacing: '0.8px',
                                }}
                              >
                                {card.serialNumber}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(card.serialNumber, e);
                                }}
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
                            <CardStatusBadge status={card.status} />
                          </div>

                          <div className="mobile-card-grid">
                            <div>
                              <div className="mobile-card-label">Current Owner</div>
                              <div className="mobile-card-value">
                                {isHQ ? (
                                  <span style={{ color: '#0284C7' }}>Vidhyut Saathi HQ</span>
                                ) : (
                                  partnerOwner?.fullName || '—'
                                )}
                              </div>
                              {!isHQ && partnerOwner?.franchiseId && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {partnerOwner.franchiseId}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="mobile-card-label">Franchise Level</div>
                              <div className="mobile-card-value">
                                {isHQ ? (
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Central HQ</span>
                                ) : (
                                  <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="mobile-card-label">Territory</div>
                              <div className="mobile-card-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {isHQ ? 'Central HQ' : `${partnerOwner?.district || '—'}, ${partnerOwner?.state || ''}`}
                              </div>
                            </div>

                            <div>
                              <div className="mobile-card-label">Assigned Date</div>
                              <div className="mobile-card-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {formatDate(card.assignedAt || card.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                            {isSuperAdmin && card.status === 'AVAILABLE' && (card.currentOwnerType === 'HEADQUARTERS' || !card.currentOwnerId) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTargetCardToDelete(card);
                                  setSingleDeleteModalOpen(true);
                                }}
                                className="btn btn-danger-outline btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', borderColor: '#FCA5A5' }}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', gap: '4px' }}>
                              <span>View Details & History</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for Cards */}
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
                      of <strong>{pagination.total}</strong> individual cards
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
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PARTNER STOCK DISTRIBUTION BREAKDOWN               */}
      {/* ========================================================= */}
      {activeTab === 'distribution' && isSuperAdmin && (
        <div>
          {/* Live Stock Summary Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div
              className="card"
              style={{
                backgroundColor: '#F0FDF4',
                borderColor: '#BBF7D0',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Warehouse size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase' }}>
                  Warehouse Remaining Stock
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#14532D' }}>
                  {distributionData.overview.warehouseAvailable} Units Left
                </div>
                <div style={{ fontSize: '11.5px', color: '#166534' }}>
                  Available in Central HQ for allocation
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                backgroundColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#DBEAFE',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase' }}>
                  Distributed in Field
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1E40AF' }}>
                  {distributionData.overview.distributedToPartners} Units
                </div>
                <div style={{ fontSize: '11.5px', color: '#1E3A8A' }}>
                  Currently held across active franchise partners
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                backgroundColor: '#FAF5FF',
                borderColor: '#E9D5FF',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#F3E8FF',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#7E22CE', textTransform: 'uppercase' }}>
                  Installed with Customers
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#581C87' }}>
                  {distributionData.overview.installedCustomers} Units Active
                </div>
                <div style={{ fontSize: '11.5px', color: '#6B21A8' }}>
                  Energy saver cards active on customer meters
                </div>
              </div>
            </div>
          </div>

          {/* Partner Search & Territory Filters */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <form onSubmit={handlePartnerSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', position: 'relative', minWidth: '200px' }}>
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
                  placeholder="Search Partner by Name, Franchise ID (FP-...), or Phone..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                />
              </div>

              <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
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
                <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
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

              <div style={{ display: 'flex', gap: '8px', flex: '1 1 180px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 14px', height: '40px', justifyContent: 'center' }}>
                  <Filter size={15} />
                  <span>Filter</span>
                </button>

                {(partnerSearch || stateFilter || districtFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerSearch('');
                      setStateFilter('');
                      setDistrictFilter('');
                    }}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '8px 12px', height: '40px', justifyContent: 'center' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Partner Breakdown List */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loadingDistribution ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Calculating Partner Card Possessions...</div>
              </div>
            ) : distributionData.partners.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Users size={32} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No Partners Found</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  No active franchise partners match the search criteria.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-table-only table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          FRANCHISE PARTNER
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          TERRITORY
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          CARDS GIVEN (TOTAL)
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          IN-HAND STOCK
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          INSTALLED
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          SAMPLE SERIALS
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          QUICK ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionData.partners.map((p) => {
                        const hasStock = p.totalCardsPossessed > 0;

                        return (
                          <tr
                            key={p.partnerId}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: hasStock ? '#FFFFFF' : '#FAFAFA',
                            }}
                            className="table-row-hover"
                          >
                            {/* Partner Name & Franchise ID */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '8px',
                                    backgroundColor: hasStock ? '#E0F2FE' : '#F1F5F9',
                                    color: hasStock ? '#0284C7' : '#64748B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    flexShrink: 0,
                                  }}
                                >
                                  {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                                    {p.fullName}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#0284c7' }}>
                                      {p.franchiseId}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {p.mobileNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Territory & Franchise Type */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <FranchiseTypeBadge type={p.franchiseType} />
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} color="#64748B" />
                                  <span>
                                    {p.district}, {p.state}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Total Cards Possessed */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 12px',
                                  borderRadius: '16px',
                                  backgroundColor: hasStock ? '#DCFCE7' : '#F1F5F9',
                                  color: hasStock ? '#15803D' : '#64748B',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                }}
                              >
                                <CreditCard size={14} />
                                <span>{p.totalCardsPossessed} Cards</span>
                              </div>
                            </td>

                            {/* In-Hand Stock */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: p.activeStockCount > 0 ? '#0284C7' : 'var(--text-muted)',
                                }}
                              >
                                {p.activeStockCount} Units
                              </span>
                            </td>

                            {/* Installed */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: p.installedCount > 0 ? '#16A34A' : 'var(--text-muted)',
                                }}
                              >
                                {p.installedCount} Units
                              </span>
                            </td>

                            {/* Sample Serials */}
                            <td style={{ padding: '14px 16px' }}>
                              {p.sampleSerials && p.sampleSerials.length > 0 ? (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {p.sampleSerials.map((s) => (
                                    <span
                                      key={s}
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        backgroundColor: '#F1F5F9',
                                        color: '#0F172A',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #E2E8F0',
                                      }}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                  {p.totalCardsPossessed > p.sampleSerials.length && (
                                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                      +{p.totalCardsPossessed - p.sampleSerials.length} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  None allocated yet
                                </span>
                              )}
                            </td>

                            {/* Quick Actions */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                {hasStock && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewPartnerCards(p)}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '5px 10px', fontSize: '12px' }}
                                    title="View all cards allocated to this partner"
                                  >
                                    <Eye size={13} />
                                    <span>View Cards ({p.totalCardsPossessed})</span>
                                  </button>
                                )}

                                <Link
                                  to={`/cards/assign?partnerId=${p.partnerId}`}
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                  title="Allocate more cards from warehouse"
                                >
                                  <Send size={13} />
                                  <span>Assign Stock</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View for Partner Distribution */}
                <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                  {distributionData.partners.map((p) => {
                    const hasStock = p.totalCardsPossessed > 0;

                    return (
                      <div key={p.partnerId} className="mobile-card-item">
                        <div className="mobile-card-header">
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>
                              {p.fullName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: '700', marginTop: '2px' }}>
                              {p.franchiseId} {p.mobileNumber ? `• ${p.mobileNumber}` : ''}
                            </div>
                          </div>
                          <FranchiseTypeBadge type={p.franchiseType} />
                        </div>

                        <div className="mobile-card-grid">
                          <div>
                            <div className="mobile-card-label">Territory</div>
                            <div className="mobile-card-value" style={{ fontSize: '12px' }}>
                              {p.district}, {p.state}
                            </div>
                          </div>

                          <div>
                            <div className="mobile-card-label">Total Allocated</div>
                            <div className="mobile-card-value" style={{ fontWeight: '800', color: hasStock ? '#15803D' : '#64748B' }}>
                              {p.totalCardsPossessed} Cards
                            </div>
                          </div>

                          <div>
                            <div className="mobile-card-label">In-Hand Stock</div>
                            <div className="mobile-card-value" style={{ fontWeight: '700', color: '#0284C7' }}>
                              {p.activeStockCount} Units
                            </div>
                          </div>

                          <div>
                            <div className="mobile-card-label">Installed</div>
                            <div className="mobile-card-value" style={{ fontWeight: '700', color: '#16A34A' }}>
                              {p.installedCount} Units
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: hasStock ? '1fr 1fr' : '1fr', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                          {hasStock && (
                            <button
                              type="button"
                              onClick={() => handleViewPartnerCards(p)}
                              className="btn btn-outline btn-sm"
                              style={{ height: '36px', justifyContent: 'center', fontSize: '12px' }}
                            >
                              <Eye size={13} />
                              <span>View Cards</span>
                            </button>
                          )}
                          <Link
                            to={`/cards/assign?partnerId=${p.partnerId}`}
                            className="btn btn-primary btn-sm"
                            style={{ height: '36px', justifyContent: 'center', fontSize: '12px' }}
                          >
                            <Send size={13} />
                            <span>Assign Stock</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal 1: Purge Wrong Stock Batch (Super Admin Only) ─── */}
      <Modal
        isOpen={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        title="Purge / Remove Wrong Stock"
        maxWidth="560px"
      >
        <form onSubmit={handlePurgeBatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Security Alert */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', color: '#991B1B', lineHeight: '1.4' }}>
              <strong>Admin Safety Protection:</strong> Only unassigned cards currently available in Central HQ stock will be purged. Cards already distributed to Franchise Partners or installed are protected.
            </div>
          </div>

          {/* Purge Method Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
              Select Purge Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPurgeMode('RANGE')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: purgeMode === 'RANGE' ? 'var(--color-primary)' : 'var(--border-color)',
                  backgroundColor: purgeMode === 'RANGE' ? '#E0F2FE' : '#FFFFFF',
                  color: purgeMode === 'RANGE' ? '#0284C7' : 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                Serial Range
              </button>

              <button
                type="button"
                onClick={() => setPurgeMode('BATCH_ID')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: purgeMode === 'BATCH_ID' ? 'var(--color-primary)' : 'var(--border-color)',
                  backgroundColor: purgeMode === 'BATCH_ID' ? '#E0F2FE' : '#FFFFFF',
                  color: purgeMode === 'BATCH_ID' ? '#0284C7' : 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                Batch ID
              </button>

              <button
                type="button"
                onClick={() => setPurgeMode('ALL_HQ')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: purgeMode === 'ALL_HQ' ? '#DC2626' : 'var(--border-color)',
                  backgroundColor: purgeMode === 'ALL_HQ' ? '#FEF2F2' : '#FFFFFF',
                  color: purgeMode === 'ALL_HQ' ? '#DC2626' : 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                Reset All HQ Stock
              </button>
            </div>
          </div>

          {/* Dynamic Input Form */}
          {purgeMode === 'RANGE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Prefix
                </label>
                <input
                  type="text"
                  className="input"
                  value={purgePrefix}
                  onChange={(e) => setPurgePrefix(e.target.value.toUpperCase())}
                  placeholder="VS"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Start Number
                </label>
                <input
                  type="number"
                  className="input"
                  value={purgeStart}
                  onChange={(e) => setPurgeStart(e.target.value)}
                  placeholder="101"
                  min="1"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  End Number
                </label>
                <input
                  type="number"
                  className="input"
                  value={purgeEnd}
                  onChange={(e) => setPurgeEnd(e.target.value)}
                  placeholder="200"
                  min="1"
                  required
                />
              </div>
            </div>
          )}

          {purgeMode === 'BATCH_ID' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Batch ID Code
              </label>
              <input
                type="text"
                className="input"
                value={purgeBatchId}
                onChange={(e) => setPurgeBatchId(e.target.value)}
                placeholder="e.g. BATCH-20260912-101"
                required
              />
            </div>
          )}

          {purgeMode === 'ALL_HQ' && (
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px dashed #F87171',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B' }}>
                Total Available HQ Stock: {stats.available} Cards
              </div>
              <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                All {stats.available} available unallocated cards in Vidhyut Saathi HQ Central Warehouse will be permanently deleted.
              </div>
            </div>
          )}

          {/* Quick Reason Pills */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Reason for Deletion
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                'Wrong stock entered by mistake',
                'Duplicate test series',
                'Serial numbering error',
                'Inventory reset to 0',
              ].map((reasonText) => (
                <button
                  key={reasonText}
                  type="button"
                  onClick={() => setPurgeReason(reasonText)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: purgeReason === reasonText ? '#E0F2FE' : '#F8FAFC',
                    color: purgeReason === reasonText ? '#0284C7' : '#475569',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {reasonText}
                </button>
              ))}
            </div>
            <textarea
              className="input"
              rows={2}
              style={{ resize: 'vertical' }}
              value={purgeReason}
              onChange={(e) => setPurgeReason(e.target.value)}
              placeholder="Type or select reason..."
              required
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPurgeModalOpen(false)}
              disabled={purgeLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={purgeLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#DC2626',
                borderColor: '#DC2626',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              }}
            >
              {purgeLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Purging...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>
                    {purgeMode === 'ALL_HQ'
                      ? `Reset All ${stats.available} HQ Cards`
                      : 'Confirm Purge Stock'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal 2: Delete Single Card (Super Admin Only) ─── */}
      <Modal
        isOpen={singleDeleteModalOpen}
        onClose={() => setSingleDeleteModalOpen(false)}
        title="Delete Stock Card"
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '14px',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: '600', textTransform: 'uppercase' }}>
              Are you sure you want to delete this card?
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '20px',
                fontWeight: '800',
                color: '#DC2626',
                letterSpacing: '1px',
                marginTop: '6px',
              }}
            >
              {targetCardToDelete?.serialNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
              Status: {targetCardToDelete?.status} • Location: Vidhyut Saathi HQ
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Reason for Deletion
            </label>
            <input
              type="text"
              className="form-input"
              value={singleDeleteReason}
              onChange={(e) => setSingleDeleteReason(e.target.value)}
              placeholder="e.g. Duplicate or wrong entry"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSingleDeleteModalOpen(false)}
              disabled={singleDeleteLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleSingleDelete}
              disabled={singleDeleteLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {singleDeleteLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal 3: View Full Range Serials & Partner Allocation Details ─── */}
      <Modal
        isOpen={rangeModalOpen && !!selectedRange}
        onClose={() => setRangeModalOpen(false)}
        title={
          selectedRange
            ? `Card Range: ${selectedRange.startSerial} ${selectedRange.startSerial !== selectedRange.endSerial ? `to ${selectedRange.endSerial}` : ''} (${selectedRange.totalCards} Cards)`
            : 'Card Range Details'
        }
        maxWidth="680px"
      >
        {selectedRange && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Range Overview Card */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current Owner / Franchise
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedRange.currentOwner?.fullName || 'Vidhyut Saathi HQ'}
                </div>
                {selectedRange.currentOwner?.franchiseId && (
                  <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: '600' }}>
                    {selectedRange.currentOwner.franchiseId} • {selectedRange.currentOwner.mobileNumber}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Franchise Level & Territory
                </div>
                <div style={{ marginTop: '2px' }}>
                  {selectedRange.currentOwner?.franchiseType ? (
                    <FranchiseTypeBadge type={selectedRange.currentOwner.franchiseType} />
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Central Warehouse</span>
                  )}
                </div>
                {selectedRange.currentOwner?.district && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                    <MapPin size={12} color="#64748B" />
                    <span>{selectedRange.currentOwner.district}, {selectedRange.currentOwner.state}</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Stock Status & Total Units
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <CardStatusBadge status={selectedRange.status} />
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                    }}
                  >
                    {selectedRange.totalCards} Units
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned / Allocated On
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '3px' }}>
                  {formatDate(selectedRange.assignedAt)}
                </div>
                {selectedRange.batchId && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Batch: {selectedRange.batchId}
                  </div>
                )}
              </div>
            </div>

            {/* Serial List Search & Copy Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '32px', fontSize: '12.5px', padding: '6px 10px 6px 32px' }}
                  placeholder="Filter serials within this range..."
                  value={rangeModalSearch}
                  onChange={(e) => setRangeModalSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  const allText = (selectedRange.serials || []).join('\n');
                  handleCopy(allText, e);
                  showToast(`All ${selectedRange.serials?.length || 0} serial numbers copied to clipboard!`, 'success');
                }}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              >
                <Copy size={13} />
                <span>Copy All Serials ({selectedRange.totalCards})</span>
              </button>
            </div>

            {/* Serials Chips Grid */}
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '12px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
              }}
            >
              {(selectedRange.serials || [])
                .filter((s) => (rangeModalSearch ? s.toLowerCase().includes(rangeModalSearch.toLowerCase().trim()) : true))
                .map((serial, idx) => {
                  const cardId = selectedRange.cardIds?.[idx] || selectedRange.firstCardId;
                  return (
                    <div
                      key={serial}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        color: '#0F172A',
                      }}
                    >
                      <Link
                        to={`/cards/${cardId}`}
                        style={{ color: '#0284C7', textDecoration: 'none' }}
                        title="Click to view single card details & audit history"
                        onClick={() => setRangeModalOpen(false)}
                      >
                        {serial}
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleCopy(serial, e)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: copiedId === serial ? '#16A34A' : '#94A3B8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Copy serial"
                      >
                        {copiedId === serial ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRangeModalOpen(false)}
                style={{ padding: '7px 20px' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CardInventoryPage;

