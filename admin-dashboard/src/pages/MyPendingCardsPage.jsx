import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Clock,
  CreditCard,
  Zap,
  Search,
  RefreshCw,
  Send,
  UserPlus,
  Check,
  Copy,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  Building2,
  Eye,
  X,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const MyPendingCardsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [ranges, setRanges] = useState([]);
  const [individualCards, setIndividualCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(querySearch ? 'INDIVIDUAL' : 'RANGES'); // 'RANGES' | 'INDIVIDUAL'
  const [search, setSearch] = useState(querySearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedSerial, setCopiedSerial] = useState(null);
  const [selectedBatchModal, setSelectedBatchModal] = useState(null);

  const [stats, setStats] = useState({
    totalPending: 0,
    readyToInstall: 0,
    recentBatches: 0,
    blockedCount: 0,
    transferredToSubs: 0,
    subFranchisesCount: 0,
    totalAllotted: 0,
  });

  const fetchPendingStock = async () => {
    try {
      setLoading(true);
      const partnerIdParam = isSuperAdmin ? (partner?._id || undefined) : partner?._id;

      // Fetch batch ranges and card status
      const [rangesRes, statsRes] = await Promise.all([
        api.get('/cards/ranges', {
          params: {
            ownerId: partnerIdParam || 'PARTNERS',
            status: 'ASSIGNED',
          },
        }).catch(() => ({ data: { data: [] } })),
        api.get('/cards/stats', {
          params: {
            ownerId: partnerIdParam || undefined,
          },
        }).catch(() => ({ data: { data: {} } })),
      ]);

      const rawRanges = rangesRes.data?.data;
      const rangeList = Array.isArray(rawRanges?.ranges)
        ? rawRanges.ranges
        : Array.isArray(rawRanges)
        ? rawRanges
        : [];

      // Expand all historical batches for this partner so every batch is displayed
      const expandedRanges = [];
      let totalBatches = 0;
      let totalCardsCount = 0;

      rangeList.forEach((r) => {
        if (Array.isArray(r.history) && r.history.length > 0) {
          totalBatches += r.history.length;
          r.history.forEach((batchItem, bIdx) => {
            const count = batchItem.totalCards || batchItem.count || 0;
            totalCardsCount += count;
            expandedRanges.push({
              ...batchItem,
              count,
              batchId: batchItem.batchId || `Batch #${r.history.length - bIdx}`,
              assignedAt: batchItem.assignedAt || r.assignedAt,
              assignedBy: batchItem.assignedBy || r.assignedBy,
              parentPartnerTotal: r.partnerTotalCards || count,
            });
          });
        } else {
          totalBatches += 1;
          const count = r.partnerTotalCards || r.totalCards || r.count || 0;
          totalCardsCount += count;
          expandedRanges.push({
            ...r,
            count,
          });
        }
      });

      setRanges(expandedRanges.length > 0 ? expandedRanges : rangeList);

      const statData = statsRes.data?.data || {};
      const realAssigned = statData.assigned ?? totalCardsCount ?? 0;
      const transferredCount = statData.transferredToSubs ?? statData.transferred ?? 0;
      const subCount = statData.subFranchisesCount ?? 0;
      const totalAllotted = statData.totalAllotted ?? statData.total ?? (realAssigned + transferredCount);

      setStats({
        totalPending: realAssigned,
        readyToInstall: statData.myAvailableStock ?? realAssigned,
        recentBatches: totalBatches || (expandedRanges.length > 0 ? expandedRanges.length : (rangeList.length > 0 ? rangeList.length : (realAssigned > 0 ? 1 : 0))),
        transferredToSubs: transferredCount,
        subFranchisesCount: subCount,
        totalAllotted: totalAllotted,
      });

      // If in individual mode or search active, fetch cards list
      if (viewMode === 'INDIVIDUAL' || search.trim()) {
        const cardsRes = await api.get('/cards', {
          params: {
            limit: 40,
            search: search.trim() || undefined,
            ownerId: partnerIdParam || undefined,
            status: statusFilter !== 'ALL' ? statusFilter : 'ASSIGNED',
          },
        });
        setIndividualCards(cardsRes.data?.data?.cards || []);
      }
    } catch (err) {
      showToast('Failed to fetch pending card inventory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (querySearch) {
      setViewMode('INDIVIDUAL');
      setSearch(querySearch);
    }
  }, [querySearch]);

  useEffect(() => {
    fetchPendingStock();
  }, [viewMode, statusFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setViewMode('INDIVIDUAL');
    fetchPendingStock();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSerial(text);
    showToast(`"${text}" copied to clipboard!`, 'success');
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">My Pending Cards</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
              In-hand card inventory currently in your custody waiting to be installed at customer premises.
            </p>
          </div>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchPendingStock} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/customers/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} />
            <span>+ Install to Customer</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <StatCard
          title="Total Pending Cards"
          value={stats.totalPending}
          subtitle="In-hand uninstalled stock in custody"
          icon={Clock}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderLeftColor="#d97706"
          onClick={() => {}}
        />
        <StatCard
          title="Ready for Installation"
          value={stats.readyToInstall}
          subtitle="Active & ready to deploy at customers"
          icon={CreditCard}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          borderLeftColor="#0284c7"
          onClick={() => {}}
        />
        <StatCard
          title="Allotted Batches"
          value={`${stats.recentBatches} Batches`}
          subtitle={`Total received from HQ (${stats.totalAllotted || stats.totalPending} cards)`}
          icon={Package}
          bgLight="#faf5ff"
          iconColor="#9333ea"
          borderLeftColor="#9333ea"
          onClick={() => {}}
        />
        <StatCard
          title="Transferred to Sub-Franchise"
          value={stats.transferredToSubs || 0}
          subtitle={
            stats.subFranchisesCount > 0
              ? `${stats.subFranchisesCount} Sub-Franchise${stats.subFranchisesCount > 1 ? 's' : ''} network stock →`
              : (stats.transferredToSubs > 0 ? `${stats.transferredToSubs} Cards transferred →` : '0 Sub-franchises appointed yet')
          }
          icon={Building2}
          bgLight="#f1f5f9"
          iconColor="#64748b"
          borderLeftColor="#94a3b8"
          onClick={() => navigate('/my-sub-franchises')}
        />
      </div>

      {/* Clear Guidance Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12.5px', color: '#1e3a8a', lineHeight: '1.4' }}>
          <strong>Inventory Breakdown:</strong> Admin HQ dwara aapko kul <strong>{stats.totalAllotted || stats.totalPending} Cards</strong> assign kiye gaye hain, jisme se <strong>{stats.totalPending} Cards</strong> aapke paas physical custody me hain aur <strong>{stats.transferredToSubs || 0} Cards</strong> sub-franchise network ko transfer ho chuke hain.
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* View Mode Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setViewMode('RANGES')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                border: viewMode === 'RANGES' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                backgroundColor: viewMode === 'RANGES' ? '#fef3c7' : '#ffffff',
                color: viewMode === 'RANGES' ? '#92400e' : '#64748b',
                cursor: 'pointer',
              }}
            >
              <Package size={14} color={viewMode === 'RANGES' ? '#d97706' : '#94a3b8'} />
              <span>Consignment Ranges</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('INDIVIDUAL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                border: viewMode === 'INDIVIDUAL' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                backgroundColor: viewMode === 'INDIVIDUAL' ? '#fef3c7' : '#ffffff',
                color: viewMode === 'INDIVIDUAL' ? '#92400e' : '#64748b',
                cursor: 'pointer',
              }}
            >
              <CreditCard size={14} color={viewMode === 'INDIVIDUAL' ? '#d97706' : '#94a3b8'} />
              <span>Individual Serials</span>
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', maxWidth: '380px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search serial number (e.g. VS001223)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '12.5px', flexShrink: 0 }}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Main Table: Ranges View */}
      {viewMode === 'RANGES' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '1080px', margin: 0, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>CONSIGNMENT / BATCH</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>SERIAL NUMBER RANGE</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>PENDING QUANTITY</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>RECEIVED DATE</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>STATUS</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '800', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                      Loading pending card consignments...
                    </td>
                  </tr>
                ) : (!Array.isArray(ranges) || ranges.length === 0) ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '44px 20px', textAlign: 'center' }}>
                      <ShieldCheck size={36} color="#16a34a" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>All Cards Installed / Zero Pending Stock</div>
                      <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 14px' }}>
                        You currently have no uninstalled card stock in your inventory.
                      </p>
                      <Link to="/cards" className="btn btn-outline" style={{ fontSize: '12.5px' }}>
                        View Full Inventory History
                      </Link>
                    </td>
                  </tr>
                ) : (
                  ranges.map((range, idx) => {
                    const fromSerial = range.startSerial || range.firstSerial || range.serials?.[0] || 'N/A';
                    const toSerial = range.endSerial || range.lastSerial || range.serials?.[range.serials?.length - 1] || fromSerial;
                    const cardCount = range.count || range.totalCards || (range.serials ? range.serials.length : 0);
                    const batchTitle = range.batchId && range.batchId.length > 5 && !range.batchId.startsWith('Batch')
                      ? range.batchId
                      : `Consignment Lot #${ranges.length - idx}`;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                        {/* 1. Consignment Batch Info */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <Package size={16} color="#d97706" />
                            <span>{batchTitle}</span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                            Allotted from: <strong style={{ color: '#334155' }}>Admin Central HQ</strong>
                          </div>
                        </td>

                        {/* 2. Serial Number Range with clear start & end */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontFamily: 'monospace',
                                fontWeight: '800',
                                fontSize: '13px',
                                color: '#0369a1',
                                background: '#f0f9ff',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1.5px solid #bae6fd',
                                letterSpacing: '0.4px',
                              }}
                            >
                              <span>{fromSerial}</span>
                              <ArrowRight size={14} color="#0284c7" />
                              <span>{toSerial}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(`${fromSerial} - ${toSerial}`)}
                              title="Copy Serial Range"
                              style={{
                                background: copiedSerial === `${fromSerial} - ${toSerial}` ? '#dcfce7' : '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                color: copiedSerial === `${fromSerial} - ${toSerial}` ? '#16a34a' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {copiedSerial === `${fromSerial} - ${toSerial}` ? (
                                <>
                                  <Check size={12} color="#16a34a" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 3. Pending Quantity */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '5px 14px',
                              borderRadius: '20px',
                              fontSize: '12.5px',
                              fontWeight: '800',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cardCount} Cards
                          </span>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', fontWeight: '500' }}>
                            Uninstalled in hand
                          </div>
                        </td>

                        {/* 4. Received Date */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            {range.assignedAt
                              ? new Date(range.assignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '14 Sept 2026'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
                            <span>Active In Custody</span>
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '11.5px',
                              fontWeight: '800',
                              letterSpacing: '0.4px',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            READY TO INSTALL
                          </span>
                        </td>

                        {/* 6. Action */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedBatchModal({
                                ...range,
                                fromSerial,
                                toSerial,
                                count: cardCount,
                                batchTitle,
                              })}
                              className="btn btn-outline"
                              style={{
                                fontSize: '12px',
                                padding: '7px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Eye size={14} />
                              <span>View Serials</span>
                            </button>
                            <Link
                              to={`/customers/new`}
                              className="btn btn-primary"
                              style={{
                                fontSize: '12px',
                                padding: '7px 15px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Zap size={14} />
                              <span>Install Now</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Individual Serials View */
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>SERIAL NUMBER</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>BATCH / CONSIGNMENT</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>ALLOTTED DATE</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {individualCards.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No individual pending cards found matching query.
                    </td>
                  </tr>
                ) : (
                  individualCards.map((card) => (
                    <tr key={card._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '13px', color: '#0369a1' }}>
                            {card.serialNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(card.serialNumber)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            title="Copy Serial Number"
                          >
                            {copiedSerial === card.serialNumber ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#475569' }}>
                        {card.batchId || 'Admin HQ Consignment'}
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#475569' }}>
                        {card.assignedAt ? new Date(card.assignedAt).toLocaleDateString('en-IN') : '14 Sept 2026'}
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: '800',
                          }}
                        >
                          {card.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <Link
                          to={`/customers/new`}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 10px', height: '30px' }}
                        >
                          Install
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Serials Modal */}
      {selectedBatchModal && (
        <Modal
          isOpen={!!selectedBatchModal}
          onClose={() => setSelectedBatchModal(null)}
          title={`Consignment Details: ${selectedBatchModal.batchTitle || 'Batch'}`}
          maxWidth="680px"
        >
          <div>
            {/* Summary card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TOTAL CARDS</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {selectedBatchModal.count} Cards
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>START SERIAL</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1', fontFamily: 'monospace', marginTop: '4px' }}>
                  {selectedBatchModal.fromSerial}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>END SERIAL</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1', fontFamily: 'monospace', marginTop: '4px' }}>
                  {selectedBatchModal.toSerial}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                Included Serial Numbers ({selectedBatchModal.serials?.length || selectedBatchModal.count})
              </h4>
              <button
                type="button"
                onClick={() => handleCopy(`${selectedBatchModal.fromSerial} - ${selectedBatchModal.toSerial}`)}
                className="btn btn-outline"
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px' }}
              >
                <Copy size={12} />
                <span>Copy Full Range</span>
              </button>
            </div>

            {/* Serial Numbers Grid */}
            <div
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                gap: '6px',
                background: '#fafafa',
              }}
            >
              {Array.isArray(selectedBatchModal.serials) && selectedBatchModal.serials.length > 0 ? (
                selectedBatchModal.serials.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: '#0f172a',
                    }}
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                      title="Copy"
                    >
                      {copiedSerial === s ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  Sequential range from <strong>{selectedBatchModal.fromSerial}</strong> to <strong>{selectedBatchModal.toSerial}</strong> ({selectedBatchModal.count} cards).
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedBatchModal(null)}
                className="btn btn-outline"
                style={{ fontSize: '12px', padding: '7px 14px' }}
              >
                Close
              </button>
              <Link
                to="/customers/new"
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Zap size={14} />
                <span>Install Card From This Lot</span>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyPendingCardsPage;
