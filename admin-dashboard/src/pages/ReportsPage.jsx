import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  Building2,
  Users,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Clock,
  User,
  MapPin,
  Activity,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';

const ReportsPage = () => {
  const { isSuperAdmin, isPartner, partner } = useAuth();
  const [activeTab, setActiveTab] = useState('card-movements');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState({ records: [], pagination: { total: 0, page: 1, totalPages: 1 } });
  const { showToast } = useNotification();

  // Dynamic Tabs based on user role
  const reportTabs = useMemo(() => {
    if (partner?.franchiseType === 'SUB_FRANCHISE') {
      return [
        { id: 'card-movements', label: 'My Card Movements Ledger', icon: CreditCard },
        { id: 'partner-inventory', label: 'My In-Hand Inventory', icon: Building2 },
        { id: 'installations', label: 'My Installations & Load', icon: Users },
        { id: 'p2p-transactions', label: 'My Card Transfers & Purchases', icon: Send },
        { id: 'payments', label: 'Payment Verifications', icon: CheckCircle2 },
        { id: 'disputes', label: 'Disputes & Claims', icon: AlertCircle },
      ];
    }
    if (partner?.franchiseType === 'STATE_FRANCHISE' || partner?.franchiseType === 'DISTRICT_FRANCHISE') {
      return [
        { id: 'card-movements', label: 'Territory Card Movements', icon: CreditCard },
        { id: 'partner-inventory', label: 'Territory Partner Inventory', icon: Building2 },
        { id: 'installations', label: 'Territory Installations & Load', icon: Users },
        { id: 'p2p-transactions', label: 'P2P Sales & Distribution', icon: Send },
        { id: 'payments', label: 'Payment Verifications', icon: CheckCircle2 },
        { id: 'disputes', label: 'Disputes & Claims', icon: AlertCircle },
      ];
    }
    return [
      { id: 'card-movements', label: 'Card Movements Ledger', icon: CreditCard },
      { id: 'partner-inventory', label: 'Partner Inventory Ledger', icon: Building2 },
      { id: 'installations', label: 'Installations & Load', icon: Users },
      { id: 'p2p-transactions', label: 'P2P Sales & Consignments', icon: Send },
      { id: 'payments', label: 'Payment Verifications', icon: CheckCircle2 },
      { id: 'disputes', label: 'Disputes & Claims', icon: AlertCircle },
    ];
  }, [partner]);

  // Common Filter State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statesList, setStatesList] = useState([]);

  // Fetch States for Filter
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/territories/states');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setStatesList(res.data.data);
        }
      } catch {}
    };
    fetchStates();
  }, []);

  // Fetch Report Records
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: search.trim(),
        startDate,
        endDate,
        state: stateFilter,
        status: statusFilter,
        paymentStatus: statusFilter,
        verificationStatus: statusFilter,
      };

      const res = await api.get(`/reports/${activeTab}`, { params });
      if (res.data?.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch report data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, search, startDate, endDate, stateFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Tab Switch
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setSearch('');
    setStatusFilter('');
  };

  // Handle Export CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {
        search: search.trim(),
        startDate,
        endDate,
        state: stateFilter,
        status: statusFilter,
      };

      const res = await api.get(`/reports/export/${activeTab}`, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vidhyut-saathi-${activeTab}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Report exported successfully as CSV!', 'success');
    } catch {
      showToast('Failed to export CSV report.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <FileText size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isPartner ? 'Franchise Ledgers & Reports' : 'Executive Reports & Ledgers'}
            </h1>
            <p className="page-subtitle">
              {isPartner
                ? `Detailed operational records, card tracking, customer installations, and settlement ledgers for ${partner?.fullName || 'your franchise'} (${partner?.franchiseId || ''}).`
                : 'Comprehensive operational reporting across card movements, partner inventory, sales, installations, and disputes.'}
            </p>
          </div>
        </div>
        <div className="page-header-actions-grid">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={15} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu (Touch-Friendly Horizontal Scroll) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {reportTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                background: isActive ? '#0284c7' : '#f8fafc',
                color: isActive ? '#ffffff' : '#64748b',
                boxShadow: isActive ? '0 1px 3px rgba(2, 132, 199, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <div className="filter-bar-grid">
          <div className="filter-search-full">
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Search Term
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search serial, ID, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px 8px 32px' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
            </div>
          </div>

          <div className="filter-selects-grid">
            <div className="filter-select-item filter-full-width">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                State Filter
              </label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12.5px', padding: '8px 10px' }}
              >
                <option value="">All States</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '7px 8px' }}
              />
            </div>

            <div className="filter-select-item">
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '12px', padding: '7px 8px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Table Card Container */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
            Total Records Found: <span style={{ color: '#0284c7' }}>{reportData.pagination?.total || 0}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Page {reportData.pagination?.page || 1} of {reportData.pagination?.totalPages || 1}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP TABLES (100% Intact & Untouched)                 */}
        {/* ========================================================= */}
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            {/* 1. CARD MOVEMENTS TABLE */}
            {activeTab === 'card-movements' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Card Serial</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                    <th style={{ padding: '12px 16px' }}>From</th>
                    <th style={{ padding: '12px 16px' }}>To</th>
                    <th style={{ padding: '12px 16px' }}>New Status</th>
                    <th style={{ padding: '12px 16px' }}>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(r.timestamp).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{r.serialNumber}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {r.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {r.fromOwnerId ? `${r.fromOwnerId.fullName} (${r.fromOwnerId.franchiseId})` : r.fromOwnerType || 'HQ'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {r.toOwnerId ? `${r.toOwnerId.fullName} (${r.toOwnerId.franchiseId})` : r.toOwnerType || 'HQ'}
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={r.newStatus} /></td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.performedBy?.name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 2. PARTNER INVENTORY LEDGER */}
            {activeTab === 'partner-inventory' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Franchise ID</th>
                    <th style={{ padding: '12px 16px' }}>Partner Name</th>
                    <th style={{ padding: '12px 16px' }}>Franchise Type</th>
                    <th style={{ padding: '12px 16px' }}>Territory</th>
                    <th style={{ padding: '12px 16px' }}>In Hand Available</th>
                    <th style={{ padding: '12px 16px' }}>Pending Transfer</th>
                    <th style={{ padding: '12px 16px' }}>Installed</th>
                    <th style={{ padding: '12px 16px' }}>Total In Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{p.franchiseId}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{p.fullName}</td>
                      <td style={{ padding: '12px 16px' }}><FranchiseTypeBadge type={p.franchiseType} /></td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{p.district}, {p.state}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{p.availableInHand}</td>
                      <td style={{ padding: '12px 16px', color: '#f59e0b' }}>{p.pendingTransfer}</td>
                      <td style={{ padding: '12px 16px', color: '#0284c7' }}>{p.installed}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{p.totalCards}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 3. INSTALLATIONS REPORT */}
            {activeTab === 'installations' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Installation ID</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Customer</th>
                    <th style={{ padding: '12px 16px' }}>Partner</th>
                    <th style={{ padding: '12px 16px' }}>Cards</th>
                    <th style={{ padding: '12px 16px' }}>Load (kW)</th>
                    <th style={{ padding: '12px 16px' }}>Amount (INR)</th>
                    <th style={{ padding: '12px 16px' }}>GPS Match</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((inst) => (
                    <tr key={inst._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{inst.installationId}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(inst.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{inst.customerId?.fullName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{inst.customerType}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {inst.partnerId?.fullName} ({inst.partnerId?.franchiseId})
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{inst.installedCardCount}</td>
                      <td style={{ padding: '12px 16px', color: '#0369a1' }}>{inst.connectedLoadKw} kW</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                        ₹{inst.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {inst.locationVerificationId ? (
                          inst.locationVerificationId.territoryMatch ? (
                            <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>MATCH</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 700 }}>MISMATCH</span>
                          )
                        ) : (
                          <span style={{ color: '#94a3b8' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {inst.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 4. P2P TRANSACTIONS */}
            {activeTab === 'p2p-transactions' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Seller Partner</th>
                    <th style={{ padding: '12px 16px' }}>Buyer Partner</th>
                    <th style={{ padding: '12px 16px' }}>Quantity</th>
                    <th style={{ padding: '12px 16px' }}>Price/Card</th>
                    <th style={{ padding: '12px 16px' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((tx) => (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{tx.transactionId}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>{tx.sellerPartnerId?.fullName} ({tx.sellerPartnerId?.franchiseId})</td>
                      <td style={{ padding: '12px 16px' }}>{tx.buyerPartnerId?.fullName} ({tx.buyerPartnerId?.franchiseId})</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{tx.quantity}</td>
                      <td style={{ padding: '12px 16px' }}>₹{tx.pricePerCard?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>₹{tx.totalAmount?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={tx.status} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: tx.paymentStatus === 'VERIFIED' ? '#16a34a' : '#f59e0b' }}>
                          {tx.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 5. PAYMENTS REPORT */}
            {activeTab === 'payments' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                    <th style={{ padding: '12px 16px' }}>Amount (INR)</th>
                    <th style={{ padding: '12px 16px' }}>Seller Partner</th>
                    <th style={{ padding: '12px 16px' }}>Buyer Partner</th>
                    <th style={{ padding: '12px 16px' }}>Payment Status</th>
                    <th style={{ padding: '12px 16px' }}>Reference</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{p.transactionId}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>₹{p.totalAmount?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>{p.sellerPartnerId?.fullName} ({p.sellerPartnerId?.franchiseId})</td>
                      <td style={{ padding: '12px 16px' }}>{p.buyerPartnerId?.fullName} ({p.buyerPartnerId?.franchiseId})</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: p.paymentStatus === 'VERIFIED' ? '#dcfce7' : '#fef3c7', color: p.paymentStatus === 'VERIFIED' ? '#16a34a' : '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.paymentReference || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 6. DISPUTES REPORT */}
            {activeTab === 'disputes' && (
              <>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                    <th style={{ padding: '12px 16px' }}>Dispute Reason</th>
                    <th style={{ padding: '12px 16px' }}>Disputed By</th>
                    <th style={{ padding: '12px 16px' }}>Seller</th>
                    <th style={{ padding: '12px 16px' }}>Buyer</th>
                    <th style={{ padding: '12px 16px' }}>Amount (INR)</th>
                    <th style={{ padding: '12px 16px' }}>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.records?.map((d) => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>{d.transactionId}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#e11d48' }}>{d.disputeReason}</td>
                      <td style={{ padding: '12px 16px' }}>{d.disputedBy?.name}</td>
                      <td style={{ padding: '12px 16px' }}>{d.sellerPartnerId?.fullName}</td>
                      <td style={{ padding: '12px 16px' }}>{d.buyerPartnerId?.fullName}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>₹{d.totalAmount?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontStyle: 'italic' }}>{d.disputeComments || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>

        {/* ========================================================= */}
        {/* MOBILE TOUCH CARDS (Lucrative Responsive Cards)           */}
        {/* ========================================================= */}
        <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {/* 1. Mobile Card Movements */}
          {activeTab === 'card-movements' &&
            reportData.records?.map((r) => (
              <div
                key={r._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Serial Number & Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={14} />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {r.serialNumber}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                      {r.action}
                    </span>
                    <StatusBadge status={r.newStatus} />
                  </div>
                </div>

                {/* Transfer Pathway Flow Banner */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>From Origin</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.fromOwnerId ? r.fromOwnerId.fullName : r.fromOwnerType || 'HQ'}
                    </div>
                    {r.fromOwnerId?.franchiseId && (
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace' }}>({r.fromOwnerId.franchiseId})</div>
                    )}
                  </div>

                  <div style={{ color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                    <ArrowRight size={15} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>To Destination</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.toOwnerId ? r.toOwnerId.fullName : r.toOwnerType || 'Headquarters'}
                    </div>
                    {r.toOwnerId?.franchiseId && (
                      <div style={{ fontSize: '10.5px', color: '#0284c7', fontFamily: 'monospace' }}>({r.toOwnerId.franchiseId})</div>
                    )}
                  </div>
                </div>

                {/* Actor & Timestamp Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', paddingTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} color="#94a3b8" />
                    <span>Actor: <strong style={{ color: '#334155' }}>{r.performedBy?.name || 'System'}</strong></span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                    <Clock size={12} />
                    <span>{new Date(r.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
              </div>
            ))}

          {/* 2. Mobile Partner Inventory */}
          {activeTab === 'partner-inventory' &&
            reportData.records?.map((p) => (
              <div
                key={p._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{p.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', fontWeight: 700, marginTop: '1px' }}>
                      {p.franchiseId}
                    </div>
                  </div>
                  <FranchiseTypeBadge type={p.franchiseType} />
                </div>

                <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="#94a3b8" />
                  <span>{p.district ? `${p.district}, ${p.state}` : p.state || 'N/A'}</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    background: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>In Hand Available</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#16a34a' }}>{p.availableInHand} Cards</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pending Transfer</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#f59e0b' }}>{p.pendingTransfer} Cards</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Installed</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0284c7' }}>{p.installed} Cards</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total In Ownership</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{p.totalCards} Cards</div>
                  </div>
                </div>
              </div>
            ))}

          {/* 3. Mobile Installations */}
          {activeTab === 'installations' &&
            reportData.records?.map((inst) => (
              <div
                key={inst._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #16a34a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                    {inst.installationId}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {inst.locationVerificationId ? (
                      inst.locationVerificationId.territoryMatch ? (
                        <span style={{ color: '#16a34a', fontSize: '10.5px', fontWeight: 700, background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px' }}>MATCH</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: 700, background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>MISMATCH</span>
                      )
                    ) : null}
                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600 }}>
                      {inst.verificationStatus}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Customer: </span>
                    <strong style={{ color: '#0f172a' }}>{inst.customerId?.fullName}</strong>{' '}
                    <span style={{ color: '#64748b', fontSize: '10.5px' }}>({inst.customerType})</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Partner: </span>
                    <strong style={{ color: '#0f172a' }}>{inst.partnerId?.fullName}</strong>{' '}
                    <span style={{ color: '#0284c7', fontSize: '10.5px' }}>({inst.partnerId?.franchiseId})</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '4px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Cards</div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{inst.installedCardCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Load</div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0284c7' }}>{inst.connectedLoadKw} kW</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Amount</div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16a34a' }}>₹{inst.totalAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  Date: {new Date(inst.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}

          {/* 4. Mobile P2P Transactions */}
          {activeTab === 'p2p-transactions' &&
            reportData.records?.map((tx) => (
              <div
                key={tx._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #7e22ce',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                    {tx.transactionId}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <StatusBadge status={tx.status} />
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: tx.paymentStatus === 'VERIFIED' ? '#16a34a' : '#f59e0b' }}>
                      {tx.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Transfer Route */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Seller</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.sellerPartnerId?.fullName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>({tx.sellerPartnerId?.franchiseId})</div>
                  </div>

                  <div style={{ color: '#7e22ce', padding: '0 4px', flexShrink: 0 }}>
                    <ArrowRight size={15} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Buyer</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.buyerPartnerId?.fullName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#0284c7', fontFamily: 'monospace' }}>({tx.buyerPartnerId?.franchiseId})</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                    {tx.quantity} Cards
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>₹{tx.pricePerCard?.toLocaleString('en-IN')}/card • </span>
                    <strong style={{ color: '#16a34a', fontSize: '13.5px' }}>₹{tx.totalAmount?.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  Date: {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}

          {/* 5. Mobile Payments */}
          {activeTab === 'payments' &&
            reportData.records?.map((p) => (
              <div
                key={p._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #16a34a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                    {p.transactionId}
                  </span>
                  <span style={{ background: p.paymentStatus === 'VERIFIED' ? '#dcfce7' : '#fef3c7', color: p.paymentStatus === 'VERIFIED' ? '#16a34a' : '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                    {p.paymentStatus}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Seller: </span>
                    <strong style={{ color: '#0f172a' }}>{p.sellerPartnerId?.fullName}</strong>{' '}
                    <span style={{ color: '#64748b', fontSize: '10.5px' }}>({p.sellerPartnerId?.franchiseId})</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Buyer: </span>
                    <strong style={{ color: '#0f172a' }}>{p.buyerPartnerId?.fullName}</strong>{' '}
                    <span style={{ color: '#0284c7', fontSize: '10.5px' }}>({p.buyerPartnerId?.franchiseId})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Ref: <strong style={{ color: '#334155' }}>{p.paymentReference || 'N/A'}</strong>
                  </span>
                  <strong style={{ color: '#16a34a', fontSize: '14.5px' }}>
                    ₹{p.totalAmount?.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  Date: {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}

          {/* 6. Mobile Disputes */}
          {activeTab === 'disputes' &&
            reportData.records?.map((d) => (
              <div
                key={d._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fecdd3',
                  borderLeft: '4px solid #dc2626',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>
                    {d.transactionId}
                  </span>
                  <span style={{ background: '#ffe4e6', color: '#e11d48', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                    {d.disputeReason}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Disputed By: <strong style={{ color: '#0f172a' }}>{d.disputedBy?.name || 'N/A'}</strong>
                </div>

                <div style={{ background: '#fff1f2', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>
                    <span style={{ color: '#9f1239', fontSize: '11px' }}>Seller: </span>
                    <strong>{d.sellerPartnerId?.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9f1239', fontSize: '11px' }}>Buyer: </span>
                    <strong>{d.buyerPartnerId?.fullName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    {d.disputeComments || 'No comments'}
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                    ₹{d.totalAmount?.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            ))}
        </div>

        {(!reportData.records || reportData.records.length === 0) && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            No records found matching the active filter criteria.
          </div>
        )}

        {/* Pagination Bar */}
        {reportData.pagination?.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {page} / {reportData.pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= reportData.pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

