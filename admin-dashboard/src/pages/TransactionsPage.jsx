import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Check,
  X,
  CreditCard,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Layers,
  Upload,
  Phone,
  Building2,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import {
  TransactionStatusBadge,
  PaymentStatusBadge,
  TransactionTypeBadge,
  FranchiseTypeBadge,
} from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin, partner: currentPartner } = useAuth();
  const { showToast } = useNotification();

  // Transactions list state
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pending: 0,
    confirmed: 0,
    disputed: 0,
    cancelled: 0,
    totalCardsTransferred: 0,
    totalSalesValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Territory lists state
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Filter state synced with URL searchParams
  const activeTab = searchParams.get('tab') || 'ALL';
  const statusFilter = searchParams.get('status') || '';
  const typeFilter = searchParams.get('type') || '';
  const stateFilter = searchParams.get('state') || '';
  const districtFilter = searchParams.get('district') || '';
  const franchiseTypeFilter = searchParams.get('franchiseType') || '';
  const urlSearch = searchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(urlSearch);

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  // Fetch States on Mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/territories/states');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setStatesList(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching states:', err);
      }
    };
    fetchStates();
  }, []);

  // Fetch Districts when stateFilter changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!stateFilter) {
        setDistrictsList([]);
        return;
      }
      try {
        const res = await api.get('/territories/districts', { params: { state: stateFilter } });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [stateFilter]);

  const handleStateFilterChange = (newState) => {
    const newParams = new URLSearchParams(searchParams);
    if (newState) {
      newParams.set('state', newState);
    } else {
      newParams.delete('state');
    }
    newParams.delete('district'); // Reset district when state changes
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleDistrictFilterChange = (newDistrict) => {
    const newParams = new URLSearchParams(searchParams);
    if (newDistrict) {
      newParams.set('district', newDistrict);
    } else {
      newParams.delete('district');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleFranchiseTypeFilterChange = (newType) => {
    const newParams = new URLSearchParams(searchParams);
    if (newType) {
      newParams.set('franchiseType', newType);
    } else {
      newParams.delete('franchiseType');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const setActiveTab = (tab) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'ALL') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    newParams.delete('status');
    newParams.delete('type');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Metric card click handlers
  const isTotalActive = !searchParams.get('tab') && !statusFilter && !typeFilter && !stateFilter && !districtFilter && !franchiseTypeFilter && !urlSearch;
  const isPendingActive = activeTab === 'PENDING' || statusFilter === 'PENDING_CONFIRMATION';
  const isConfirmedActive = statusFilter === 'CONFIRMED';
  const isSalesActive = typeFilter === 'SALE';

  const handleTotalCardClick = () => {
    const newParams = new URLSearchParams();
    setSearchParams(newParams);
    setSearchTerm('');
  };

  const handlePendingCardClick = () => {
    const newParams = new URLSearchParams();
    newParams.set('tab', 'PENDING');
    setSearchParams(newParams);
  };

  const handleConfirmedCardClick = () => {
    const newParams = new URLSearchParams();
    newParams.set('status', 'CONFIRMED');
    setSearchParams(newParams);
  };

  const handleSalesCardClick = () => {
    const newParams = new URLSearchParams();
    newParams.set('type', 'SALE');
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams();
    setSearchParams(newParams);
    setSearchTerm('');
  };

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'CONFIRM' | 'DISPUTE' | 'PAYMENT_PROOF' | 'VERIFY_PAYMENT' | 'CANCEL'
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal form fields
  const [modalNotes, setModalNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('QUANTITY_MISMATCH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Fetch transactions and stats
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const tab = searchParams.get('tab') || 'ALL';
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const type = searchParams.get('type') || '';
      const state = searchParams.get('state') || '';
      const district = searchParams.get('district') || '';
      const franchiseType = searchParams.get('franchiseType') || '';

      const params = { page, limit: 20 };

      if (search) params.search = search;
      if (status) params.status = status;
      if (type) params.transactionType = type;
      if (state) params.state = state;
      if (district) params.district = district;
      if (franchiseType) params.franchiseType = franchiseType;

      // Handle tab-based filtering
      if (tab === 'PENDING') {
        params.status = 'PENDING_CONFIRMATION';
      } else if (tab === 'DISPUTED') {
        params.status = 'DISPUTED';
      }

      const [listRes, statsRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/transactions/stats/summary'),
      ]);

      if (listRes.data?.data) {
        setTransactions(listRes.data.data.transactions || []);
        setPagination(listRes.data.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }

      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error fetching transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchParams]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      newParams.set('search', searchTerm.trim());
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Filter transactions in current tab for INCOMING / OUTGOING if partner
  const displayedTransactions = useMemo(() => {
    if (activeTab === 'INCOMING' && !isSuperAdmin && currentPartner?._id) {
      return transactions.filter((t) => {
        const toId = t.buyerPartnerId?._id || t.buyerPartnerId || t.toPartner?._id || t.toPartner;
        return toId?.toString() === currentPartner._id.toString();
      });
    }
    if (activeTab === 'OUTGOING' && !isSuperAdmin && currentPartner?._id) {
      return transactions.filter((t) => {
        const fromId = t.sellerPartnerId?._id || t.sellerPartnerId || t.fromPartner?._id || t.fromPartner;
        return fromId?.toString() === currentPartner._id.toString();
      });
    }
    return transactions;
  }, [transactions, activeTab, isSuperAdmin, currentPartner]);

  // Modal open helpers
  const openConfirmModal = (txn) => {
    setSelectedTxn(txn);
    setModalNotes('');
    setActiveModal('CONFIRM');
  };

  const openDisputeModal = (txn) => {
    setSelectedTxn(txn);
    setDisputeReason('QUANTITY_MISMATCH');
    setModalNotes('');
    setActiveModal('DISPUTE');
  };

  const openPaymentProofModal = (txn) => {
    setSelectedTxn(txn);
    setPaymentReference('');
    setPaymentMethod('UPI');
    setModalNotes('');
    setActiveModal('PAYMENT_PROOF');
  };

  const openVerifyPaymentModal = (txn) => {
    setSelectedTxn(txn);
    setModalNotes('');
    setActiveModal('VERIFY_PAYMENT');
  };

  const openCancelModal = (txn) => {
    setSelectedTxn(txn);
    setModalNotes('');
    setActiveModal('CANCEL');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTxn(null);
  };

  // Perform modal actions
  const handleConfirmTransaction = async () => {
    if (!selectedTxn) return;
    setActionLoading(true);
    try {
      await api.post(`/transactions/${selectedTxn._id}/confirm`, {
        notes: modalNotes.trim() || undefined,
      });
      showToast('Consignment confirmed successfully! Inventory updated.', 'success');
      closeModal();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to confirm transaction', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeTransaction = async () => {
    if (!selectedTxn) return;
    if (!modalNotes.trim()) {
      showToast('Please provide detailed notes describing the issue/dispute', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/transactions/${selectedTxn._id}/dispute`, {
        disputeReason,
        disputeNotes: modalNotes.trim(),
      });
      showToast('Transaction disputed. Head Office and seller notified.', 'warning');
      closeModal();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit dispute', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!selectedTxn) return;
    if (!paymentReference.trim()) {
      showToast('Please enter Payment Reference / UTR Number', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/transactions/${selectedTxn._id}/payment-proof`, {
        referenceNumber: paymentReference.trim(),
        paymentMethod,
        notes: modalNotes.trim() || undefined,
      });
      showToast('Payment proof submitted successfully!', 'success');
      closeModal();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit payment proof', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayment = async (approved) => {
    if (!selectedTxn) return;
    setActionLoading(true);
    try {
      await api.post(`/transactions/${selectedTxn._id}/verify-payment`, {
        approved,
        notes: modalNotes.trim() || undefined,
      });
      showToast(
        approved ? 'Payment verified successfully!' : 'Payment marked as rejected',
        approved ? 'success' : 'warning'
      );
      closeModal();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTransaction = async () => {
    if (!selectedTxn) return;
    setActionLoading(true);
    try {
      await api.post(`/transactions/${selectedTxn._id}/cancel`, {
        cancellationReason: modalNotes.trim() || undefined,
      });
      showToast('Transaction cancelled and stock unlocked back to seller inventory', 'info');
      closeModal();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel transaction', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <FileText size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              Card Transactions & Consignments
            </h1>
            <p className="page-subtitle">
              Track card shipments, confirm stock receipts, record payments, and audit full chain-of-custody transfer history.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <Link to="/transactions/new" className="btn btn-primary">
            <Send size={16} />
            <span>Distribute Cards</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Banner (Clickable) */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div
          onClick={handleTotalCardClick}
          role="button"
          tabIndex={0}
          title="Click to view all consignments"
          className="card stat-card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            border: isTotalActive ? '2px solid #0284C7' : '1px solid var(--border-color)',
            borderLeft: '4px solid #0284C7',
            backgroundColor: isTotalActive ? '#F0F9FF' : '#FFFFFF',
            boxShadow: isTotalActive ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'var(--shadow-sm)',
            transform: isTotalActive ? 'translateY(-2px)' : 'none',
          }}
        >
          {isTotalActive && (
            <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', fontWeight: '800', backgroundColor: '#E0F2FE', color: '#0284C7', padding: '2px 5px', borderRadius: '4px' }}>
              ACTIVE
            </span>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Transferred</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.2 }}>{stats.totalCardsTransferred || 0} Units</div>
            <div style={{ fontSize: '10.5px', color: isTotalActive ? '#0284C7' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.totalTransactions || 0} consignments</div>
          </div>
        </div>

        <div
          onClick={handlePendingCardClick}
          role="button"
          tabIndex={0}
          title="Click to filter pending confirmation"
          className="card stat-card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            border: isPendingActive ? '2px solid #F59E0B' : '1px solid var(--border-color)',
            borderLeft: '4px solid #F59E0B',
            backgroundColor: isPendingActive ? '#FFFBEB' : '#FFFFFF',
            boxShadow: isPendingActive ? '0 4px 14px rgba(245, 158, 11, 0.2)' : 'var(--shadow-sm)',
            transform: isPendingActive ? 'translateY(-2px)' : 'none',
          }}
        >
          {isPendingActive && (
            <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', fontWeight: '800', backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 5px', borderRadius: '4px' }}>
              ACTIVE
            </span>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Pending Action</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#B45309', lineHeight: 1.2 }}>{stats.pending || 0} Shipments</div>
            <div style={{ fontSize: '10.5px', color: isPendingActive ? '#B45309' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Awaiting check-in</div>
          </div>
        </div>

        <div
          onClick={handleConfirmedCardClick}
          role="button"
          tabIndex={0}
          title="Click to filter confirmed completed transactions"
          className="card stat-card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            border: isConfirmedActive ? '2px solid #16A34A' : '1px solid var(--border-color)',
            borderLeft: '4px solid #16A34A',
            backgroundColor: isConfirmedActive ? '#F0FDF4' : '#FFFFFF',
            boxShadow: isConfirmedActive ? '0 4px 14px rgba(22, 163, 74, 0.2)' : 'var(--shadow-sm)',
            transform: isConfirmedActive ? 'translateY(-2px)' : 'none',
          }}
        >
          {isConfirmedActive && (
            <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 5px', borderRadius: '4px' }}>
              ACTIVE
            </span>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Confirmed & Active</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803D', lineHeight: 1.2 }}>{stats.confirmed || 0} Done</div>
            <div style={{ fontSize: '10.5px', color: isConfirmedActive ? '#15803D' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Stock transferred</div>
          </div>
        </div>

        <div
          onClick={handleSalesCardClick}
          role="button"
          tabIndex={0}
          title="Click to filter sales consignments"
          className="card stat-card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            border: isSalesActive ? '2px solid #047857' : '1px solid var(--border-color)',
            borderLeft: '4px solid #047857',
            backgroundColor: isSalesActive ? '#ECFDF5' : '#FFFFFF',
            boxShadow: isSalesActive ? '0 4px 14px rgba(4, 120, 87, 0.2)' : 'var(--shadow-sm)',
            transform: isSalesActive ? 'translateY(-2px)' : 'none',
          }}
        >
          {isSalesActive && (
            <span style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', fontWeight: '800', backgroundColor: '#D1FAE5', color: '#047857', padding: '2px 5px', borderRadius: '4px' }}>
              ACTIVE
            </span>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sales Consignments</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#047857', lineHeight: 1.2 }}>₹{(stats.totalSalesValue || 0).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '10.5px', color: isSalesActive ? '#047857' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Commercial value</div>
          </div>
        </div>
      </div>

      {/* Active Filter Pill Bar if Filter Applied */}
      {(statusFilter || typeFilter || stateFilter || districtFilter || franchiseTypeFilter || searchTerm || (activeTab !== 'ALL' && activeTab !== '')) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '16px', border: '1.5px solid #E2E8F0', flexWrap: 'wrap', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters:</span>
            {activeTab !== 'ALL' && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#E2E8F0', color: '#1E293B', padding: '4px 10px', borderRadius: '6px' }}>
                Tab: {activeTab}
              </span>
            )}
            {stateFilter && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={13} /> State: {stateFilter}
                <button
                  type="button"
                  onClick={() => handleStateFilterChange('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1D4ED8', fontWeight: '900', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            )}
            {districtFilter && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Building2 size={13} /> District: {districtFilter}
                <button
                  type="button"
                  onClick={() => handleDistrictFilterChange('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#047857', fontWeight: '900', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            )}
            {franchiseTypeFilter && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} /> Level: {franchiseTypeFilter.replace('_', ' ')}
                <button
                  type="button"
                  onClick={() => handleFranchiseTypeFilterChange('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#7E22CE', fontWeight: '900', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            )}
            {statusFilter && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '4px 10px', borderRadius: '6px' }}>
                Status: {statusFilter}
              </span>
            )}
            {typeFilter && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', padding: '4px 10px', borderRadius: '6px' }}>
                Type: {typeFilter}
              </span>
            )}
            {searchTerm && (
              <span style={{ fontSize: '12px', fontWeight: '700', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: '6px' }}>
                Search: "{searchTerm}"
              </span>
            )}
          </div>
          <button
            onClick={handleClearAllFilters}
            style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', fontWeight: '800', cursor: 'pointer', fontSize: '12px', padding: '5px 12px', borderRadius: '6px', transition: 'all 0.2s', alignSelf: 'center' }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Main Table & Filter Container */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)' }}>
        {/* Navigation Tabs (Touch Scrollable on Mobile) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '0 12px', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[
            { id: 'ALL', label: 'All Consignments', count: stats.totalTransactions },
            { id: 'PENDING', label: 'Pending Action', count: stats.pending, highlight: stats.pending > 0 },
            { id: 'INCOMING', label: 'Incoming to Me' },
            { id: 'OUTGOING', label: 'Outgoing Transfers' },
            { id: 'DISPUTED', label: 'Disputed / Issues', count: stats.disputed, danger: stats.disputed > 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 18px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '3.5px solid #0284C7' : '3.5px solid transparent',
                color: activeTab === tab.id ? '#0284C7' : '#64748B',
                fontWeight: activeTab === tab.id ? '800' : '600',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  style={{
                    backgroundColor: tab.danger ? '#FEE2E2' : tab.highlight ? '#FEF3C7' : '#E2E8F0',
                    color: tab.danger ? '#DC2626' : tab.highlight ? '#B45309' : '#334155',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lucrative Filters Section */}
        <div style={{ padding: '16px 18px', borderBottom: '2px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
          {/* Row 1: Search & Action Buttons */}
          <div className="filter-bar-grid">
            <form onSubmit={handleSearchSubmit} className="filter-search-full" style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search transaction ID, partner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '38px', fontSize: '13.5px', height: '42px', borderRadius: '8px', border: '1.5px solid #CBD5E1', backgroundColor: '#F8FAFC' }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '42px', padding: '0 18px', fontSize: '13.5px', fontWeight: '700', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
              >
                <Search size={15} />
                <span>Search</span>
              </button>
            </form>

            <div className="filter-actions-row">
              {(stateFilter || districtFilter || franchiseTypeFilter || statusFilter || typeFilter || searchTerm) && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="btn btn-outline"
                  style={{ height: '42px', fontSize: '13px', fontWeight: '700', padding: '0 12px', borderRadius: '8px', color: '#EF4444', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                >
                  <RotateCcw size={14} />
                  <span>Reset All</span>
                </button>
              )}
              <button
                onClick={fetchTransactions}
                className="btn btn-outline"
                title="Refresh transactions"
                style={{ height: '42px', padding: '0 14px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Row 2: Territory & Partner Filter Dropdown Cards */}
          <div className="filter-selects-grid" style={{ width: '100%' }}>
            {/* State Filter Card */}
            <div className="filter-select-item" style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <MapPin size={13} color="#0284C7" style={{ flexShrink: 0 }} />
                <label style={{ fontSize: '10.5px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  State Territory
                </label>
              </div>
              <select
                className="form-control select"
                value={stateFilter}
                onChange={(e) => handleStateFilterChange(e.target.value)}
                style={{ fontSize: '12.5px', fontWeight: '600', height: '38px', padding: '6px 8px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1.5px solid #CBD5E1', width: '100%' }}
              >
                <option value="">🌐 All States</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter Card */}
            <div className="filter-select-item" style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <Building2 size={13} color="#059669" style={{ flexShrink: 0 }} />
                <label style={{ fontSize: '10.5px', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  District Territory
                </label>
              </div>
              <select
                className="form-control select"
                value={districtFilter}
                onChange={(e) => handleDistrictFilterChange(e.target.value)}
                disabled={!stateFilter}
                style={{ fontSize: '12.5px', fontWeight: '600', height: '38px', padding: '6px 8px', backgroundColor: !stateFilter ? '#F1F5F9' : '#FFFFFF', borderRadius: '6px', border: '1.5px solid #CBD5E1', width: '100%' }}
              >
                <option value="">{stateFilter ? '🏙️ All in ' + stateFilter : '🔒 Select State'}</option>
                {districtsList.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            {/* Franchise Type Filter Card */}
            <div className="filter-select-item" style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '74px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <ShieldCheck size={13} color="#7C3AED" style={{ flexShrink: 0 }} />
                <label style={{ fontSize: '10.5px', fontWeight: '800', color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Partner Level
                </label>
              </div>
              <select
                className="form-control select"
                value={franchiseTypeFilter}
                onChange={(e) => handleFranchiseTypeFilterChange(e.target.value)}
                style={{ fontSize: '12.5px', fontWeight: '600', height: '38px', padding: '6px 8px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1.5px solid #CBD5E1', width: '100%' }}
              >
                <option value="">👥 All Franchise Levels</option>
                <option value="STATE_FRANCHISE">🏛️ State Franchise</option>
                <option value="DISTRICT_FRANCHISE">🏢 District Franchise</option>
                <option value="SUB_FRANCHISE">🏪 Sub-Franchise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw className="spin" size={32} style={{ margin: '0 auto 16px', color: '#0284C7' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>Loading card consignments & transactions...</div>
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 16px', color: '#94A3B8' }} />
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>No Transactions Found</div>
            <div style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px', color: '#64748B' }}>
              {activeTab === 'PENDING'
                ? 'Great news! There are no pending shipments waiting for confirmation.'
                : 'No transactions match your selected territory / filter criteria.'}
            </div>
            {(stateFilter || districtFilter || franchiseTypeFilter || statusFilter || typeFilter || searchTerm) ? (
              <button onClick={handleClearAllFilters} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', borderRadius: '10px' }}>
                <RotateCcw size={16} /> Clear All Filters
              </button>
            ) : (
              <Link to="/transactions/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '700', borderRadius: '10px' }}>
                <Send size={16} /> Distribute Stock Now
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table-only" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table" style={{ margin: 0, width: '100%', minWidth: '1190px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '170px', minWidth: '170px' }}>TRANSACTION ID</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '210px', minWidth: '210px' }}>DATE & SENDER</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '230px', minWidth: '230px' }}>RECEIVER (BUYER) & TERRITORY</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '160px', minWidth: '160px' }}>CARDS & VALUE</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '130px', minWidth: '130px' }}>STATUS</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: '130px', minWidth: '130px' }}>PAYMENT</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '800', color: '#475569', letterSpacing: '0.6px', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', textAlign: 'right', width: '160px', minWidth: '160px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((t) => {
                    const fromPartner = t.sellerPartnerId || t.fromPartner;
                    const toPartner = t.buyerPartnerId || t.toPartner;

                    // Determine permissions
                    const isReceiver =
                      !isSuperAdmin &&
                      currentPartner?._id &&
                      (toPartner?._id || toPartner)?.toString() === currentPartner._id.toString();
                    const isSender =
                      isSuperAdmin ||
                      (currentPartner?._id &&
                        (fromPartner?._id || fromPartner)?.toString() === currentPartner._id.toString());
                    const canConfirm =
                      t.status === 'PENDING_CONFIRMATION' && (isReceiver || isSuperAdmin);
                    const canDispute =
                      t.status === 'PENDING_CONFIRMATION' && isReceiver;
                    const canCancel =
                      t.status === 'PENDING_CONFIRMATION' && isSender;
                    const canSubmitPaymentProof =
                      t.transactionType === 'SALE' &&
                      t.paymentStatus !== 'VERIFIED' &&
                      (isReceiver || isSender);
                    const canVerifyPayment =
                      isSuperAdmin &&
                      t.transactionType === 'SALE' &&
                      t.paymentStatus === 'SUBMITTED';

                    return (
                      <tr key={t._id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background-color 0.15s' }}>
                        {/* 1. Transaction ID & Type */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Link
                              to={`/transactions/${t._id}`}
                              style={{ fontWeight: '800', fontFamily: 'monospace', color: '#0284C7', fontSize: '14px', textDecoration: 'none' }}
                            >
                              {t.transactionId}
                            </Link>
                            <div>
                              <TransactionTypeBadge type={t.transactionType} />
                            </div>
                          </div>
                        </td>

                        {/* 2. Date & Sender */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginBottom: '2px' }}>
                            {new Date(t.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {fromPartner && String(fromPartner._id || fromPartner) !== String(toPartner?._id || toPartner) ? (
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                                {fromPartner.fullName || fromPartner.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'nowrap' }}>
                                <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>
                                  {fromPartner.franchiseId || fromPartner.franchiseCode}
                                </span>
                                {(fromPartner.district || fromPartner.state) && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '600', color: '#0369A1', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '2px 7px', borderRadius: '5px', whiteSpace: 'nowrap' }}>
                                    <MapPin size={11} />
                                    <span>{[fromPartner.district, fromPartner.state].filter(Boolean).join(', ')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                                Vidhyut Saathi HQ
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#0369A1', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '2px 7px', borderRadius: '5px', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                <span>🏛 Head Office (Admin)</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. Receiver / Buyer & Territory */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>
                            {toPartner?.fullName || toPartner?.name || 'Unknown Partner'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'nowrap' }}>
                            <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace', fontWeight: '600' }}>
                              {toPartner?.franchiseId || toPartner?.franchiseCode}
                            </span>
                            {toPartner?.franchiseType && (
                              <FranchiseTypeBadge type={toPartner.franchiseType} />
                            )}
                          </div>
                          {(toPartner?.district || toPartner?.state) && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '5px', marginTop: '4px', whiteSpace: 'nowrap' }}>
                              <MapPin size={12} color="#059669" />
                              <span>{[toPartner.district, toPartner.state].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Cards & Commercials */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '800', fontSize: '14.5px', color: '#0F172A' }}>
                            {t.quantity} Cards
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                            {t.transactionType === 'SALE' ? (
                              <span>
                                @ ₹{t.pricePerCard}/card = <strong style={{ color: '#16A34A', fontSize: '13px' }}>₹{(t.totalAmount || 0).toLocaleString('en-IN')}</strong>
                              </span>
                            ) : (
                              <span style={{ color: '#64748B', fontWeight: '600' }}>Stock Transfer</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Status Badge */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <TransactionStatusBadge status={t.status} />
                        </td>

                        {/* 6. Payment Badge */}
                        <td style={{ padding: '16px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {t.transactionType === 'SALE' ? (
                            <PaymentStatusBadge status={t.paymentStatus} />
                          ) : (
                            <span style={{ fontSize: '13px', color: '#94A3B8' }}>—</span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td style={{ padding: '16px 18px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {/* Receiver Confirm Button */}
                            {canConfirm && (
                              <button
                                onClick={() => openConfirmModal(t)}
                                className="btn btn-primary"
                                title="Accept stock and add to your active inventory"
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', backgroundColor: '#16A34A', borderColor: '#16A34A', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <CheckCircle2 size={14} /> Confirm
                              </button>
                            )}

                            {/* Receiver Dispute Button */}
                            {canDispute && (
                              <button
                                onClick={() => openDisputeModal(t)}
                                className="btn btn-outline"
                                title="Report shipment discrepancies or missing cards"
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#DC2626', borderColor: '#FECACA', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <AlertTriangle size={14} /> Dispute
                              </button>
                            )}

                            {/* Submit Payment Proof */}
                            {canSubmitPaymentProof && (
                              <button
                                onClick={() => openPaymentProofModal(t)}
                                className="btn btn-outline"
                                title="Submit Payment Reference"
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <Upload size={14} /> Proof
                              </button>
                            )}

                            {/* Super Admin Payment Verify */}
                            {canVerifyPayment && (
                              <button
                                onClick={() => openVerifyPaymentModal(t)}
                                className="btn btn-outline"
                                title="Verify Payment Proof"
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#047857', borderColor: '#A7F3D0', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <ShieldCheck size={14} /> Verify
                              </button>
                            )}

                            {/* Cancel Button */}
                            {canCancel && (
                              <button
                                onClick={() => openCancelModal(t)}
                                className="btn btn-outline"
                                title="Cancel consignment and release cards"
                                style={{ padding: '6px 10px', fontSize: '12px', color: '#64748B', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                              >
                                <X size={14} />
                              </button>
                            )}

                            {/* View Detail Link */}
                            <Link
                              to={`/transactions/${t._id}`}
                              className="btn btn-outline"
                              title="View Full Consignment Certificate"
                              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '14px', padding: '12px 10px' }}>
              {displayedTransactions.map((t) => {
                const fromPartner = t.sellerPartnerId || t.fromPartner;
                const toPartner = t.buyerPartnerId || t.toPartner;

                // Permissions for quick mobile actions
                const isReceiver =
                  !isSuperAdmin &&
                  currentPartner?._id &&
                  (toPartner?._id || toPartner)?.toString() === currentPartner._id.toString();
                const isSender =
                  isSuperAdmin ||
                  (currentPartner?._id &&
                    (fromPartner?._id || fromPartner)?.toString() === currentPartner._id.toString());
                const canConfirm =
                  t.status === 'PENDING_CONFIRMATION' && (isReceiver || isSuperAdmin);
                const canDispute =
                  t.status === 'PENDING_CONFIRMATION' && isReceiver;
                const canCancel =
                  t.status === 'PENDING_CONFIRMATION' && isSender;
                const canSubmitPaymentProof =
                  t.transactionType === 'SALE' &&
                  t.paymentStatus !== 'VERIFIED' &&
                  (isReceiver || isSender);
                const canVerifyPayment =
                  isSuperAdmin &&
                  t.transactionType === 'SALE' &&
                  t.paymentStatus === 'SUBMITTED';

                const isFromHQ = !fromPartner || String(fromPartner._id || fromPartner) === String(toPartner?._id || toPartner);

                return (
                  <div
                    key={t._id}
                    className="mobile-card-item"
                    onClick={() => navigate(`/transactions/${t._id}`)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '14px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Header: ID + Type & Status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', fontFamily: 'monospace', color: '#0284C7', fontSize: '13.5px' }}>
                            {t.transactionId}
                          </span>
                          <TransactionTypeBadge type={t.transactionType} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: '500' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <TransactionStatusBadge status={t.status} />
                    </div>

                    {/* Transfer Route Block (Sender -> Receiver) */}
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '10px 12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Sender */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', marginTop: '1px' }}>
                          📤
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sender</div>
                          {!isFromHQ ? (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{fromPartner.fullName || fromPartner.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'monospace' }}>{fromPartner.franchiseId || fromPartner.franchiseCode}</span>
                                {(fromPartner.district || fromPartner.state) && (
                                  <>
                                    <span>•</span>
                                    <span>📍 {[fromPartner.district, fromPartner.state].filter(Boolean).join(', ')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0369A1' }}>
                              🏛 Vidhyut Saathi HQ (Head Office)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ borderBottom: '1px dashed #CBD5E1', margin: '0 4px' }} />

                      {/* Receiver */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', marginTop: '1px' }}>
                          📥
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#047857', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Receiver (Buyer)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                              {toPartner?.fullName || toPartner?.name || 'Unknown Partner'}
                            </span>
                            {toPartner?.franchiseType && (
                              <FranchiseTypeBadge type={toPartner.franchiseType} />
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{toPartner?.franchiseId || toPartner?.franchiseCode}</span>
                            {(toPartner?.district || toPartner?.state) && (
                              <>
                                <span>•</span>
                                <span style={{ color: '#047857', fontWeight: '600' }}>📍 {[toPartner.district, toPartner.state].filter(Boolean).join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Commercials & Value Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CARDS QUANTITY</div>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0F172A' }}>
                          {t.quantity} Units <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>{t.transactionType === 'SALE' ? `@ ₹${t.pricePerCard}/card` : '(Transfer)'}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>TOTAL VALUE</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: t.transactionType === 'SALE' ? '#16A34A' : '#0284C7' }}>
                          {t.transactionType === 'SALE' ? `₹${(t.totalAmount || 0).toLocaleString('en-IN')}` : 'Stock Transfer'}
                        </div>
                      </div>
                    </div>

                    {/* Payment Status row for Sales */}
                    {t.transactionType === 'SALE' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '11px' }}>
                        <span style={{ color: '#64748B', fontWeight: '700' }}>Payment Status:</span>
                        <PaymentStatusBadge status={t.paymentStatus} />
                      </div>
                    )}

                    {/* Quick Action Buttons Row on Mobile */}
                    <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', alignItems: 'center' }}>
                      {canConfirm && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openConfirmModal(t); }}
                          className="btn btn-primary"
                          style={{ flex: 1, minWidth: '90px', padding: '8px 10px', fontSize: '12px', fontWeight: '700', backgroundColor: '#16A34A', borderColor: '#16A34A', borderRadius: '8px', justifyContent: 'center' }}
                        >
                          <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Confirm
                        </button>
                      )}
                      {canDispute && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openDisputeModal(t); }}
                          className="btn btn-outline"
                          style={{ flex: 1, minWidth: '90px', padding: '8px 10px', fontSize: '12px', fontWeight: '700', color: '#DC2626', borderColor: '#FECACA', borderRadius: '8px', justifyContent: 'center' }}
                        >
                          <AlertTriangle size={14} style={{ marginRight: '4px' }} /> Dispute
                        </button>
                      )}
                      {canSubmitPaymentProof && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPaymentProofModal(t); }}
                          className="btn btn-outline"
                          style={{ flex: 1, minWidth: '85px', padding: '8px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', justifyContent: 'center' }}
                        >
                          <Upload size={14} style={{ marginRight: '4px' }} /> Proof
                        </button>
                      )}
                      {canVerifyPayment && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openVerifyPaymentModal(t); }}
                          className="btn btn-outline"
                          style={{ flex: 1, minWidth: '90px', padding: '8px 10px', fontSize: '12px', fontWeight: '700', color: '#047857', borderColor: '#A7F3D0', borderRadius: '8px', justifyContent: 'center' }}
                        >
                          <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Verify
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCancelModal(t); }}
                          className="btn btn-outline"
                          style={{ padding: '8px 10px', fontSize: '12px', color: '#64748B', borderRadius: '8px', justifyContent: 'center' }}
                          title="Cancel Consignment"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/transactions/${t._id}`); }}
                        className="btn btn-outline"
                        style={{ flex: 1, minWidth: '90px', padding: '8px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', justifyContent: 'center', color: '#0284C7', borderColor: '#BAE6FD' }}
                      >
                        <Eye size={14} style={{ marginRight: '4px' }} /> Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination footer */}
        {pagination.pages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {displayedTransactions.length} of {pagination.total} records (Page {pagination.page} of {pagination.pages})
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-outline"
                disabled={pagination.page <= 1}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('page', (pagination.page - 1).toString());
                  setSearchParams(newParams);
                }}
                style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
              >
                Previous
              </button>
              <button
                className="btn btn-outline"
                disabled={pagination.page >= pagination.pages}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('page', (pagination.page + 1).toString());
                  setSearchParams(newParams);
                }}
                style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Confirm Receipt */}
      {activeModal === 'CONFIRM' && selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                  Confirm Consignment Receipt
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Transaction ID: {selectedTxn.transactionId}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cards in Consignment:</span>
                <span style={{ fontWeight: '800', color: '#0284C7' }}>{selectedTxn.quantity} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sender:</span>
                <span style={{ fontWeight: '600' }}>
                  {(selectedTxn.sellerPartnerId?.fullName || selectedTxn.fromPartner?.fullName || selectedTxn.fromPartner?.name || 'Vidhyut Saathi HQ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Commercial Value:</span>
                <span style={{ fontWeight: '700', color: '#16A34A' }}>₹{(selectedTxn.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              By confirming, all <strong>{selectedTxn.quantity} cards</strong> will be unlocked from pending transfer and immediately credited into your active partner inventory.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Confirmation Remarks (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Physical package received in good condition"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={actionLoading} style={{ flex: '1 1 100px' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmTransaction}
                disabled={actionLoading}
                style={{ backgroundColor: '#16A34A', borderColor: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: '1 1 160px' }}
              >
                {actionLoading ? <RefreshCw className="spin" size={16} /> : <Check size={16} />}
                Confirm & Accept Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Dispute Shipment */}
      {activeModal === 'DISPUTE' && selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#DC2626' }}>
                  Dispute Consignment Shipment
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Transaction ID: {selectedTxn.transactionId}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Disputing this consignment will freeze the transfer, alert HQ compliance, and prevent inventory ownership update until resolution.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Reason for Dispute</label>
              <select
                className="form-control"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                style={{ fontSize: '13px' }}
              >
                <option value="QUANTITY_MISMATCH">Quantity Mismatch (Received count differs)</option>
                <option value="WRONG_SERIALS">Wrong Serial Numbers (Does not match cards)</option>
                <option value="DAMAGED_CARDS">Damaged Cards / Package Tampered</option>
                <option value="CARD_DEFECT">Card Chip / Manufacturing Defect</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Detailed Dispute Notes <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Explain in detail what the discrepancy is..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={actionLoading} style={{ flex: '1 1 100px' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDisputeTransaction}
                disabled={actionLoading || !modalNotes.trim()}
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: '1 1 150px' }}
              >
                {actionLoading ? <RefreshCw className="spin" size={16} /> : <AlertTriangle size={16} />}
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Submit Payment Proof */}
      {activeModal === 'PAYMENT_PROOF' && selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                  Submit Payment Reference
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Total Amount Due: <strong>₹{(selectedTxn.totalAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Payment Mode</label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ fontSize: '13px' }}
              >
                <option value="UPI">UPI / QR Code Transfer</option>
                <option value="BANK_TRANSFER">NEFT / RTGS / IMPS Bank Transfer</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Cash Deposit / Settlement</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>UTR / Reference / Transaction ID <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UPI/123456789012 or NEFT12345678"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                style={{ fontSize: '13px', fontWeight: '600' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Remarks / Bank Notes (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Paid via HDFC Bank Current Account"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={actionLoading} style={{ flex: '1 1 100px' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitPaymentProof}
                disabled={actionLoading || !paymentReference.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: '1 1 160px' }}
              >
                {actionLoading ? <RefreshCw className="spin" size={16} /> : <Check size={16} />}
                Submit Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Super Admin Verify Payment */}
      {activeModal === 'VERIFY_PAYMENT' && selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                  Verify Consignment Payment
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Transaction ID: {selectedTxn.transactionId}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Reference (UTR):</span>
                <span style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedTxn.paymentReference || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span>
                <span style={{ fontWeight: '600' }}>{selectedTxn.paymentMethod || 'UPI'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expected Settlement:</span>
                <span style={{ fontWeight: '800', color: '#16A34A' }}>₹{(selectedTxn.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Audit Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bank statement verified on HDFC portal"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleVerifyPayment(false)}
                disabled={actionLoading}
                style={{ color: '#DC2626', borderColor: '#FECACA', flex: '1 1 110px' }}
              >
                Reject Proof
              </button>

              <div style={{ display: 'flex', gap: '8px', flex: '1 1 180px' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={actionLoading} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleVerifyPayment(true)}
                  disabled={actionLoading}
                  style={{ backgroundColor: '#15803D', borderColor: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1.5 }}
                >
                  {actionLoading ? <RefreshCw className="spin" size={16} /> : <Check size={16} />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Cancel Transaction */}
      {activeModal === 'CANCEL' && selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <XCircle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                  Cancel Consignment
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Transaction ID: {selectedTxn.transactionId}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Are you sure you want to cancel this consignment? The <strong>{selectedTxn.quantity} locked cards</strong> will be immediately released and restored back to available stock.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Cancellation Reason (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Created by mistake / partner requested delay"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={actionLoading} style={{ flex: '1 1 100px' }}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCancelTransaction}
                disabled={actionLoading}
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: '1 1 160px' }}
              >
                {actionLoading ? <RefreshCw className="spin" size={16} /> : <X size={16} />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
