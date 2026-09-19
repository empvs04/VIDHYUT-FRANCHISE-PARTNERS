import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Zap,
  Home,
  Building,
  Factory,
  Search,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const MyInstalledCardsPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('ALL'); // 'ALL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL'
  const [verificationStatus, setVerificationStatus] = useState('ALL');
  const [copiedSerial, setCopiedSerial] = useState(null);

  // Category & Total Cards Metrics
  const [stats, setStats] = useState({
    totalCards: 0,
    totalInstallations: 0,
    residentialCards: 0,
    commercialCards: 0,
    industrialCards: 0,
    verifiedCount: 0,
    pendingVerificationCount: 0,
  });

  const fetchInstallations = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        customerType: customerType !== 'ALL' ? customerType : undefined,
        verificationStatus: verificationStatus !== 'ALL' ? verificationStatus : undefined,
        source: 'MY_INSTALLATIONS',
        partnerId: isSuperAdmin ? (partner?._id || undefined) : undefined,
      };

      const res = await api.get('/installations', { params });
      if (res.data?.data) {
        const data = res.data.data;
        const list = Array.isArray(data?.installations) ? data.installations : (Array.isArray(data) ? data : []);
        setInstallations(list);
        setPagination(data.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

        // Calculate card metrics
        let resSum = 0;
        let commSum = 0;
        let indSum = 0;
        let totalC = 0;
        let verified = 0;
        let pending = 0;

        list.forEach((inst) => {
          const cardCount = inst.cardSerialNumbers?.length || inst.cardIds?.length || 1;
          totalC += cardCount;
          if (inst.customerType === 'RESIDENTIAL') resSum += cardCount;
          else if (inst.customerType === 'COMMERCIAL') commSum += cardCount;
          else if (inst.customerType === 'INDUSTRIAL') indSum += cardCount;

          if (inst.verificationStatus === 'VERIFIED') verified += 1;
          else pending += 1;
        });

        setStats({
          totalCards: totalC,
          totalInstallations: data.pagination?.totalRecords || list.length,
          residentialCards: resSum,
          commercialCards: commSum,
          industrialCards: indSum,
          verifiedCount: verified,
          pendingVerificationCount: pending,
        });
      }
    } catch (err) {
      console.error('Failed to fetch installed cards:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to fetch installed cards.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallations(1);
  }, [customerType, verificationStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInstallations(1);
  };

  const handleCopy = (serial) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    showToast(`Serial "${serial}" copied!`, 'success');
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const getCategoryMeta = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return {
          label: 'Residential',
          bg: '#ecfdf5',
          border: '#a7f3d0',
          color: '#065f46',
          icon: <Home size={13} />,
          desc: 'Home / Living quarters',
        };
      case 'COMMERCIAL':
        return {
          label: 'Commercial',
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#1e40af',
          icon: <Building size={13} />,
          desc: 'Shop / Retail / Office',
        };
      case 'INDUSTRIAL':
        return {
          label: 'Industrial',
          bg: '#fef3c7',
          border: '#fde68a',
          color: '#92400e',
          icon: <Factory size={13} />,
          desc: 'Factory / Heavy Workshop',
        };
      default:
        return {
          label: type || 'Standard',
          bg: '#f1f5f9',
          border: '#cbd5e1',
          color: '#475569',
          icon: <Zap size={13} />,
          desc: 'Standard installation',
        };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Zap size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">My Installed Cards</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
              Full audit and registry of energy-saver cards installed across <strong>Residential</strong>, <strong>Commercial</strong>, and <strong>Industrial</strong> consumers.
            </p>
          </div>
        </div>

        <div className="page-header-actions page-header-actions-grid">
          <button
            onClick={() => fetchInstallations(pagination.page)}
            className="btn btn-outline"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', minWidth: '100px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/customers/new"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', whiteSpace: 'nowrap' }}
          >
            <Zap size={15} />
            <span>+ Install New Card</span>
          </Link>
        </div>
      </div>

      {/* 4 Lucrative Stat Cards Covering All 3 Required Categories */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <StatCard
          title="Total Installed Cards"
          value={stats.totalCards || stats.totalInstallations}
          subtitle={`${stats.totalInstallations} Installations completed →`}
          icon={CreditCard}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          borderLeftColor="#0284c7"
          borderColor="#BAE6FD"
          borderHoverColor="#0284c7"
          onClick={() => setCustomerType('ALL')}
        />
        <StatCard
          title="Residential Installed"
          value={stats.residentialCards}
          subtitle="Household units active →"
          icon={Home}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderLeftColor="#16a34a"
          borderColor="#A7F3D0"
          borderHoverColor="#16a34a"
          onClick={() => setCustomerType('RESIDENTIAL')}
        />
        <StatCard
          title="Commercial Installed"
          value={stats.commercialCards}
          subtitle="Shops, hotels & offices →"
          icon={Building}
          bgLight="#eff6ff"
          iconColor="#2563eb"
          borderLeftColor="#2563eb"
          borderColor="#BFDBFE"
          borderHoverColor="#2563eb"
          onClick={() => setCustomerType('COMMERCIAL')}
        />
        <StatCard
          title="Industrial Installed"
          value={stats.industrialCards}
          subtitle="Factories & plant units →"
          icon={Factory}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderLeftColor="#d97706"
          borderColor="#FDE68A"
          borderHoverColor="#d97706"
          onClick={() => setCustomerType('INDUSTRIAL')}
        />
      </div>

      {/* Filter Tabs: Residential, Commercial, Industrial */}
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
              { id: 'ALL', label: 'All Categories', icon: Zap },
              { id: 'RESIDENTIAL', label: 'Residential (Home)', icon: Home },
              { id: 'COMMERCIAL', label: 'Commercial (Business)', icon: Building },
              { id: 'INDUSTRIAL', label: 'Industrial (Factory)', icon: Factory },
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
                    border: isActive ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#f0f9ff' : '#ffffff',
                    color: isActive ? '#0369a1' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TabIcon size={14} color={isActive ? '#0284c7' : '#94a3b8'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', flex: '1 1 260px', maxWidth: '420px' }}>
            <div style={{ position: 'relative', width: '100%', minWidth: 0, flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search serial, customer, mobile..."
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

      {/* Installed Cards Table & Mobile Cards */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#0284c7' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Loading installed cards audit...</div>
          </div>
        ) : installations.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Zap size={28} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
              No Installed Cards Found
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
              {search ? `No card installations matching "${search}". Try searching another serial or reset filters.` : 'No energy-saver cards have been registered or installed in this category yet.'}
            </p>
            <Link to="/customers/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} />
              <span>+ Install First Card</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: '880px', margin: 0, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CARD SERIAL NUMBER(S)</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CUSTOMER NAME</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CATEGORY</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>LOAD & METER INFO</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>INSTALLATION SITE</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>INSTALLED DATE</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {installations.map((inst) => {
                    const catMeta = getCategoryMeta(inst.customerType);
                    const serials = inst.cardSerialNumbers || [];
                    const isVerified = inst.verificationStatus === 'VERIFIED';

                    return (
                      <tr key={inst._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Serial Number Badges */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {serials.slice(0, 3).map((serial) => (
                              <div
                                key={serial}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  width: 'fit-content',
                                }}
                              >
                                <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#0369a1' }}>
                                  {serial}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(serial)}
                                  title="Copy Serial"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    color: copiedSerial === serial ? '#16a34a' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  {copiedSerial === serial ? <Check size={11} /> : <Copy size={11} />}
                                </button>
                              </div>
                            ))}
                            {serials.length > 3 && (
                              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700' }}>
                                +{serials.length - 3} more cards
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>
                            {inst.customerId?.fullName || inst.customerName || 'Customer'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>
                            📞 {inst.customerId?.mobileNumber || inst.customerMobile || 'N/A'}
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: catMeta.bg,
                              border: `1px solid ${catMeta.border}`,
                              color: catMeta.color,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                            }}
                          >
                            {catMeta.icon}
                            <span>{catMeta.label}</span>
                          </span>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{catMeta.desc}</div>
                        </td>

                        {/* Load & Meter Info */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                            ⚡ {inst.connectedLoadKw || 0} kW
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            {inst.phase === 'THREE_PHASE' ? '3-Phase Connection' : '1-Phase Connection'}
                          </div>
                          {inst.consumerAccountNumber && (
                            <div style={{ fontSize: '10.5px', color: '#0284c7', fontFamily: 'monospace' }}>
                              CA: {inst.consumerAccountNumber}
                            </div>
                          )}
                        </td>

                        {/* Installation Site Address */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#334155' }}>
                            <MapPin size={12} color="#0284c7" />
                            <span>
                              {inst.installationAddress?.district
                                ? `${inst.installationAddress.district}, ${inst.installationAddress.state}`
                                : inst.installationAddress?.city || 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                            {inst.installationDateTime
                              ? new Date(inst.installationDateTime).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </div>
                        </td>

                        {/* Verification Status */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: isVerified ? '#dcfce7' : '#fffbeb',
                              color: isVerified ? '#15803d' : '#b45309',
                              border: isVerified ? '1px solid #86efac' : '1px solid #fde68a',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '800',
                            }}
                          >
                            {isVerified ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                            <span>{isVerified ? 'VERIFIED' : 'PENDING'}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <Link
                            to={inst.customerId?._id ? `/customers/${inst.customerId._id}` : `/customers`}
                            className="btn btn-outline"
                            style={{ fontSize: '11px', padding: '4px 9px', height: '30px' }}
                          >
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
              {installations.map((inst) => {
                const catMeta = getCategoryMeta(inst.customerType);
                const serials = inst.cardSerialNumbers || [];
                const isVerified = inst.verificationStatus === 'VERIFIED';

                return (
                  <div
                    key={inst._id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Header: Customer Name & Category */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', lineHeight: 1.3 }}>
                          {inst.customerId?.fullName || inst.customerName || 'Customer'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          📞 {inst.customerId?.mobileNumber || inst.customerMobile || 'N/A'}
                        </div>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: catMeta.bg,
                          border: `1px solid ${catMeta.border}`,
                          color: catMeta.color,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}
                      >
                        {catMeta.icon}
                        <span>{catMeta.label}</span>
                      </span>
                    </div>

                    {/* Card Serials */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                        Installed Card Serial(s)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {serials.slice(0, 3).map((serial) => (
                          <div
                            key={serial}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#0369a1' }}>
                              {serial}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(serial)}
                              title="Copy Serial"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                color: copiedSerial === serial ? '#16a34a' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {copiedSerial === serial ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        ))}
                        {serials.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                            +{serials.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2x2 Info Grid */}
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
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Load & Phase</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', marginTop: '1px' }}>
                          ⚡ {inst.connectedLoadKw || 0} kW ({inst.phase === 'THREE_PHASE' ? '3-Ph' : '1-Ph'})
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Consumer No (CA)</div>
                        <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a', marginTop: '1px', fontFamily: 'monospace' }}>
                          {inst.consumerAccountNumber || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Site Location</div>
                        <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a', marginTop: '1px' }}>
                          📍 {inst.installationAddress?.district
                            ? `${inst.installationAddress.district}, ${inst.installationAddress.state}`
                            : inst.installationAddress?.city || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Installed Date</div>
                        <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a', marginTop: '1px' }}>
                          📅 {inst.installationDateTime
                            ? new Date(inst.installationDateTime).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Status Badge on Left, View Profile on Right */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: isVerified ? '#dcfce7' : '#fffbeb',
                          color: isVerified ? '#15803d' : '#b45309',
                          border: isVerified ? '1px solid #86efac' : '1px solid #fde68a',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                        }}
                      >
                        {isVerified ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        <span>{isVerified ? 'VERIFIED' : 'PENDING'}</span>
                      </span>

                      <Link
                        to={inst.customerId?._id ? `/customers/${inst.customerId._id}` : `/customers`}
                        className="btn btn-outline"
                        style={{ fontSize: '12px', height: '34px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        View Profile
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
                    onClick={() => fetchInstallations(pagination.page - 1)}
                    className="btn btn-outline"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => fetchInstallations(pagination.page + 1)}
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

export default MyInstalledCardsPage;
