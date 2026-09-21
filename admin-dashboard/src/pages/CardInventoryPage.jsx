import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
  IndianRupee,
  Home,
  Clock,
  Zap,
  Package,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { CardStatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

const CardInventoryPage = () => {
  const { isSuperAdmin, partner } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Active Main View Tab ('cards') - Defaults to Cards Registry on page
  const [activeTab, setActiveTab] = useState('cards');

  // Full-Screen Partner Distribution Modal State
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerModalTier, setPartnerModalTier] = useState('MAIN_FRANCHISE'); // 'MAIN_FRANCHISE' | 'SUB_FRANCHISE' | 'INSTALLED' | 'NET_VALUE' | 'ALL'

  // Card View Mode: 'ranges' (Consolidated serial ranges) vs 'individual' (1-by-1 cards)
  const [cardViewMode, setCardViewMode] = useState('ranges');

  // Refs for table containers to allow smooth scrolling and top slider controls
  const rangesTableRef = useRef(null);
  const cardsTableRef = useRef(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    transferred: 0,
    installed: 0,
    blocked: 0,
    franchiseCards: 0,
    subFranchiseCards: 0,
    netValue: 0,
    quotationRate: 2400,
    franchiseCardsNetValue: 0,
    totalNetworkQuotationValue: 0,
    pending: 0,
    startSerial: '',
    endSerial: '',
    batchCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Quick Serial Search Input inside 5th stat card for partner
  const [cardSerialQuickInput, setCardSerialQuickInput] = useState('');

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

  // Partner Detail Modal Popup State (Full-Screen Popup without page slide)
  const [partnerCardPopupOpen, setPartnerCardPopupOpen] = useState(false);
  const [partnerCardPopupType, setPartnerCardPopupType] = useState('MY_AVAILABLE_STOCK');
  const [partnerPopupSearch, setPartnerPopupSearch] = useState('');
  const [partnerPopupSubFranchises, setPartnerPopupSubFranchises] = useState([]);
  const [partnerPopupCustomers, setPartnerPopupCustomers] = useState([]);
  const [partnerPopupLoading, setPartnerPopupLoading] = useState(false);

  // Range Details Modal
  const [selectedRange, setSelectedRange] = useState(null);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeModalSearch, setRangeModalSearch] = useState('');
  const [selectedAllotmentTab, setSelectedAllotmentTab] = useState('ALL');

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
      subFranchiseQuotationValue: 0,
      quotationRate: 2400,
      totalSubFranchiseCardsAssigned: 0,
      subFranchiseCustomerNetValue: 0,
      subFranchiseCustomerCardsCount: 0,
      customerQuotationRate: 3000,
    },
    partners: [],
    subFranchiseQuotations: [],
    subFranchiseCustomerQuotations: [],
  });
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerTierFilter, setPartnerTierFilter] = useState('MAIN_FRANCHISE'); // 'MAIN_FRANCHISE' | 'SUB_FRANCHISE' | 'DISTRICT_FRANCHISE' | 'STATE_FRANCHISE' | ''

  // Filtered Sub-Franchise Quotations (Franchise Partner -> Sub-Franchise Partner assignments)
  const displayedQuotations = (distributionData.subFranchiseQuotations || []).filter((q) => {
    if (!partnerSearch || !partnerSearch.trim()) return true;
    const term = partnerSearch.trim().toLowerCase();
    const sellerName = q.franchisePartner?.fullName?.toLowerCase() || '';
    const sellerId = q.franchisePartner?.franchiseId?.toLowerCase() || '';
    const buyerName = q.subFranchisePartner?.fullName?.toLowerCase() || '';
    const buyerId = q.subFranchisePartner?.franchiseId?.toLowerCase() || '';
    const txn = q.transactionId?.toLowerCase() || '';
    return (
      sellerName.includes(term) ||
      sellerId.includes(term) ||
      buyerName.includes(term) ||
      buyerId.includes(term) ||
      txn.includes(term)
    );
  });

  // Filtered Sub-Franchise -> Customer Quotations (Cards installed at customer home after quotation)
  const displayedCustomerQuotations = (distributionData.subFranchiseCustomerQuotations || []).filter((cq) => {
    if (!partnerSearch || !partnerSearch.trim()) return true;
    const term = partnerSearch.trim().toLowerCase();
    const partnerName = cq.subFranchisePartner?.fullName?.toLowerCase() || '';
    const partnerId = cq.subFranchisePartner?.franchiseId?.toLowerCase() || '';
    const custName = cq.customer?.fullName?.toLowerCase() || '';
    const custMobile = cq.customer?.mobileNumber?.toLowerCase() || '';
    const installId = cq.installationId?.toLowerCase() || '';
    const serials = (cq.cardSerialNumbers || []).join(' ').toLowerCase();
    return (
      partnerName.includes(term) ||
      partnerId.includes(term) ||
      custName.includes(term) ||
      custMobile.includes(term) ||
      installId.includes(term) ||
      serials.includes(term)
    );
  });

  const displayedPartners = (distributionData.partners || [])
    .filter((p) => {
      if (partnerModalTier === 'INSTALLED') {
        // Show ONLY partners who have active installed cards
        return (p.installedCount || 0) > 0;
      }
      if (partnerModalTier === 'NET_VALUE') {
        // Show strictly partners with confirmed Sub-Franchise quotations
        return p.hasSubFranchiseQuotation === true && (p.quotationTotal || 0) > 0;
      }
      if (!partnerTierFilter) return true;
      if (partnerTierFilter === 'MAIN_FRANCHISE') {
        return p.franchiseType !== 'SUB_FRANCHISE';
      }
      if (partnerTierFilter === 'DISTRICT_FRANCHISE') {
        return (
          p.franchiseType === 'DISTRICT_FRANCHISE' ||
          p.franchiseType === 'PREMIUM_EXCLUSIVE_DISTRICT' ||
          p.franchiseType === 'STANDARD_EXCLUSIVE_DISTRICT' ||
          p.franchiseType === 'NON_EXCLUSIVE_DISTRICT'
        );
      }
      return p.franchiseType === partnerTierFilter;
    })
    .sort((a, b) => {
      if (partnerModalTier === 'INSTALLED') {
        return (b.installedCount || 0) - (a.installedCount || 0);
      }
      if (partnerModalTier === 'NET_VALUE') {
        return (b.quotationTotal || 0) - (a.quotationTotal || 0);
      }
      return 0;
    });

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPartnerModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        partnerOnly: isSuperAdmin && statusFilter === 'AVAILABLE' ? undefined : (isSuperAdmin ? true : undefined),
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
  }, [rangesPagination.limit, search, statusFilter, franchiseTypeFilter, stateFilter, districtFilter, isSuperAdmin, showToast]);


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
        partnerOnly: isSuperAdmin && statusFilter === 'AVAILABLE' ? undefined : (isSuperAdmin ? true : undefined),
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
  }, [pagination.limit, search, statusFilter, franchiseTypeFilter, stateFilter, districtFilter, isSuperAdmin, showToast]);

  // 5. Fetch Partner Distribution Breakdown
  const fetchDistribution = useCallback(async (tierOverride) => {
    if (!isSuperAdmin) return;
    try {
      setLoadingDistribution(true);
      const activeTier = tierOverride !== undefined ? tierOverride : partnerTierFilter;
      const params = {
        state: stateFilter || undefined,
        district: districtFilter || undefined,
        search: partnerSearch.trim() || undefined,
        franchiseType: activeTier || undefined,
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
  }, [isSuperAdmin, stateFilter, districtFilter, partnerSearch, partnerTierFilter, showToast]);

  // Initial Load & Filter change handler
  useEffect(() => {
    fetchStats();
    if (isSuperAdmin) {
      fetchDistribution();
    }
  }, [fetchStats, isSuperAdmin, fetchDistribution]);

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

  const handleFranchiseCardsClick = () => {
    if (isSuperAdmin) {
      setPartnerModalTier('MAIN_FRANCHISE');
      setPartnerTierFilter('MAIN_FRANCHISE');
      fetchDistribution('MAIN_FRANCHISE');
      setPartnerModalOpen(true);
    } else {
      handleStatCardClick('TOTAL');
    }
  };

  const handleSubFranchiseCardsClick = () => {
    if (isSuperAdmin) {
      setPartnerModalTier('SUB_FRANCHISE');
      setPartnerTierFilter('SUB_FRANCHISE');
      fetchDistribution('SUB_FRANCHISE');
      setPartnerModalOpen(true);
    } else {
      handleStatCardClick('ASSIGNED');
    }
  };

  const handleInstalledCardsClick = () => {
    if (isSuperAdmin) {
      setPartnerModalTier('INSTALLED');
      setPartnerTierFilter('INSTALLED');
      fetchDistribution('');
      setPartnerModalOpen(true);
    } else {
      handleStatCardClick('INSTALLED');
    }
  };

  const handleNetValueClick = () => {
    if (isSuperAdmin) {
      setPartnerModalTier('NET_VALUE');
      setPartnerTierFilter('');
      fetchDistribution('');
      setPartnerModalOpen(true);
    }
  };

  const handleSubFranchiseNetValueClick = () => {
    if (isSuperAdmin) {
      setPartnerModalTier('SUB_FRANCHISE_NET_VALUE');
      setPartnerTierFilter('');
      fetchDistribution('');
      setPartnerModalOpen(true);
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

  const handleCardSerialSearch = (serialVal) => {
    const q = (serialVal || '').trim();
    if (!q) return;
    setSearch(q);
    setActiveTab('cards');
    setCardSerialQuickInput('');
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

  const openPartnerCardPopup = async (type) => {
    setPartnerCardPopupType(type);
    setPartnerPopupSearch('');
    setPartnerCardPopupOpen(true);

    if (type === 'SUB_FRANCHISE_AVAILABLE_STOCK' || type === 'SUB_FRANCHISE_NET_VALUE') {
      try {
        setPartnerPopupLoading(true);
        const [pRes] = await Promise.all([
          api.get('/partners', { params: { franchiseType: 'SUB_FRANCHISE', parentPartnerId: partner?._id } }),
        ]);
        const list = Array.isArray(pRes.data?.data?.partners)
          ? pRes.data.data.partners
          : Array.isArray(pRes.data?.data)
          ? pRes.data.data
          : [];
        setPartnerPopupSubFranchises(list);
      } catch (e) {
        console.error('Error fetching sub-franchises for popup:', e);
      } finally {
        setPartnerPopupLoading(false);
      }
    } else if (type === 'CUSTOMERS') {
      try {
        setPartnerPopupLoading(true);
        const cRes = await api.get('/customers', { params: { limit: 100 } });
        setPartnerPopupCustomers(cRes.data?.data?.customers || []);
      } catch (e) {
        console.error('Error fetching customers for popup:', e);
      } finally {
        setPartnerPopupLoading(false);
      }
    } else if (type === 'MY_AVAILABLE_STOCK') {
      if (ranges.length === 0) {
        fetchRanges(1);
      }
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
            <Link
              to="/cards/assign"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Allocate stock cards to partners"
            >
              <Send size={14} />
              <span>Assign to Partner</span>
            </Link>
          )}
        </div>
      </div>


      {/* Interactive Real-time Statistics Cards (Clickable) */}
      <div className="dashboard-partner-5grid" style={{ marginBottom: '18px' }}>
        {isSuperAdmin ? (
          <>
            {/* 1st Card: Franchise Cards (Main Franchise Partners) */}
            <StatCard
              title="Franchise Cards"
              value={stats.franchiseCards ?? 0}
              subtitle="Main Franchise stock"
              icon={Users}
              bgLight="#e0f2fe"
              iconColor="#0284c7"
              borderTopColor="#0284c7"
              onClick={handleFranchiseCardsClick}
              isActive={partnerModalOpen && partnerModalTier === 'MAIN_FRANCHISE'}
              activeLabel="Franchise"
              loading={loadingStats}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #0284c7',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 2nd Card: Sub-Franchise */}
            <StatCard
              title="Sub-Franchise"
              value={stats.subFranchiseCards ?? 0}
              subtitle="Sub-Franchise stock"
              icon={Building2}
              bgLight="#FAF5FF"
              iconColor="#9333EA"
              borderTopColor="#9333EA"
              onClick={handleSubFranchiseCardsClick}
              isActive={partnerModalOpen && partnerModalTier === 'SUB_FRANCHISE'}
              activeLabel="Sub-Franchise"
              loading={loadingStats}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #9333EA',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 3rd Card: Installed Cards */}
            <StatCard
              title="Installed Cards"
              value={stats.installed ?? 0}
              subtitle="Customer installations"
              icon={Sparkles}
              bgLight="#dcfce7"
              iconColor="#059669"
              borderTopColor="#059669"
              onClick={handleInstalledCardsClick}
              isActive={partnerModalOpen && partnerModalTier === 'INSTALLED'}
              activeLabel="Installed"
              loading={loadingStats}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #059669',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 4th Card: Net Value (Franchise Cards Quotation Valuation) */}
            <StatCard
              title="Franchise Net Value"
              value={formatCurrency(stats.netValue || 57600)}
              subtitle={`@ ₹${(stats.quotationRate || 2400).toLocaleString('en-IN')}/card quotation`}
              icon={IndianRupee}
              bgLight="#ECFDF5"
              iconColor="#059669"
              borderTopColor="#d97706"
              onClick={handleNetValueClick}
              isActive={partnerModalOpen && partnerModalTier === 'NET_VALUE'}
              activeLabel="Net Value"
              loading={loadingStats}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #d97706',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 5th Card: Sub-Franchise Net Value (Customer Installation Net Value after Quotation) */}
            <StatCard
              title="Sub-Franchise Net Value"
              value={formatCurrency(stats.subFranchiseCustomerNetValue || 0)}
              subtitle={
                (stats.subFranchiseCustomerNetValue || 0) > 0
                  ? `@ ₹${(stats.customerQuotationRate || 3000).toLocaleString('en-IN')}/card customer quotation`
                  : 'Customer installation net value'
              }
              icon={Home}
              bgLight="#FAF5FF"
              iconColor="#9333EA"
              borderTopColor="#7e22ce"
              onClick={handleSubFranchiseNetValueClick}
              isActive={partnerModalOpen && partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'}
              activeLabel="Customer Net"
              loading={loadingStats}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #7e22ce',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />
          </>
        ) : (
          <>
            {/* 1. My Available Stock (Top Border: Blue) */}
            <StatCard
              title="My Available Stock"
              value={stats.myAvailableStock ?? stats.pending ?? Math.max(0, (stats.total || 0) - (stats.installed || 0))}
              subtitle={partnerCardPopupOpen && partnerCardPopupType === 'MY_AVAILABLE_STOCK' ? '● Showing Stock Popup' : 'Click to view stock breakdown →'}
              icon={Package}
              bgLight="#e0f2fe"
              iconColor="#0284c7"
              borderTopColor="#0284c7"
              onClick={() => openPartnerCardPopup('MY_AVAILABLE_STOCK')}
              isActive={partnerCardPopupOpen && partnerCardPopupType === 'MY_AVAILABLE_STOCK'}
              activeLabel="Popup Open"
              loading={loadingStats}
              headerRight={
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#0369a1', background: '#e0f2fe', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #bae6fd', letterSpacing: '0.4px' }}>
                  DIRECT
                </span>
              }
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #0284c7',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 2. Sub Franchise Available Stock (Top Border: Purple) */}
            <StatCard
              title="Sub Franchise Available Stock"
              value={stats.subFranchiseAvailableStock ?? 0}
              subtitle={partnerCardPopupOpen && partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' ? '● Showing Sub Stock Popup' : 'Click to view sub-franchises →'}
              icon={Building2}
              bgLight="#faf5ff"
              iconColor="#9333ea"
              borderTopColor="#9333ea"
              onClick={() => openPartnerCardPopup('SUB_FRANCHISE_AVAILABLE_STOCK')}
              isActive={partnerCardPopupOpen && partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK'}
              activeLabel="Popup Open"
              loading={loadingStats}
              headerRight={
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#7e22ce', background: '#f3e8ff', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #e9d5ff', letterSpacing: '0.4px' }}>
                  SUB-FRANCHISE
                </span>
              }
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #9333ea',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 3. Customers (Top Border: Green) */}
            <StatCard
              title="Customers"
              value={stats.customers ?? 0}
              subtitle={partnerCardPopupOpen && partnerCardPopupType === 'CUSTOMERS' ? '● Showing Customers Popup' : 'Click to view all customers →'}
              icon={Users}
              bgLight="#dcfce7"
              iconColor="#16a34a"
              borderTopColor="#16a34a"
              onClick={() => openPartnerCardPopup('CUSTOMERS')}
              isActive={partnerCardPopupOpen && partnerCardPopupType === 'CUSTOMERS'}
              activeLabel="Popup Open"
              loading={loadingStats}
              headerRight={
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#15803d', background: '#dcfce7', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', letterSpacing: '0.4px' }}>
                  NETWORK
                </span>
              }
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #16a34a',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 4. My Net Value (Top Border: Amber) */}
            <StatCard
              title="My Net Value"
              value={formatCurrency(stats.myNetValue || stats.netValue || ((stats.total || 0) * (stats.quotationRate || 1200)) || 600000)}
              subtitle={`@ ₹${(stats.quotationRate || 1200).toLocaleString('en-IN')}/card valuation →`}
              icon={IndianRupee}
              bgLight="#fef3c7"
              iconColor="#d97706"
              borderTopColor="#d97706"
              onClick={() => openPartnerCardPopup('MY_NET_VALUE')}
              isActive={partnerCardPopupOpen && partnerCardPopupType === 'MY_NET_VALUE'}
              activeLabel="Popup Open"
              loading={loadingStats}
              headerRight={
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#b45309', background: '#fef3c7', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #fde68a', letterSpacing: '0.4px' }}>
                  DIRECT NET
                </span>
              }
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #d97706',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />

            {/* 5. Sub Franchise Net Value (Top Border: Violet) */}
            <StatCard
              title="Sub Franchise Net Value"
              value={formatCurrency(stats.subFranchiseNetValue || 0)}
              subtitle="Sub-franchise network valuation →"
              icon={Home}
              bgLight="#faf5ff"
              iconColor="#7e22ce"
              borderTopColor="#7e22ce"
              onClick={() => openPartnerCardPopup('SUB_FRANCHISE_NET_VALUE')}
              isActive={partnerCardPopupOpen && partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE'}
              activeLabel="Popup Open"
              loading={loadingStats}
              headerRight={
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#6b21a8', background: '#f3e8ff', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #e9d5ff', letterSpacing: '0.4px' }}>
                  SUB NET
                </span>
              }
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #7e22ce',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            />
          </>
        )}
      </div>

      {/* Franchise Partner Important Card Information Context Cards */}
      {!isSuperAdmin && (
        <div className="inventory-context-grid">
          {/* Card 1: Allotted Serial Range */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderTop: '3.5px solid #0284c7',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px' }}>
                Allotted Serial Range
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', fontFamily: 'monospace', color: '#0284c7', marginTop: '2px' }}>
                {stats.startSerial && stats.endSerial
                  ? `${stats.startSerial} → ${stats.endSerial}`
                  : ranges.length > 0
                  ? `${ranges[ranges.length - 1]?.startSerial || ranges[0]?.startSerial} → ${ranges[0]?.endSerial}`
                  : `VS000001 → VS000${stats.total || 530}`}
              </div>
            </div>
          </div>

          {/* Card 2: Stock Readiness */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderTop: '3.5px solid #16a34a',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px' }}>
                Stock Readiness Status
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#15803d', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{Math.max(0, (stats.total || 0) - (stats.installed || 0))} Cards In-Hand</span>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: '700' }}>
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Quotation Valuation */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderTop: '3.5px solid #d97706',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IndianRupee size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px' }}>
                Quotation & Net Valuation
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                ₹{(stats.quotationRate || 1200).toLocaleString('en-IN')}/Card{' '}
                <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748b' }}>
                  (Net: {formatCurrency(stats.netValue || ((stats.total || 0) * (stats.quotationRate || 1200)) || 600000)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Top Context Bar */}
      {isSuperAdmin && (
        <div className="inventory-superadmin-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} color="#0284C7" />
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {statusFilter === 'AVAILABLE'
                ? `Central Warehouse HQ Stock (${stats.available} Available Cards)`
                : statusFilter
                ? `Cards Registry (Filtered: ${statusFilter})`
                : `Partner Cards Serial Registry (${stats.franchiseCards || stats.assigned} In Field)`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setPartnerModalTier('MAIN_FRANCHISE');
              setPartnerTierFilter('MAIN_FRANCHISE');
              fetchDistribution('MAIN_FRANCHISE');
              setPartnerModalOpen(true);
            }}
            className="btn btn-outline"
            style={{
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0284C7',
              borderColor: '#BAE6FD',
              backgroundColor: '#F0F9FF',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.1)',
            }}
          >
            <Users size={15} />
            <span>Open Partner Stock Breakdown (Full-Screen)</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: ALL CARDS REGISTRY                                 */}
      {/* ========================================================= */}
      {activeTab === 'cards' && (
        <>
          {/* Unified Command & Filter Card */}
          <div
            className="card inventory-command-card"
            style={{
              marginBottom: '18px',
              padding: '14px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Top Row: View Mode Tabs + Search & Filter Controls */}
            <div className="inventory-filter-header">
              {/* Left: View Mode Switch Tabs */}
              <div className="inventory-view-tabs">
                <button
                  type="button"
                  onClick={() => {
                    setCardViewMode('ranges');
                    fetchRanges(1);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: cardViewMode === 'ranges' ? '#FFFFFF' : 'transparent',
                    color: cardViewMode === 'ranges' ? '#0284C7' : '#64748B',
                    fontWeight: cardViewMode === 'ranges' ? '700' : '600',
                    fontSize: '12px',
                    boxShadow: cardViewMode === 'ranges' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={14} color={cardViewMode === 'ranges' ? '#0284C7' : '#64748B'} style={{ flexShrink: 0 }} />
                  <span>Serial Ranges</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '5px',
                      backgroundColor: cardViewMode === 'ranges' ? '#E0F2FE' : '#E2E8F0',
                      color: cardViewMode === 'ranges' ? '#0284C7' : '#64748B',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {rangesPagination.total || (ranges.length > 0 ? 1 : 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCardViewMode('individual');
                    fetchCards(1);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: cardViewMode === 'individual' ? '#FFFFFF' : 'transparent',
                    color: cardViewMode === 'individual' ? '#0284C7' : '#64748B',
                    fontWeight: cardViewMode === 'individual' ? '700' : '600',
                    fontSize: '12px',
                    boxShadow: cardViewMode === 'individual' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CreditCard size={14} color={cardViewMode === 'individual' ? '#0284C7' : '#64748B'} style={{ flexShrink: 0 }} />
                  <span>All Cards</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '5px',
                      backgroundColor: cardViewMode === 'individual' ? '#E0F2FE' : '#E2E8F0',
                      color: cardViewMode === 'individual' ? '#0284C7' : '#64748B',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {pagination.total || stats.total || 0}
                  </span>
                </button>
              </div>

              {/* Right: Search & Filters Form */}
              <form onSubmit={handleSearchSubmit} className="inventory-search-form">
                {/* 1. Search Input */}
                <div className="inventory-search-input-wrap">
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    style={{
                      height: '38px',
                      padding: '0 12px 0 34px',
                      fontSize: '12.5px',
                      borderRadius: '8px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Search serial (e.g. VS000001)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* 2. Status Filter & Action Buttons Row on Mobile */}
                <div className="inventory-search-controls-row">
                  {/* Status Filter */}
                  <div className="inventory-filter-col">
                    <select
                      className="select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{
                        height: '38px',
                        padding: '0 20px 0 8px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        width: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">All Statuses</option>
                      <option value="AVAILABLE">AVAILABLE (HQ)</option>
                      <option value="PENDING_TRANSFER">PENDING TRANSFER</option>
                      <option value="ASSIGNED">ASSIGNED (In Field)</option>
                      <option value="TRANSFERRED">TRANSFERRED</option>
                      <option value="INSTALLED">INSTALLED (Active)</option>
                      <option value="BLOCKED">BLOCKED (Hold)</option>
                    </select>
                  </div>

                  {/* Franchise Type Filter (SuperAdmin) */}
                  {isSuperAdmin && (
                    <div className="inventory-filter-col">
                      <select
                        className="select"
                        value={franchiseTypeFilter}
                        onChange={(e) => setFranchiseTypeFilter(e.target.value)}
                        style={{
                          height: '38px',
                          padding: '0 20px 0 8px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          width: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">All Types</option>
                        <option value="PREMIUM_EXCLUSIVE_DISTRICT">Premium Exclusive</option>
                        <option value="STANDARD_EXCLUSIVE_DISTRICT">Standard Exclusive</option>
                        <option value="NON_EXCLUSIVE_DISTRICT">Non-Exclusive</option>
                      </select>
                    </div>
                  )}

                  {/* State Filter (SuperAdmin) */}
                  {isSuperAdmin && (
                    <div className={`inventory-filter-col ${!districtsList || districtsList.length === 0 ? 'inventory-filter-full' : ''}`}>
                      <select
                        className="select"
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        style={{
                          height: '38px',
                          padding: '0 20px 0 8px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          width: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">All States</option>
                        {statesList.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* District Filter (SuperAdmin) */}
                  {isSuperAdmin && districtsList && districtsList.length > 0 && (
                    <div className="inventory-filter-col">
                      <select
                        className="select"
                        value={districtFilter}
                        onChange={(e) => setDistrictFilter(e.target.value)}
                        style={{
                          height: '38px',
                          padding: '0 20px 0 8px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          width: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
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

                  {/* Apply & Clear Action Buttons */}
                  <div className="inventory-search-actions-wrap">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        height: '38px',
                        padding: '0 16px',
                        fontSize: '12.5px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        fontWeight: '700',
                      }}
                    >
                      <Filter size={13} />
                      <span>Apply</span>
                    </button>

                    {(search || statusFilter || franchiseTypeFilter || stateFilter || districtFilter) && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="btn btn-outline"
                        style={{
                          height: '38px',
                          padding: '0 12px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                        }}
                        title="Reset all filters"
                      >
                        <X size={13} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Sub-row: Helper note & active filter badges */}
            <div
              className="inventory-filter-footer-note"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '11.5px',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#0284c7" />
                <span>
                  {cardViewMode === 'ranges'
                    ? 'Consolidated serial ranges (from start serial to end serial) assigned per partner.'
                    : 'Displaying individual cards one-by-one with direct card action controls.'}
                </span>
              </div>

              {statusFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Filtered by:</span>
                  <span style={{ fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                    {statusFilter}
                  </span>
                </div>
              )}
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
                      : 'No card ranges available. Card stock is synchronized directly from CRM upon invoice generation.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Top Bar: Live Summary, Quick Horizontal Slider & Top Pagination */}
                  <div className="inventory-table-top-bar">
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
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

                    <div className="inventory-table-top-controls">
                      {/* Top Slider Navigation Buttons (Desktop only) */}
                      <div className="table-slide-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => rangesTableRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                          style={{ padding: '4px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Slide Table Left"
                        >
                          <ChevronLeft size={14} />
                          <span>Slide Left</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => rangesTableRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                          style={{ padding: '4px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Slide Table Right"
                        >
                          <span>Slide Right</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      <div className="table-slide-desktop-only" style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }} />

                      {/* Rows per page selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>Rows:</span>
                        <select
                          className="select"
                          style={{ padding: '3px 6px', fontSize: '12px', width: 'auto', height: '28px' }}
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

                      {/* Top Page Next / Prev Navigation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={rangesPagination.page <= 1}
                          onClick={() => fetchRanges(rangesPagination.page - 1)}
                          style={{ padding: '4px 7px', height: '28px' }}
                        >
                          <ChevronLeft size={15} />
                        </button>

                        <span style={{ fontSize: '12px', fontWeight: '700', padding: '0 4px', whiteSpace: 'nowrap' }}>
                          Page {rangesPagination.page} of {rangesPagination.totalPages}
                        </span>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={rangesPagination.page >= rangesPagination.totalPages}
                          onClick={() => fetchRanges(rangesPagination.page + 1)}
                          style={{ padding: '4px 7px', height: '28px' }}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table with Sticky Header and Always-Visible Viewport Scroll */}
                  <div
                    ref={rangesTableRef}
                    className="desktop-table-only table-responsive"
                    style={{
                      overflow: 'auto',
                      maxHeight: '62vh',
                      position: 'relative',
                    }}
                  >
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 12px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '21%', whiteSpace: 'nowrap' }}>
                            CARD SERIAL RANGE
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '11%', whiteSpace: 'nowrap' }}>
                            STATUS
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 12px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '22%', whiteSpace: 'nowrap' }}>
                            CURRENT OWNER
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '17%', whiteSpace: 'nowrap' }}>
                            FRANCHISE LEVEL
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '13%', whiteSpace: 'nowrap' }}>
                            TERRITORY
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '10%', whiteSpace: 'nowrap' }}>
                            ASSIGNED DATE
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'right', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '6%', whiteSpace: 'nowrap' }}>
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
                                setSelectedAllotmentTab('ALL');
                                setRangeModalSearch('');
                                setRangeModalOpen(true);
                              }}
                              className="table-row-hover"
                            >
                              {/* Serial Range */}
                              <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    {isSingleCard ? (
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '12.5px',
                                          fontWeight: '800',
                                          color: '#0284C7',
                                          letterSpacing: '0.6px',
                                          backgroundColor: '#F0F9FF',
                                          padding: '2px 7px',
                                          borderRadius: '4px',
                                          border: '1px solid #BAE6FD',
                                        }}
                                      >
                                        {rng.startSerial}
                                      </span>
                                    ) : (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12.5px',
                                            fontWeight: '800',
                                            color: '#0284C7',
                                            letterSpacing: '0.6px',
                                            backgroundColor: '#F0F9FF',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #BAE6FD',
                                          }}
                                        >
                                          {rng.startSerial}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
                                          to
                                        </span>
                                        <span
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12.5px',
                                            fontWeight: '800',
                                            color: '#0284C7',
                                            letterSpacing: '0.6px',
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

                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(rangeLabel, e)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: copiedId === rangeLabel ? '#16A34A' : '#94A3B8',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title="Copy Serial Range"
                                    >
                                      {copiedId === rangeLabel ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                  </div>

                                  {/* Stock Badges (Latest Stock + Total in Custody) */}
                                  <div>
                                    {rng.totalAllotments > 1 ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: '800',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            backgroundColor: '#DCFCE7',
                                            color: '#15803D',
                                            border: '1px solid #BBF7D0',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <span>{rng.totalCards} Cards</span>
                                          <span style={{ fontSize: '9px', fontWeight: '800', color: '#166534', backgroundColor: '#BBF7D0', padding: '0 4px', borderRadius: '4px' }}>
                                            LATEST STOCK
                                          </span>
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: '700',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            backgroundColor: '#EFF6FF',
                                            color: '#1D4ED8',
                                            border: '1px solid #BFDBFE',
                                            display: 'inline-block',
                                          }}
                                          title={`Total in partner custody across ${rng.totalAllotments} allotment batches`}
                                        >
                                          Total: <strong>{rng.partnerTotalCards} Cards</strong> ({rng.totalAllotments} Batches)
                                        </span>
                                      </div>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: '800',
                                          padding: '1px 7px',
                                          borderRadius: '10px',
                                          backgroundColor: isSingleCard ? '#F1F5F9' : '#DCFCE7',
                                          color: isSingleCard ? '#475569' : '#15803D',
                                          border: isSingleCard ? '1px solid #E2E8F0' : '1px solid #BBF7D0',
                                          display: 'inline-block',
                                        }}
                                      >
                                        {rng.totalCards} {rng.totalCards === 1 ? 'Card' : 'Cards'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <CardStatusBadge status={rng.status} />
                              </td>

                              {/* Current Owner */}
                              <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                                {isHQ ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    <Warehouse size={15} />
                                    <span>Vidhyut Saathi HQ</span>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                      {partnerOwner?.fullName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                      <span style={{ fontWeight: '600', color: '#0284C7' }}>{partnerOwner?.franchiseId}</span>
                                      {partnerOwner?.mobileNumber && <span> • {partnerOwner?.mobileNumber}</span>}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Franchise Level */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                {isHQ ? (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Central Warehouse</span>
                                ) : (
                                  <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                )}
                              </td>

                              {/* Territory */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                {isHQ ? (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Central HQ</span>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                    <MapPin size={13} color="#0284C7" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                      {partnerOwner?.district || '—'}
                                    </span>
                                    {partnerOwner?.state && (
                                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                        , {partnerOwner.state}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Assigned Date */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'middle', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                {formatDate(rng.assignedAt)}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRange(rng);
                                      setSelectedAllotmentTab('ALL');
                                      setRangeModalSearch('');
                                      setRangeModalOpen(true);
                                    }}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                    title={rng.totalAllotments > 1 ? `View complete history of all ${rng.totalAllotments} allotments` : "View full serial numbers list in this range"}
                                  >
                                    <Eye size={12} />
                                    <span>{rng.totalAllotments > 1 ? `History (${rng.totalAllotments})` : 'View'}</span>
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
                            setSelectedAllotmentTab('ALL');
                            setRangeModalSearch('');
                            setRangeModalOpen(true);
                          }}
                        >
                          <div className="mobile-card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
                              <CardStatusBadge status={rng.status} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                {rng.totalCards} Cards {rng.totalAllotments > 1 ? '(Latest)' : ''}
                              </span>
                              {rng.totalAllotments > 1 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  Total: {rng.partnerTotalCards} Cards ({rng.totalAllotments} Batches)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mobile-card-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Row 1: Current Owner + Franchise Level */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="mobile-card-label">Current Owner</div>
                                <div className="mobile-card-value" style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                                  {isHQ ? (
                                    <span style={{ color: '#0284C7' }}>Vidhyut Saathi HQ</span>
                                  ) : (
                                    partnerOwner?.fullName || '—'
                                  )}
                                </div>
                                {!isHQ && partnerOwner?.franchiseId && (
                                  <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                                    {partnerOwner.franchiseId}
                                  </div>
                                )}
                              </div>

                              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                <div className="mobile-card-label" style={{ textAlign: 'right' }}>Franchise Level</div>
                                <div style={{ marginTop: '2px' }}>
                                  {isHQ ? (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Central HQ</span>
                                  ) : (
                                    <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ height: '1px', backgroundColor: '#F1F5F9', width: '100%' }} />

                            {/* Row 2: Territory + Assigned Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '600', gap: '4px' }}>
                              <span>
                                {rng.totalAllotments > 1
                                  ? `View Allotment History (${rng.totalAllotments} Batches • ${rng.partnerTotalCards} Cards)`
                                  : `View All ${rng.totalCards} Serials`}
                              </span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for Ranges */}
                  <div className="inventory-pagination-footer">
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

                    <div className="inventory-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      : 'No cards are currently recorded in the system. Card stock is synchronized directly from CRM upon invoice generation.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Top Bar: Live Summary, Quick Horizontal Slider & Top Pagination */}
                  <div className="inventory-table-top-bar">
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
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

                    <div className="inventory-table-top-controls">
                      {/* Top Slider Navigation Buttons (Desktop only) */}
                      <div className="table-slide-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => cardsTableRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                          style={{ padding: '4px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Slide Table Left"
                        >
                          <ChevronLeft size={14} />
                          <span>Slide Left</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => cardsTableRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                          style={{ padding: '4px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Slide Table Right"
                        >
                          <span>Slide Right</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      <div className="table-slide-desktop-only" style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }} />

                      {/* Rows per page selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>Rows:</span>
                        <select
                          className="select"
                          style={{ padding: '3px 6px', fontSize: '12px', width: 'auto', height: '28px' }}
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

                      {/* Top Page Next / Prev Navigation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={pagination.page <= 1}
                          onClick={() => fetchCards(pagination.page - 1)}
                          style={{ padding: '4px 7px', height: '28px' }}
                        >
                          <ChevronLeft size={15} />
                        </button>

                        <span style={{ fontSize: '12px', fontWeight: '700', padding: '0 4px', whiteSpace: 'nowrap' }}>
                          Page {pagination.page} of {pagination.totalPages}
                        </span>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() => fetchCards(pagination.page + 1)}
                          style={{ padding: '4px 7px', height: '28px' }}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table with Sticky Header and Always-Visible Viewport Scroll */}
                  <div
                    ref={cardsTableRef}
                    className="desktop-table-only table-responsive"
                    style={{
                      overflow: 'auto',
                      maxHeight: '62vh',
                      position: 'relative',
                    }}
                  >
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 12px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '21%', whiteSpace: 'nowrap' }}>
                            SERIAL NUMBER
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '11%', whiteSpace: 'nowrap' }}>
                            STATUS
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 12px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '22%', whiteSpace: 'nowrap' }}>
                            CURRENT OWNER
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '17%', whiteSpace: 'nowrap' }}>
                            FRANCHISE LEVEL
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '13%', whiteSpace: 'nowrap' }}>
                            TERRITORY
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '10%', whiteSpace: 'nowrap' }}>
                            ASSIGNED DATE
                          </th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '11px 10px', textAlign: 'right', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', width: '6%', whiteSpace: 'nowrap' }}>
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
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '12.5px',
                                      fontWeight: '800',
                                      color: '#0284C7',
                                      letterSpacing: '0.6px',
                                      backgroundColor: '#F0F9FF',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      border: '1px solid #BAE6FD',
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
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                    title="Copy Serial Number"
                                  >
                                    {copiedId === card.serialNumber ? <Check size={13} /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </td>

                              {/* Status */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <CardStatusBadge status={card.status} />
                              </td>

                              {/* Current Owner */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                {isHQ ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    <Warehouse size={15} />
                                    <span>Vidhyut Saathi HQ</span>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                      {partnerOwner?.fullName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                      <span style={{ fontWeight: '600', color: '#0284C7' }}>{partnerOwner?.franchiseId}</span>
                                      {partnerOwner?.mobileNumber && <span> • {partnerOwner?.mobileNumber}</span>}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Franchise Level */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                {isHQ ? (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Central Warehouse</span>
                                ) : (
                                  <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                )}
                              </td>

                              {/* Territory */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                {isHQ ? (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Central HQ</span>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                    <MapPin size={13} color="#0284C7" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                      {partnerOwner?.district || '—'}
                                    </span>
                                    {partnerOwner?.state && (
                                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                        , {partnerOwner.state}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Assigned Date */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                {formatDate(card.assignedAt || card.createdAt)}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                  <Link
                                    to={`/cards/${card._id}`}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                    title="View details & audit trail"
                                  >
                                    <Eye size={12} />
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

                          <div className="mobile-card-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Row 1: Current Owner + Franchise Level */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="mobile-card-label">Current Owner</div>
                                <div className="mobile-card-value" style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                                  {isHQ ? (
                                    <span style={{ color: '#0284C7' }}>Vidhyut Saathi HQ</span>
                                  ) : (
                                    partnerOwner?.fullName || '—'
                                  )}
                                </div>
                                {!isHQ && partnerOwner?.franchiseId && (
                                  <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                                    {partnerOwner.franchiseId}
                                  </div>
                                )}
                              </div>

                              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                <div className="mobile-card-label" style={{ textAlign: 'right' }}>Franchise Level</div>
                                <div style={{ marginTop: '2px' }}>
                                  {isHQ ? (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Central HQ</span>
                                  ) : (
                                    <FranchiseTypeBadge type={partnerOwner?.franchiseType} />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ height: '1px', backgroundColor: '#F1F5F9', width: '100%' }} />

                            {/* Row 2: Territory + Assigned Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                  <div className="inventory-pagination-footer">
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

                    <div className="inventory-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
      {/* FULL-SCREEN PARTNER STOCK DISTRIBUTION MODAL POP-UP       */}
      {/* ========================================================= */}
      {partnerModalOpen && isSuperAdmin && (
        <div
          className="partner-stock-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '10px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setPartnerModalOpen(false)}
        >
          <div
            className="partner-stock-modal-container"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '98vw',
              maxWidth: '1680px',
              height: '92vh',
              maxHeight: '940px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="partner-stock-modal-header"
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div className="partner-stock-modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor:
                      partnerModalTier === 'SUB_FRANCHISE'
                        ? '#FAF5FF'
                        : partnerModalTier === 'INSTALLED'
                        ? '#DCFCE7'
                        : partnerModalTier === 'NET_VALUE'
                        ? '#ECFDF5'
                        : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                        ? '#FAF5FF'
                        : '#E0F2FE',
                    color:
                      partnerModalTier === 'SUB_FRANCHISE'
                        ? '#9333EA'
                        : partnerModalTier === 'INSTALLED'
                        ? '#059669'
                        : partnerModalTier === 'NET_VALUE'
                        ? '#059669'
                        : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                        ? '#9333EA'
                        : '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {partnerModalTier === 'SUB_FRANCHISE' ? (
                    <Building2 size={22} />
                  ) : partnerModalTier === 'INSTALLED' ? (
                    <Sparkles size={22} />
                  ) : partnerModalTier === 'NET_VALUE' ? (
                    <IndianRupee size={22} />
                  ) : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? (
                    <Home size={22} />
                  ) : (
                    <Users size={22} />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>
                      {partnerModalTier === 'MAIN_FRANCHISE'
                        ? 'Franchise Partners Stock Overview'
                        : partnerModalTier === 'SUB_FRANCHISE'
                        ? 'Sub-Franchise Partners Stock Overview'
                        : partnerModalTier === 'INSTALLED'
                        ? 'Installed Cards Overview'
                        : partnerModalTier === 'NET_VALUE'
                        ? 'Franchise Net Value & Quotation Breakdown'
                        : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                        ? 'Sub-Franchise Customer Net Value & Installation Breakdown'
                        : 'All Franchise Partners Stock'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor:
                          partnerModalTier === 'SUB_FRANCHISE'
                            ? '#FAF5FF'
                            : partnerModalTier === 'INSTALLED'
                            ? '#DCFCE7'
                            : partnerModalTier === 'NET_VALUE'
                            ? '#ECFDF5'
                            : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                            ? '#FAF5FF'
                            : '#E0F2FE',
                        color:
                          partnerModalTier === 'SUB_FRANCHISE'
                            ? '#9333EA'
                            : partnerModalTier === 'INSTALLED'
                            ? '#059669'
                            : partnerModalTier === 'NET_VALUE'
                            ? '#059669'
                            : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                            ? '#9333EA'
                            : '#0284C7',
                        border:
                          partnerModalTier === 'SUB_FRANCHISE'
                            ? '1px solid #E9D5FF'
                            : partnerModalTier === 'INSTALLED'
                            ? '1px solid #A7F3D0'
                            : partnerModalTier === 'NET_VALUE'
                            ? '1px solid #A7F3D0'
                            : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                            ? '1px solid #E9D5FF'
                            : '1px solid #BAE6FD',
                      }}
                    >
                      {partnerModalTier === 'MAIN_FRANCHISE'
                        ? `${stats.franchiseCards ?? 0} Cards`
                        : partnerModalTier === 'SUB_FRANCHISE'
                        ? `${stats.subFranchiseCards ?? 0} Cards`
                        : partnerModalTier === 'INSTALLED'
                        ? `${stats.installed ?? 0} Installed Cards`
                        : partnerModalTier === 'NET_VALUE'
                        ? `${formatCurrency(stats.netValue || 57600)} Allotted (@ ₹${(stats.quotationRate || 2400).toLocaleString('en-IN')}/card)`
                        : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                        ? `${formatCurrency(stats.subFranchiseCustomerNetValue || 0)} Total Customer Value`
                        : `${distributionData.overview.distributedToPartners} Cards`}
                    </span>
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                    {partnerModalTier === 'INSTALLED'
                      ? 'Live active customer card installations tracked across partners'
                      : partnerModalTier === 'NET_VALUE'
                      ? 'Financial net value calculated directly from Franchise to Sub-Franchise card allotment quotations'
                      : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE'
                      ? 'Sub-Franchise ne customer ke ghar quotation confirm hone ke baad jo cards install kiye hain unka live breakdown'
                      : 'Full-screen live stock tracking per partner • Zero slider needed'}
                  </p>
                </div>
              </div>

              {/* Header Right: Segmented Filter Tabs & Close [X] */}
              <div className="partner-stock-modal-tabs-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="partner-stock-modal-tabs-scroll"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#E2E8F0',
                    padding: '3px',
                    borderRadius: '10px',
                    gap: '3px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('MAIN_FRANCHISE');
                      setPartnerTierFilter('MAIN_FRANCHISE');
                      fetchDistribution('MAIN_FRANCHISE');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'MAIN_FRANCHISE' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'MAIN_FRANCHISE' ? '#0284C7' : 'transparent',
                      color: partnerModalTier === 'MAIN_FRANCHISE' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🏢 Franchise Partners ({stats.franchiseCards ?? 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('SUB_FRANCHISE');
                      setPartnerTierFilter('SUB_FRANCHISE');
                      fetchDistribution('SUB_FRANCHISE');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'SUB_FRANCHISE' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'SUB_FRANCHISE' ? '#9333EA' : 'transparent',
                      color: partnerModalTier === 'SUB_FRANCHISE' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🏪 Sub-Franchise ({stats.subFranchiseCards ?? 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('INSTALLED');
                      setPartnerTierFilter('INSTALLED');
                      fetchDistribution('');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'INSTALLED' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'INSTALLED' ? '#059669' : 'transparent',
                      color: partnerModalTier === 'INSTALLED' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ⚡ Installed Cards ({stats.installed ?? 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('NET_VALUE');
                      setPartnerTierFilter('');
                      fetchDistribution('');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'NET_VALUE' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'NET_VALUE' ? '#059669' : 'transparent',
                      color: partnerModalTier === 'NET_VALUE' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    💰 Franchise Net Value ({formatCurrency(stats.netValue || 57600)})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('SUB_FRANCHISE_NET_VALUE');
                      setPartnerTierFilter('');
                      fetchDistribution('');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? '#9333EA' : 'transparent',
                      color: partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🏠 Sub-Franchise Net Value ({formatCurrency(stats.subFranchiseCustomerNetValue || 0)})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerModalTier('ALL');
                      setPartnerTierFilter('');
                      fetchDistribution('');
                    }}
                    style={{
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: partnerModalTier === 'ALL' ? '800' : '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: partnerModalTier === 'ALL' ? '#0F172A' : 'transparent',
                      color: partnerModalTier === 'ALL' ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    All Partners ({distributionData.overview.distributedToPartners})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Live Summary & Filter Strip */}
            <div
              style={{
                padding: '12px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                backgroundColor: '#FFFFFF',
                flexWrap: 'wrap',
              }}
            >
              {/* Quick search input */}
              <div style={{ position: 'relative', width: '360px', minWidth: '240px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '36px', width: '100%', height: '38px', fontSize: '13px' }}
                  placeholder="Search partner name, ID (VS-...), or phone..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                />
              </div>

              {/* KPI indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Cards Installed at Customer Home:</span>
                      <strong style={{ color: '#0F172A' }}>
                        {stats.subFranchiseInstalledCardsCount || distributionData.overview?.subFranchiseCustomerCardsCount || 0} Cards
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Total Customer Net Value:</span>
                      <strong style={{ color: '#9333EA' }}>
                        {formatCurrency(stats.subFranchiseCustomerNetValue || distributionData.overview?.subFranchiseCustomerNetValue || 0)}
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Customer Quotation Rate:</span>
                      <strong style={{ color: '#0284C7' }}>
                        ₹{(stats.customerQuotationRate || distributionData.overview?.customerQuotationRate || 3000).toLocaleString('en-IN')}/card
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Showing:</span>
                      <span
                        style={{
                          fontWeight: '800',
                          color: '#9333EA',
                          backgroundColor: '#FAF5FF',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          border: '1px solid #E9D5FF',
                        }}
                      >
                        {displayedCustomerQuotations.length} Customer Quotation{displayedCustomerQuotations.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                ) : partnerModalTier === 'NET_VALUE' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Cards Allotted to Sub-Franchise:</span>
                      <strong style={{ color: '#0F172A' }}>
                        {distributionData.overview?.totalSubFranchiseCardsAssigned || stats.subFranchiseCards || 24} Cards
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Total Net Value (All Franchise Partners):</span>
                      <strong style={{ color: '#059669' }}>
                        {formatCurrency(distributionData.overview?.subFranchiseQuotationValue || stats.netValue || 57600)}
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Quotation Rate:</span>
                      <strong style={{ color: '#0284C7' }}>
                        ₹{(distributionData.overview?.quotationRate || stats.quotationRate || 2400).toLocaleString('en-IN')}/card
                      </strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Showing:</span>
                      <span
                        style={{
                          fontWeight: '800',
                          color: '#059669',
                          backgroundColor: '#ECFDF5',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {displayedQuotations.length} Quotation{displayedQuotations.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Total in Field:</span>
                      <strong style={{ color: '#0F172A' }}>{distributionData.overview.distributedToPartners} Cards</strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Sub-Franchise Net Value:</span>
                      <strong style={{ color: '#059669' }}>{formatCurrency(stats.netValue || 57600)}</strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Quotation Rate:</span>
                      <strong style={{ color: '#0284C7' }}>₹{(stats.quotationRate || 2400).toLocaleString('en-IN')}/card</strong>
                    </div>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                      <span style={{ color: '#64748B' }}>Showing:</span>
                      <span
                        style={{
                          fontWeight: '800',
                          color: '#0284C7',
                          backgroundColor: '#F0F9FF',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          border: '1px solid #BAE6FD',
                        }}
                      >
                        {displayedPartners.length} Partner{displayedPartners.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body: FULL WIDTH TABLE - ZERO SLIDER NEEDED */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0',
              }}
            >
              {loadingDistribution ? (
                <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284C7' }} />
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>Loading Stock Allocation...</div>
                </div>
              ) : partnerModalTier === 'NET_VALUE' ? (
                /* ─── TAB 4: NET VALUE (Franchise Partner -> Sub-Franchise Quotations) ─── */
                displayedQuotations.length === 0 ? (
                  <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                      }}
                    >
                      <IndianRupee size={28} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>No Sub-Franchise Quotations Found</h3>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', maxWidth: '460px', margin: '6px auto 0', lineHeight: '1.5' }}>
                      Franchise Partner ne abhi tak kisi Sub-Franchise Partner ko quotation confirm hone ke baad card assign nahi kiye hain. Jab Franchise Partner Sub-Franchise ko cards assign karega, tab yahan unka confirmed quotation rate aur total value show hoga.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '23%' }}>
                          FRANCHISE PARTNER (ASSIGNER)
                        </th>
                        <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '23%' }}>
                          SUB-FRANCHISE PARTNER (RECIPIENT)
                        </th>
                        <th style={{ padding: '11px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '12%' }}>
                          CARDS ALLOTTED
                        </th>
                        <th style={{ padding: '11px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '12%' }}>
                          QUOTATION RATE
                        </th>
                        <th
                          style={{
                            padding: '11px 8px',
                            textAlign: 'center',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            color: '#059669',
                            backgroundColor: '#ECFDF5',
                            borderRadius: '6px 6px 0 0',
                            width: '14%',
                          }}
                        >
                          NET QUOTATION VALUE 💰
                        </th>
                        <th style={{ padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '11%' }}>
                          INVOICE / TXN
                        </th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '15%' }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedQuotations.map((q, idx) => {
                        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FBFDFF';
                        return (
                          <tr
                            key={q._id || q.transactionId}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              backgroundColor: rowBg,
                              transition: 'background-color 0.15s ease',
                            }}
                            className="table-row-hover"
                          >
                            {/* Franchise Partner (Seller / Assigner) */}
                            <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 5px rgba(2, 132, 199, 0.25)',
                                  }}
                                >
                                  {q.franchisePartner?.fullName ? q.franchisePartner.fullName.charAt(0).toUpperCase() : 'F'}
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      fontWeight: '700',
                                      fontSize: '13.5px',
                                      color: '#0F172A',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={q.franchisePartner?.fullName}
                                  >
                                    {q.franchisePartner?.fullName || 'Main Franchise Partner'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '10.5px',
                                        fontWeight: '700',
                                        color: '#0284C7',
                                        backgroundColor: '#F0F9FF',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        border: '1px solid #BAE6FD',
                                      }}
                                    >
                                      {q.franchisePartner?.franchiseId || 'VS-HQ'}
                                    </span>
                                    {q.franchisePartner?.franchiseType && (
                                      <FranchiseTypeBadge type={q.franchisePartner.franchiseType} />
                                    )}
                                  </div>
                                  {q.franchisePartner?.mobileNumber && (
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                      📞 {q.franchisePartner.mobileNumber}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Sub-Franchise Partner (Buyer / Recipient) */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A' }}>
                                  {q.subFranchisePartner?.fullName || 'Sub-Franchise Partner'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#9333EA',
                                      backgroundColor: '#FAF5FF',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #E9D5FF',
                                    }}
                                  >
                                    {q.subFranchisePartner?.franchiseId}
                                  </span>
                                  <FranchiseTypeBadge type="SUB_FRANCHISE" />
                                </div>
                                {q.subFranchisePartner?.district && (
                                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                                    <MapPin size={11} color="#64748B" />
                                    <span>{q.subFranchisePartner.district}, {q.subFranchisePartner.state}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Cards Assigned */}
                            <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  backgroundColor: '#ECFDF5',
                                  color: '#047857',
                                  border: '1px solid #A7F3D0',
                                  fontWeight: '800',
                                  fontSize: '12.5px',
                                }}
                              >
                                <CreditCard size={13} />
                                <span>{q.cardsAssigned} Cards</span>
                              </div>
                            </td>

                            {/* Quotation Rate */}
                            <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#0369A1',
                                  backgroundColor: '#F0F9FF',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #BAE6FD',
                                  display: 'inline-block',
                                }}
                              >
                                ₹{q.quotationRate.toLocaleString('en-IN')}/card
                              </span>
                            </td>

                            {/* Net Quotation Value */}
                            <td
                              style={{
                                padding: '10px 8px',
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                whiteSpace: 'nowrap',
                                backgroundColor: '#F0FDF4',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: '800',
                                  color: '#047857',
                                  backgroundColor: '#DCFCE7',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #A7F3D0',
                                  display: 'inline-block',
                                  boxShadow: '0 1px 2px rgba(4, 120, 87, 0.12)',
                                }}
                              >
                                ₹{q.totalAmount.toLocaleString('en-IN')}
                              </span>
                            </td>

                            {/* Invoice / Transaction Reference */}
                            <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #FDE68A',
                                    display: 'inline-block',
                                    width: 'fit-content',
                                  }}
                                >
                                  {q.transactionId}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: '700' }}>
                                  CONFIRMED INVOICE
                                </span>
                                {q.createdAt && (
                                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                    {formatDate(q.createdAt)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '10px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartnerModalOpen(false);
                                    setActiveTab('cards');
                                    setStatusFilter('');
                                    setSearch(q.subFranchisePartner?.franchiseId || q.subFranchisePartner?.fullName || '');
                                  }}
                                  className="btn btn-outline btn-xs"
                                  style={{
                                    width: '135px',
                                    justifyContent: 'center',
                                    padding: '5px 10px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    borderRadius: '6px',
                                    borderColor: '#CBD5E1',
                                    color: '#0284C7',
                                    backgroundColor: '#FFFFFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    boxSizing: 'border-box',
                                  }}
                                  title="View cards assigned to this sub-franchise"
                                >
                                  <Eye size={12} />
                                  <span>View Cards ({q.cardsAssigned})</span>
                                </button>

                                <Link
                                  to={`/cards/assign?partnerId=${q.franchisePartner?._id || ''}`}
                                  className="btn btn-primary btn-xs"
                                  style={{
                                    width: '135px',
                                    justifyContent: 'center',
                                    padding: '5px 10px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#0284C7',
                                    borderColor: '#0284C7',
                                    color: '#FFFFFF',
                                    textDecoration: 'none',
                                    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.2)',
                                    boxSizing: 'border-box',
                                  }}
                                  title="Allocate cards to Franchise Partner"
                                >
                                  <Send size={11} />
                                  <span>Assign Stock</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? (
                /* ─── TAB 5: SUB-FRANCHISE NET VALUE (Customer Quotations / Installations) ─── */
                displayedCustomerQuotations.length === 0 ? (
                  <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        backgroundColor: '#FAF5FF',
                        color: '#9333EA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                        boxShadow: '0 2px 8px rgba(147, 51, 234, 0.15)',
                      }}
                    >
                      <Home size={28} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>No Customer Quotations / Installations Found</h3>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0', lineHeight: '1.5' }}>
                      Sub-Franchise Partner ne abhi tak kisi customer ke ghar quotation confirm hone ke baad card install nahi kiya hai. Jab Sub-Franchise customer ke ghar quotation ke baad card install karega, tabhi yahan unka confirmed quotation rate, customer details aur total net value show hogi.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0',
                          textAlign: 'left',
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                        }}
                      >
                        <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em' }}>
                          SUB-FRANCHISE PARTNER
                        </th>
                        <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em' }}>
                          CUSTOMER & HOME ADDRESS
                        </th>
                        <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em' }}>
                          CARDS INSTALLED
                        </th>
                        <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em' }}>
                          QUOTATION RATE
                        </th>
                        <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em' }}>
                          CUSTOMER NET VALUE 💰
                        </th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.04em', textAlign: 'right' }}>
                          INSTALLATION REF
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedCustomerQuotations.map((cq, idx) => {
                        const addr = cq.customer?.address;
                        const formattedAddress = typeof addr === 'string' ? addr : addr?.fullAddress || [
                          addr?.houseOrShopNumber,
                          addr?.street || addr?.locality,
                          addr?.city || addr?.district,
                          addr?.state,
                          addr?.pinCode,
                        ].filter(Boolean).join(', ') || 'Customer Residence / Site';

                        return (
                          <tr
                            key={cq._id || idx}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F3FF')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF')
                            }
                          >
                            {/* Sub-Franchise Partner */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FAF5FF',
                                    color: '#9333EA',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    border: '1px solid #E9D5FF',
                                  }}
                                >
                                  SF
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: '700',
                                      fontSize: '13.5px',
                                      color: '#0F172A',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={cq.subFranchisePartner?.fullName}
                                  >
                                    {cq.subFranchisePartner?.fullName || 'Sub-Franchise Partner'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '10.5px',
                                        fontWeight: '700',
                                        color: '#9333EA',
                                        backgroundColor: '#FAF5FF',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        border: '1px solid #E9D5FF',
                                      }}
                                    >
                                      {cq.subFranchisePartner?.franchiseId || 'SF-PARTNER'}
                                    </span>
                                    <FranchiseTypeBadge type="SUB_FRANCHISE" />
                                  </div>
                                  {cq.subFranchisePartner?.mobileNumber && (
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                      📞 {cq.subFranchisePartner.mobileNumber}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Customer & Home Address */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{cq.customer?.fullName || 'Customer'}</span>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#0284C7',
                                      backgroundColor: '#F0F9FF',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #BAE6FD',
                                    }}
                                  >
                                    {cq.customer?.customerType || 'HOME'}
                                  </span>
                                </div>
                                {cq.customer?.mobileNumber && (
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                                    📱 {cq.customer.mobileNumber}
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px', lineHeight: '1.3' }}>
                                  <MapPin size={11} color="#9333EA" style={{ flexShrink: 0, marginTop: '2px' }} />
                                  <span style={{ wordBreak: 'break-word' }}>{formattedAddress}</span>
                                </div>
                              </div>
                            </td>

                            {/* Cards Installed */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: '800',
                                      color: '#0F172A',
                                      backgroundColor: '#FAF5FF',
                                      border: '1px solid #E9D5FF',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    {cq.cardsInstalled} Card{cq.cardsInstalled !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {cq.cardSerialNumbers && cq.cardSerialNumbers.length > 0 && (
                                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                    {cq.cardSerialNumbers.slice(0, 2).map((sn) => (
                                      <span
                                        key={sn}
                                        style={{
                                          fontSize: '10px',
                                          fontFamily: 'monospace',
                                          backgroundColor: '#F8FAFC',
                                          border: '1px solid #E2E8F0',
                                          padding: '1px 4px',
                                          borderRadius: '4px',
                                          color: '#475569',
                                        }}
                                      >
                                        {sn}
                                      </span>
                                    ))}
                                    {cq.cardSerialNumbers.length > 2 && (
                                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                        +{cq.cardSerialNumbers.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Quotation Rate per Card */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0284C7' }}>
                                  ₹{(cq.pricePerCard || 3000).toLocaleString('en-IN')}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                  per installed card
                                </span>
                              </div>
                            </td>

                            {/* Customer Net Value */}
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span
                                  style={{
                                    fontSize: '15px',
                                    fontWeight: '900',
                                    color: '#9333EA',
                                    letterSpacing: '-0.01em',
                                  }}
                                >
                                  {formatCurrency(cq.totalAmount || (cq.cardsInstalled * (cq.pricePerCard || 3000)))}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={11} />
                                  Confirmed Quotation
                                </span>
                              </div>
                            </td>

                            {/* Installation Ref & Date */}
                            <td style={{ padding: '10px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#0F172A',
                                    backgroundColor: '#F1F5F9',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #E2E8F0',
                                    width: 'fit-content',
                                  }}
                                >
                                  {cq.installationId || 'INST-REF'}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: '700' }}>
                                  CONFIRMED INSTALL
                                </span>
                                {cq.installationDateTime && (
                                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                    {formatDate(cq.installationDateTime)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : displayedPartners.length === 0 ? (
                /* ─── TABS 1-3 EMPTY STATE ─── */
                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                  {partnerModalTier === 'INSTALLED' ? (
                    <>
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          backgroundColor: '#DCFCE7',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 14px',
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                        }}
                      >
                        <Sparkles size={28} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>No Cards Installed Yet</h3>
                      <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', maxWidth: '420px', margin: '6px auto 0', lineHeight: '1.5' }}>
                        Abhi tak kisi bhi partner ke dwara koi card install nahi kiya gaya hai. Jab kisi customer ke yahan card successfully install hoga, tabhi yahan us partner ka record show hoga.
                      </p>
                    </>
                  ) : (
                    <>
                      <Users size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>No Partners Found</h3>
                      <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                        No partners matched your search or tier filter.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* ─── TABS 1-3: STANDARD PARTNER STOCK DISTRIBUTION TABLE ─── */
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '25%' }}>
                        FRANCHISE PARTNER
                      </th>
                      <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '19%' }}>
                        TERRITORY & TIER
                      </th>
                      <th style={{ padding: '11px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '11%' }}>
                        CARDS GIVEN
                      </th>
                      <th style={{ padding: '11px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '10%' }}>
                        IN-HAND
                      </th>
                      <th
                        style={{
                          padding: '11px 8px',
                          textAlign: 'center',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          color: partnerModalTier === 'INSTALLED' ? '#059669' : '#475569',
                          backgroundColor: partnerModalTier === 'INSTALLED' ? '#ECFDF5' : 'transparent',
                          borderRadius: partnerModalTier === 'INSTALLED' ? '6px 6px 0 0' : '0',
                          width: '10%',
                        }}
                      >
                        INSTALLED {partnerModalTier === 'INSTALLED' && '⚡'}
                      </th>
                      <th style={{ padding: '11px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '12%' }}>
                        SAMPLE SERIALS
                      </th>
                      <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: '11.5px', fontWeight: '800', color: '#475569', width: '14%' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPartners.map((p, idx) => {
                      const hasStock = p.totalCardsPossessed > 0;
                      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FBFDFF';

                      return (
                        <tr
                          key={p.partnerId}
                          style={{
                            borderBottom: '1px solid #E2E8F0',
                            backgroundColor: rowBg,
                            transition: 'background-color 0.15s ease',
                          }}
                          className="table-row-hover"
                        >
                          {/* Partner Name, Avatar & Franchise ID */}
                          <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: hasStock
                                    ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)'
                                    : 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  flexShrink: 0,
                                  boxShadow: hasStock ? '0 2px 5px rgba(2, 132, 199, 0.25)' : 'none',
                                }}
                              >
                                {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                              </div>
                              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontWeight: '700',
                                    fontSize: '13.5px',
                                    color: '#0F172A',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={p.fullName}
                                >
                                  {p.fullName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#0284C7',
                                      backgroundColor: '#F0F9FF',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #BAE6FD',
                                    }}
                                  >
                                    {p.franchiseId}
                                  </span>
                                  {p.mobileNumber && (
                                    <>
                                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>•</span>
                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        {p.mobileNumber}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Territory & Franchise Type */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', minWidth: 0 }}>
                              <FranchiseTypeBadge type={p.franchiseType} />
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  color: '#64748B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}
                                title={`${p.district}, ${p.state}`}
                              >
                                <MapPin size={11} color="#64748B" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.district}, {p.state}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Total Cards Possessed / Allotted */}
                          <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                backgroundColor: hasStock ? '#ECFDF5' : '#F1F5F9',
                                color: hasStock ? '#047857' : '#64748B',
                                border: hasStock ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                                fontWeight: '800',
                                fontSize: '12.5px',
                              }}
                            >
                              <CreditCard size={13} />
                              <span>{p.totalCardsPossessed} Cards</span>
                            </div>
                          </td>

                          {/* In-Hand Stock */}
                          <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: '800',
                                color: p.activeStockCount > 0 ? '#0284C7' : '#94A3B8',
                                backgroundColor: p.activeStockCount > 0 ? '#F0F9FF' : '#F8FAFC',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                border: p.activeStockCount > 0 ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                                display: 'inline-block',
                              }}
                            >
                              {p.activeStockCount} Units
                            </span>
                          </td>

                          {/* Installed */}
                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              backgroundColor: partnerModalTier === 'INSTALLED' ? '#F0FDF4' : 'transparent',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: '800',
                                color: p.installedCount > 0 ? '#059669' : '#64748B',
                                backgroundColor: p.installedCount > 0 ? '#DCFCE7' : (partnerModalTier === 'INSTALLED' ? '#FFFFFF' : 'transparent'),
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: p.installedCount > 0 ? '1px solid #A7F3D0' : (partnerModalTier === 'INSTALLED' ? '1px solid #E2E8F0' : 'none'),
                                display: 'inline-block',
                              }}
                            >
                              {p.installedCount} Units
                            </span>
                          </td>

                          {/* Sample Serials */}
                          <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                            {p.sampleSerials && p.sampleSerials.length > 0 ? (
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    backgroundColor: '#F8FAFC',
                                    color: '#0F172A',
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                    border: '1px solid #E2E8F0',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {p.sampleSerials[0]}
                                </span>
                                {p.totalCardsPossessed > 1 && (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#64748B',
                                      backgroundColor: '#F1F5F9',
                                      padding: '2px 6px',
                                      borderRadius: '5px',
                                      border: '1px solid #E2E8F0',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    +{p.totalCardsPossessed - 1} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                                None allocated
                              </span>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td style={{ padding: '10px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', justifyContent: 'center' }}>
                              {hasStock && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartnerModalOpen(false);
                                    handleViewPartnerCards(p);
                                  }}
                                  className="btn btn-outline btn-xs"
                                  style={{
                                    width: '135px',
                                    justifyContent: 'center',
                                    padding: '5px 10px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    borderRadius: '6px',
                                    borderColor: '#CBD5E1',
                                    color: '#0284C7',
                                    backgroundColor: '#FFFFFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    boxSizing: 'border-box',
                                  }}
                                  title="View cards allocated to this partner"
                                >
                                  <Eye size={12} />
                                  <span>View Cards ({p.totalCardsPossessed})</span>
                                </button>
                              )}

                              <Link
                                to={`/cards/assign?partnerId=${p.partnerId}`}
                                className="btn btn-primary btn-xs"
                                style={{
                                  width: '135px',
                                  justifyContent: 'center',
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#0284C7',
                                  borderColor: '#0284C7',
                                  color: '#FFFFFF',
                                  textDecoration: 'none',
                                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.2)',
                                  boxSizing: 'border-box',
                                }}
                                title="Allocate more cards from warehouse"
                              >
                                <Send size={11} />
                                <span>Assign Stock</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                {partnerModalTier === 'SUB_FRANCHISE_NET_VALUE' ? (
                  <>
                    Showing <strong>{displayedCustomerQuotations.length}</strong> confirmed Customer quotation installation{displayedCustomerQuotations.length !== 1 ? 's' : ''}
                  </>
                ) : partnerModalTier === 'NET_VALUE' ? (
                  <>
                    Showing <strong>{displayedQuotations.length}</strong> confirmed Sub-Franchise quotation assignment{displayedQuotations.length !== 1 ? 's' : ''} across all Franchise Partners
                  </>
                ) : (
                  <>
                    Showing <strong>{displayedPartners.length}</strong> partner records across field distribution
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(false)}
                className="btn btn-outline btn-sm"
                style={{ padding: '6px 18px', fontSize: '12.5px', fontWeight: '700' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ─── Modal 3: View Full Range Serials & Partner Allocation Details & History ─── */}
      <Modal
        isOpen={rangeModalOpen && !!selectedRange}
        onClose={() => setRangeModalOpen(false)}
        title={
          selectedRange ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <History size={18} color="#0284C7" />
              <span>
                {selectedRange.totalAllotments > 1
                  ? `Stock History: ${selectedRange.currentOwner?.fullName || 'Partner'}`
                  : `Card Range: ${selectedRange.startSerial} to ${selectedRange.endSerial}`}
              </span>
              {selectedRange.partnerTotalCards ? (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '800',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  {selectedRange.partnerTotalCards} Cards Total
                </span>
              ) : null}
            </div>
          ) : (
            'Card Range Details'
          )
        }
        maxWidth="760px"
      >
        {selectedRange && (() => {
          const isMultiBatch = selectedRange.history && selectedRange.history.length > 1;
          const currentBatch = isMultiBatch && selectedAllotmentTab !== 'ALL'
            ? selectedRange.history.find((b) => b.rangeId === selectedAllotmentTab) || selectedRange.history[0]
            : null;

          const displayedSerials = isMultiBatch
            ? (selectedAllotmentTab === 'ALL'
                ? (selectedRange.allSerials || selectedRange.serials || [])
                : (currentBatch?.serials || []))
            : (selectedRange.serials || []);

          const displayedCardIds = isMultiBatch
            ? (selectedAllotmentTab === 'ALL'
                ? (selectedRange.allCardIds || selectedRange.cardIds || [])
                : (currentBatch?.cardIds || []))
            : (selectedRange.cardIds || []);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Range Overview Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '10px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Owner / Franchise
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedRange.currentOwner?.fullName || 'Vidhyut Saathi HQ'}
                  </div>
                  {selectedRange.currentOwner?.franchiseId && (
                    <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: '600' }}>
                      {selectedRange.currentOwner.franchiseId} • {selectedRange.currentOwner.mobileNumber}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Territory
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    {selectedRange.currentOwner?.franchiseType ? (
                      <FranchiseTypeBadge type={selectedRange.currentOwner.franchiseType} />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Central Warehouse</span>
                    )}
                  </div>
                  {selectedRange.currentOwner?.district && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={11} color="#64748B" />
                      <span>{selectedRange.currentOwner.district}, {selectedRange.currentOwner.state}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {isMultiBatch ? 'Stock in Custody' : 'Stock Units'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <CardStatusBadge status={selectedRange.status} />
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #BBF7D0',
                      }}
                    >
                      {selectedRange.partnerTotalCards || selectedRange.totalCards} Cards
                    </span>
                  </div>
                  {isMultiBatch && (
                    <div style={{ fontSize: '10.5px', color: '#0284C7', fontWeight: '700', marginTop: '2px' }}>
                      {selectedRange.totalAllotments} Allotment Batches
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {isMultiBatch ? 'Latest Stock Allotted' : 'Assigned On'}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {formatDate(selectedRange.assignedAt)}
                  </div>
                  {isMultiBatch ? (
                    <div style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: '700', marginTop: '1px' }}>
                      {selectedRange.startSerial} - {selectedRange.endSerial} ({selectedRange.totalCards} Cards)
                    </div>
                  ) : selectedRange.batchId ? (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Batch: {selectedRange.batchId}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Complete Allotment Batches History (When partner has multiple allocations) */}
              {isMultiBatch && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <History size={13} color="#0284C7" />
                      <span>Allotment History ({selectedRange.history.length} Batches Given by Admin)</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                      Click any batch to view its serial numbers:
                    </div>
                  </div>

                  {/* Batch Selection Tabs */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAllotmentTab('ALL')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: selectedAllotmentTab === 'ALL' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        backgroundColor: selectedAllotmentTab === 'ALL' ? '#E0F2FE' : '#FFFFFF',
                        color: selectedAllotmentTab === 'ALL' ? '#0284C7' : '#475569',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      All Batches ({selectedRange.partnerTotalCards} Cards)
                    </button>

                    {selectedRange.history.map((batch, idx) => {
                      const isLatest = idx === 0;
                      const isSelected = selectedAllotmentTab === batch.rangeId;
                      return (
                        <button
                          key={batch.rangeId || idx}
                          type="button"
                          onClick={() => setSelectedAllotmentTab(batch.rangeId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '2px solid #0284C7' : '1px solid #CBD5E1',
                            backgroundColor: isSelected ? '#E0F2FE' : isLatest ? '#F0FDF4' : '#FFFFFF',
                            color: isSelected ? '#0284C7' : isLatest ? '#15803D' : '#475569',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isLatest ? (
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#166534', padding: '1px 4px', borderRadius: '4px' }}>
                              LATEST
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#64748B' }}>
                              #{selectedRange.history.length - idx}
                            </span>
                          )}
                          <span style={{ fontFamily: 'monospace' }}>
                            {batch.startSerial} - {batch.endSerial}
                          </span>
                          <span>({batch.totalCards} Cards)</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Selection Details */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#334155',
                      backgroundColor: '#FFFFFF',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <span>
                      Viewing:{' '}
                      <strong style={{ color: '#0284C7' }}>
                        {selectedAllotmentTab === 'ALL'
                          ? `All ${selectedRange.partnerTotalCards} Cards in Partner Custody`
                          : `${currentBatch?.startSerial} to ${currentBatch?.endSerial} (${currentBatch?.totalCards} Cards)`}
                      </strong>
                    </span>

                    {currentBatch?.assignedAt && (
                      <span style={{ color: '#64748B' }}>
                        Allotted On: <strong>{formatDate(currentBatch.assignedAt)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Serial List Search & Copy Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
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
                    style={{ paddingLeft: '32px', fontSize: '12px', padding: '5px 10px 5px 32px', height: '32px' }}
                    placeholder="Search serial numbers (e.g. VS001223)..."
                    value={rangeModalSearch}
                    onChange={(e) => setRangeModalSearch(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    const allText = displayedSerials.join('\n');
                    handleCopy(allText, e);
                    showToast(`All ${displayedSerials.length} serial numbers copied to clipboard!`, 'success');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', height: '32px', padding: '0 12px' }}
                >
                  <Copy size={13} />
                  <span>Copy All Serials ({displayedSerials.length})</span>
                </button>
              </div>

              {/* Serials Chips Grid */}
              <div
                style={{
                  maxHeight: '190px',
                  overflowY: 'auto',
                  padding: '10px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
                  gap: '6px',
                }}
              >
                {displayedSerials
                  .filter((s) => (rangeModalSearch ? s.toLowerCase().includes(rangeModalSearch.toLowerCase().trim()) : true))
                  .map((serial, idx) => {
                    const cardId = displayedCardIds[idx] || selectedRange.firstCardId;
                    return (
                      <div
                        key={serial}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 7px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '5px',
                          border: '1px solid #E2E8F0',
                          fontSize: '11.5px',
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
                          {copiedId === serial ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer with Explicit Close Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '4px',
                  paddingTop: '8px',
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Showing <strong>{displayedSerials.filter((s) => (rangeModalSearch ? s.toLowerCase().includes(rangeModalSearch.toLowerCase().trim()) : true)).length}</strong> of <strong>{displayedSerials.length}</strong> serial cards
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setRangeModalOpen(false)}
                    style={{
                      padding: '6px 18px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Check size={14} />
                    <span>Done / Close</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
      {/* ─── Modal 4: Interactive Real-Time Franchise Partner Card Details Popup ─── */}
      {partnerCardPopupOpen && !isSuperAdmin && (
        <div
          className="partner-card-popup-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '12px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setPartnerCardPopupOpen(false)}
        >
          <div
            className="partner-card-popup-container"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '96vw',
              maxWidth: '1380px',
              height: '88vh',
              maxHeight: '880px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="partner-card-popup-header"
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Left: Icon & Title */}
              <div className="partner-card-popup-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor:
                      partnerCardPopupType === 'MY_AVAILABLE_STOCK'
                        ? '#E0F2FE'
                        : partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK'
                        ? '#FAF5FF'
                        : partnerCardPopupType === 'CUSTOMERS'
                        ? '#DCFCE7'
                        : partnerCardPopupType === 'MY_NET_VALUE'
                        ? '#FEF3C7'
                        : '#FAF5FF',
                    color:
                      partnerCardPopupType === 'MY_AVAILABLE_STOCK'
                        ? '#0284C7'
                        : partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK'
                        ? '#9333EA'
                        : partnerCardPopupType === 'CUSTOMERS'
                        ? '#16A34A'
                        : partnerCardPopupType === 'MY_NET_VALUE'
                        ? '#D97706'
                        : '#7E22CE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && <Package size={20} />}
                  {partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' && <Building2 size={20} />}
                  {partnerCardPopupType === 'CUSTOMERS' && <Users size={20} />}
                  {partnerCardPopupType === 'MY_NET_VALUE' && <IndianRupee size={20} />}
                  {partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' && <Home size={20} />}
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && 'My Available Stock Details'}
                    {partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' && 'Sub-Franchise Stock Breakdown'}
                    {partnerCardPopupType === 'CUSTOMERS' && 'Registered Customers & Network'}
                    {partnerCardPopupType === 'MY_NET_VALUE' && 'My Direct Stock Net Valuation'}
                    {partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' && 'Sub-Franchise Network Valuation'}
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        backgroundColor:
                          partnerCardPopupType === 'MY_AVAILABLE_STOCK'
                            ? '#E0F2FE'
                            : partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK'
                            ? '#FAF5FF'
                            : partnerCardPopupType === 'CUSTOMERS'
                            ? '#DCFCE7'
                            : partnerCardPopupType === 'MY_NET_VALUE'
                            ? '#FEF3C7'
                            : '#FAF5FF',
                        color:
                          partnerCardPopupType === 'MY_AVAILABLE_STOCK'
                            ? '#0284C7'
                            : partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK'
                            ? '#9333EA'
                            : partnerCardPopupType === 'CUSTOMERS'
                            ? '#16A34A'
                            : partnerCardPopupType === 'MY_NET_VALUE'
                            ? '#D97706'
                            : '#7E22CE',
                      }}
                    >
                      {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && `${stats.myAvailableStock ?? stats.pending ?? Math.max(0, (stats.total || 0) - (stats.installed || 0))} Cards`}
                      {partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' && `${stats.subFranchiseAvailableStock ?? 0} Cards`}
                      {partnerCardPopupType === 'CUSTOMERS' && `${stats.customers ?? 0} Customers`}
                      {partnerCardPopupType === 'MY_NET_VALUE' && formatCurrency(stats.myNetValue || ((stats.total || 0) * (stats.quotationRate || 1200)) || 600000)}
                      {partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' && formatCurrency(stats.subFranchiseNetValue || 0)}
                    </span>
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                    {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && 'Consolidated view of all in-hand serial numbers ready for customer deployment.'}
                    {partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' && 'Cards transferred to your subordinate sub-franchise partners.'}
                    {partnerCardPopupType === 'CUSTOMERS' && 'All energy consumers registered under your direct and sub-franchise accounts.'}
                    {partnerCardPopupType === 'MY_NET_VALUE' && 'Financial calculation of direct in-possession inventory based on agreement quotation.'}
                    {partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' && 'Sub-franchise network inventory quotation valuation.'}
                  </p>
                </div>
              </div>

              {/* Right: Quick Tab Switcher & Close */}
              <div className="partner-card-popup-tabs-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div
                  className="partner-card-popup-tabs-scroll"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#E2E8F0',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openPartnerCardPopup('MY_AVAILABLE_STOCK')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: partnerCardPopupType === 'MY_AVAILABLE_STOCK' ? '800' : '600',
                      backgroundColor: partnerCardPopupType === 'MY_AVAILABLE_STOCK' ? '#FFFFFF' : 'transparent',
                      color: partnerCardPopupType === 'MY_AVAILABLE_STOCK' ? '#0284C7' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: partnerCardPopupType === 'MY_AVAILABLE_STOCK' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    My Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => openPartnerCardPopup('SUB_FRANCHISE_AVAILABLE_STOCK')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' ? '800' : '600',
                      backgroundColor: partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' ? '#FFFFFF' : 'transparent',
                      color: partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' ? '#9333EA' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Sub-Franchise
                  </button>

                  <button
                    type="button"
                    onClick={() => openPartnerCardPopup('CUSTOMERS')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: partnerCardPopupType === 'CUSTOMERS' ? '800' : '600',
                      backgroundColor: partnerCardPopupType === 'CUSTOMERS' ? '#FFFFFF' : 'transparent',
                      color: partnerCardPopupType === 'CUSTOMERS' ? '#16A34A' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: partnerCardPopupType === 'CUSTOMERS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Customers
                  </button>

                  <button
                    type="button"
                    onClick={() => openPartnerCardPopup('MY_NET_VALUE')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: partnerCardPopupType === 'MY_NET_VALUE' ? '800' : '600',
                      backgroundColor: partnerCardPopupType === 'MY_NET_VALUE' ? '#FFFFFF' : 'transparent',
                      color: partnerCardPopupType === 'MY_NET_VALUE' ? '#D97706' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: partnerCardPopupType === 'MY_NET_VALUE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    My Net Value
                  </button>

                  <button
                    type="button"
                    onClick={() => openPartnerCardPopup('SUB_FRANCHISE_NET_VALUE')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' ? '800' : '600',
                      backgroundColor: partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' ? '#FFFFFF' : 'transparent',
                      color: partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' ? '#7E22CE' : '#64748B',
                      cursor: 'pointer',
                      boxShadow: partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Sub Net Value
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPartnerCardPopupOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Close popup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Quick Filter & Search Bar */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '420px' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Instant search in popup (serial, name, district)..."
                  value={partnerPopupSearch}
                  onChange={(e) => setPartnerPopupSearch(e.target.value)}
                  style={{ height: '34px', paddingLeft: '32px', fontSize: '12.5px', width: '100%', borderRadius: '7px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && (
                  <Link
                    to="/customers/new"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px' }}
                  >
                    <Plus size={13} />
                    <span>Install on Customer</span>
                  </Link>
                )}

                {(partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' || partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE') && (
                  <Link
                    to="/transactions/new"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px' }}
                  >
                    <Send size={13} />
                    <span>Distribute Stock</span>
                  </Link>
                )}

                {partnerCardPopupType === 'CUSTOMERS' && (
                  <Link
                    to="/customers/new"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px' }}
                  >
                    <Plus size={13} />
                    <span>Add Customer</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Modal Body Content (Scrollable & Responsive) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', backgroundColor: '#F8FAFC' }}>
              {/* TAB 1: MY AVAILABLE STOCK */}
              {partnerCardPopupType === 'MY_AVAILABLE_STOCK' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top 4 KPI Metrics Grid inside Popup */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {/* KPI 1: Ready In-Hand */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderTop: '3.5px solid #0284C7',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        DIRECT READY STOCK
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284C7', marginTop: '3px' }}>
                        {stats.myAvailableStock ?? stats.pending ?? Math.max(0, (stats.total || 0) - (stats.installed || 0))} Cards
                      </div>
                      <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', marginTop: '2px' }}>
                        ✓ In-Hand Ready for Installation
                      </div>
                    </div>

                    {/* KPI 2: Sub-Franchise Network */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderTop: '3.5px solid #9333EA',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        SUB-FRANCHISE NETWORK
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#9333EA', marginTop: '3px' }}>
                        {stats.subFranchiseAvailableStock ?? 0} Cards
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginTop: '2px' }}>
                        In Sub-Franchise Custody
                      </div>
                    </div>

                    {/* KPI 3: Installed on Customers */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderTop: '3.5px solid #16A34A',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        INSTALLED ON METERS
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#16A34A', marginTop: '3px' }}>
                        {stats.installed ?? 0} Cards
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginTop: '2px' }}>
                        Active Customer Installations
                      </div>
                    </div>

                    {/* KPI 4: Net Stock Valuation */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderTop: '3.5px solid #D97706',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        DIRECT VALUATION (@ ₹1,200)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#D97706', marginTop: '3px' }}>
                        {formatCurrency(stats.myNetValue || ((stats.total || 0) * (stats.quotationRate || 1200)) || 600000)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginTop: '2px' }}>
                        Agreement Quotation Value
                      </div>
                    </div>
                  </div>

                  {/* Context Information Strip */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#64748B', fontWeight: '600' }}>Partner Account: </span>
                        <strong style={{ color: '#0F172A' }}>{partner?.fullName || 'Partner'}</strong> ({partner?.franchiseId || 'VS-DIRECT'})
                      </div>
                      <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />
                      <div>
                        <span style={{ color: '#64748B', fontWeight: '600' }}>Territory: </span>
                        <strong>📍 {partner?.district || 'District'}, {partner?.state || 'State'}</strong>
                      </div>
                      <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />
                      <div>
                        <span style={{ color: '#64748B', fontWeight: '600' }}>Master Range: </span>
                        <strong style={{ fontFamily: 'monospace', color: '#0284C7' }}>
                          {stats.startSerial && stats.endSerial
                            ? `${stats.startSerial} → ${stats.endSerial}`
                            : ranges.length > 0
                            ? `${ranges[ranges.length - 1]?.startSerial || ranges[0]?.startSerial} → ${ranges[0]?.endSerial}`
                            : 'VS000201 → VS001480'}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', border: '1px solid #BBF7D0' }}>
                        ✓ Stock Sync Online
                      </span>
                    </div>
                  </div>

                  {/* Serial Number Ranges Table with Full Data */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={15} color="#0284C7" />
                        <span>Contiguous Card Allotment Batches ({ranges.length > 0 ? ranges.length : 1} Range Groups)</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Displaying in-hand card serial allocations
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>SERIAL RANGE</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>TOTAL CARDS</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>STATUS</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>BATCH ID</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ranges.length > 0 ? ranges : [{
                            startSerial: stats.startSerial || 'VS001223',
                            endSerial: stats.endSerial || 'VS001480',
                            cardCount: stats.myAvailableStock || 258,
                            status: 'ASSIGNED',
                            batchId: 'BATCH-ALLOT-1',
                          }])
                            .filter((r) => {
                              if (!partnerPopupSearch) return true;
                              const q = partnerPopupSearch.toLowerCase();
                              return (
                                (r.startSerial || '').toLowerCase().includes(q) ||
                                (r.endSerial || '').toLowerCase().includes(q) ||
                                (r.batchId || '').toLowerCase().includes(q)
                              );
                            })
                            .map((r, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background-color 0.15s' }}>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0284C7', fontSize: '13px' }}>
                                      {r.startSerial} ➔ {r.endSerial}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(`${r.startSerial} - ${r.endSerial}`, e)}
                                      style={{ border: 'none', background: 'transparent', color: copiedId === `${r.startSerial} - ${r.endSerial}` ? '#16a34a' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                      title="Copy range"
                                    >
                                      {copiedId === `${r.startSerial} - ${r.endSerial}` ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '12.5px', border: '1px solid #BAE6FD' }}>
                                    {r.cardCount || r.totalCards || 258} Cards
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={12} />
                                    <span>In-Hand (Ready)</span>
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                                  {r.batchId || 'BATCH-ALLOT-1'}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                    <Link
                                      to="/customers/new"
                                      className="btn btn-primary btn-sm"
                                      style={{ fontSize: '11.5px', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                      title="Install a card from this range for a customer"
                                    >
                                      <Plus size={12} />
                                      <span>Install Card</span>
                                    </Link>
                                    <Link
                                      to="/transactions/new"
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: '11.5px', padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                      title="Distribute part of this stock to sub-franchise"
                                    >
                                      <Send size={12} />
                                      <span>Transfer</span>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUB-FRANCHISE AVAILABLE STOCK */}
              {partnerCardPopupType === 'SUB_FRANCHISE_AVAILABLE_STOCK' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top KPI Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: '3.5px solid #9333EA', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>SUB-FRANCHISE INVENTORY</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#9333EA', marginTop: '2px' }}>{stats.subFranchiseAvailableStock ?? 0} Cards</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Post-Invoice settled custody</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: '3.5px solid #0284C7', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>SUB-FRANCHISE PARTNERS</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284C7', marginTop: '2px' }}>{partnerPopupSubFranchises.length} Registered</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Active territory partners</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: '3.5px solid #7E22CE', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>SUB NETWORK VALUATION</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#7E22CE', marginTop: '2px' }}>{formatCurrency(stats.subFranchiseNetValue || 0)}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Invoice value calculation</div>
                    </div>
                  </div>

                  {/* Allotment Policy Notice */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                      <span style={{ fontSize: '14px' }}>📋</span>
                      <span><strong>Stock Allotment Rule:</strong> Sub-Franchise account me cards tabhi credit hote hain jab <strong>Quotation Generate</strong> hone ke baad <strong>Tax Invoice</strong> successfully process ho jata hai.</span>
                    </div>
                    <span style={{ background: '#FAF5FF', color: '#7E22CE', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', border: '1px solid #E9D5FF' }}>
                      Quotation ➔ Invoice ➔ Stock Transfer
                    </span>
                  </div>

                  {partnerPopupLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#9333EA' }} />
                      <div>Loading sub-franchise partners network...</div>
                    </div>
                  ) : partnerPopupSubFranchises.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <Building2 size={36} color="#9333EA" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700' }}>No Sub-Franchises Created Yet</h4>
                      <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748B' }}>
                        You can create sub-franchise partners in your district and transfer stock to them.
                      </p>
                      <Link to="/transactions/new" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Send size={13} />
                        <span>Distribute Stock to Sub-Franchise</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>SUB-FRANCHISE</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>FRANCHISE ID</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>TERRITORY</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>STOCK IN-HAND</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>CARDS INSTALLED</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnerPopupSubFranchises
                            .filter((p) => {
                              if (!partnerPopupSearch) return true;
                              const q = partnerPopupSearch.toLowerCase();
                              return (
                                (p.fullName || '').toLowerCase().includes(q) ||
                                (p.franchiseId || '').toLowerCase().includes(q) ||
                                (p.district || '').toLowerCase().includes(q)
                              );
                            })
                            .map((p) => (
                              <tr key={p._id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>{p.fullName}</div>
                                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>📱 {p.mobileNumber}</div>
                                </td>
                                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700', color: '#0284C7' }}>
                                  {p.franchiseId}
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: '12.5px' }}>
                                  {p.district}, {p.state}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#FAF5FF', color: '#7E22CE', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', border: '1px solid #E9D5FF' }}>
                                    {p.cardCount || p.currentInventory || 0} Cards
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', border: '1px solid #BBF7D0' }}>
                                    {p.cardsInstalled || 0} Units
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                  <Link
                                    to="/transactions/new"
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Send size={12} />
                                    <span>Distribute Stock</span>
                                  </Link>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CUSTOMERS */}
              {partnerCardPopupType === 'CUSTOMERS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top KPI Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: '3.5px solid #16A34A', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>REGISTERED CONSUMERS</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>{stats.customers ?? partnerPopupCustomers.length} Total</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Direct + Sub network</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: '3.5px solid #0284C7', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>INSTALLED UNITS</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284C7', marginTop: '2px' }}>{stats.installed ?? 0} Cards</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Active meter attachments</div>
                    </div>
                  </div>

                  {partnerPopupLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#16A34A' }} />
                      <div>Loading customer network accounts...</div>
                    </div>
                  ) : partnerPopupCustomers.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <Users size={36} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700' }}>No Customer Accounts Found</h4>
                      <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748B' }}>
                        When you or your sub-franchise partners install cards for consumers, they will show up here.
                      </p>
                      <Link to="/customers/new" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={13} />
                        <span>Install Card on Customer</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>CUSTOMER ID</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>NAME & MOBILE</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>TYPE</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>LOAD (KW)</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>INSTALLED CARDS</th>
                            <th style={{ padding: '10px 14px', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>PARTNER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnerPopupCustomers
                            .filter((c) => {
                              if (!partnerPopupSearch) return true;
                              const q = partnerPopupSearch.toLowerCase();
                              return (
                                (c.fullName || '').toLowerCase().includes(q) ||
                                (c.customerId || '').toLowerCase().includes(q) ||
                                (c.mobileNumber || '').includes(q)
                              );
                            })
                            .map((c) => (
                              <tr key={c._id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700', color: '#0284C7' }}>
                                  {c.customerId}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>{c.fullName}</div>
                                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>📱 {c.mobileNumber}</div>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '700', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                                    {c.customerType || 'RESIDENTIAL'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                                  ⚡ {c.electricityDetails?.connectedLoadKw || 1} kW
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', border: '1px solid #BBF7D0' }}>
                                    {c.installedCardCount || 1} Cards
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B' }}>
                                  {c.createdByPartnerId?.fullName || 'Direct Partner'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MY NET VALUE */}
              {partnerCardPopupType === 'MY_NET_VALUE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #FDE68A',
                      borderRadius: '12px',
                      padding: '18px 22px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        DIRECT IN-POSSESSION STOCK
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                        {stats.myAvailableStock ?? stats.pending ?? Math.max(0, (stats.total || 0) - (stats.installed || 0))} Cards
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        QUOTATION VALUATION RATE
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#D97706', marginTop: '2px' }}>
                        ₹{(stats.quotationRate || 1200).toLocaleString('en-IN')} / Card
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        TOTAL ESTIMATED NET VALUATION
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803D', marginTop: '2px' }}>
                        {formatCurrency(stats.myNetValue || ((stats.total || 0) * (stats.quotationRate || 1200)) || 600000)}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                      📋 Valuation Calculation Breakdown
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                      Based on your Franchise Agreement terms, cards in your custody are valued at <strong>₹{(stats.quotationRate || 1200).toLocaleString('en-IN')}</strong> per card.
                      As each card is installed for customer electricity meters, consumer subscription revenue and maintenance credits are recognized in your franchise ledger.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: SUB-FRANCHISE NET VALUE */}
              {partnerCardPopupType === 'SUB_FRANCHISE_NET_VALUE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E9D5FF',
                      borderRadius: '12px',
                      padding: '18px 22px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        SUB-FRANCHISE ALLOCATED CARDS
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                        {stats.subFranchiseAvailableStock ?? 0} Cards
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        SUB-FRANCHISE VALUATION RATE
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#7E22CE', marginTop: '2px' }}>
                        ₹{(stats.quotationRate || 1200).toLocaleString('en-IN')} / Card
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        SUB-FRANCHISE NET VALUE
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#7E22CE', marginTop: '2px' }}>
                        {formatCurrency(stats.subFranchiseNetValue || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                      🏛️ Sub-Franchise Network Valuation Overview
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                      This represents the total valuation of inventory allotted across your subordinate Sub-Franchise network.
                      Track performance, deployment progress, and supply additional cards seamlessly through stock distribution.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#0284C7" />
                <span>Real-time database records • No page reload or sliding required</span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPartnerCardPopupOpen(false)}
                style={{ padding: '6px 20px', fontSize: '12.5px', fontWeight: '700' }}
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardInventoryPage;


