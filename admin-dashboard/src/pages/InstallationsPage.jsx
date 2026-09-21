import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Search,
  Plus,
  CreditCard,
  Zap,
  Building,
  Home,
  Factory,
  RefreshCw,
  Eye,
  CheckCircle2,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter,
  MapPin,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  ShieldCheck,
  User,
  Building2,
  Maximize2,
  Download,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { FranchiseTypeBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const InstallationsPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('');

  // States & Districts list
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    totalInstallations: 0,
    totalCards: 0,
    totalValue: 0,
  });

  // Photo Audit Modal State
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [activePhotoTab, setActivePhotoTab] = useState('MCB'); // 'MCB' | 'CARD' | 'BILL' | 'SIGNATURE'

  // Fetch States on mount
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

  // Fetch Districts when state changes
  useEffect(() => {
    if (!selectedState) {
      setDistrictsList([]);
      setSelectedDistrict('');
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await api.get('/territories/districts', { params: { state: selectedState } });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
        }
      } catch {
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [selectedState]);

  const fetchInstallations = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        customerType: customerType || undefined,
        confirmationStatus: confirmationStatus || undefined,
        state: selectedState || undefined,
        district: selectedDistrict || undefined,
      };

      const res = await api.get('/installations', { params });
      if (res.data?.data) {
        const data = res.data.data;
        let list = data.installations || [];

        // Client-side filter by partner franchiseType if selected
        if (partnerTypeFilter) {
          list = list.filter((ins) => ins.partnerId?.franchiseType === partnerTypeFilter);
        }

        setInstallations(list);
        setPagination(data.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });

        const cardsCount = list.reduce((acc, item) => acc + (item.installedCardCount || 0), 0);
        const valueSum = list.reduce((acc, item) => acc + (item.totalAmount || 0), 0);

        setStats({
          totalInstallations: data.pagination?.totalRecords || list.length,
          totalCards: cardsCount,
          totalValue: valueSum,
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch installations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallations(1);
  }, [customerType, confirmationStatus, selectedState, selectedDistrict, partnerTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInstallations(1);
  };

  const handleOpenPhotoModal = (ins, tab = 'MCB') => {
    setSelectedInstallation(ins);
    setActivePhotoTab(tab);
  };

  const handleClosePhotoModal = () => {
    setSelectedInstallation(null);
  };

  const getCustomerTypeBadge = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
            <Home size={11} /> Residential
          </span>
        );
      case 'COMMERCIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
            <Building size={11} /> Commercial
          </span>
        );
      case 'INDUSTRIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
            <Factory size={11} /> Industrial
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <div className="page-body">
      {/* Top Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <Wrench size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isSuperAdmin ? 'Network Installation Log & Proof Audit' : 'My Installation Records'}
            </h1>
            <p className="page-subtitle">
              {isSuperAdmin
                ? 'Live real-time monitoring of all energy card installations by State Franchise, District Franchise, and Sub-Franchise partners across India with proof photos, load specs, and GPS verification.'
                : 'Audit log of all your Vidhyut Saathi energy card installations, customer verifications, and photo proofs.'}
            </p>
          </div>
        </div>

        {/* Super Admin does NOT have the install button; only Franchise & Sub-Franchise Partners have it */}
        {!isSuperAdmin && (
          <div className="page-header-actions">
            <button
              onClick={() => navigate('/customers/new')}
              className="btn btn-primary"
            >
              <Plus size={18} />
              <span>New Installation</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <StatCard
          title="Total Installations Logged"
          value={stats.totalInstallations}
          subtitle="Click to show all"
          icon={Wrench}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
          onClick={() => {
            setCustomerType('');
            setConfirmationStatus('');
            setSelectedState('');
            setSelectedDistrict('');
            setPartnerTypeFilter('');
          }}
          isActive={!customerType && !confirmationStatus && !selectedState && !partnerTypeFilter}
          activeLabel="All"
          loading={loading}
        />

        <StatCard
          title="Total Installed Cards"
          value={stats.totalCards}
          subtitle="Active energy cards"
          icon={CreditCard}
          bgLight="#dcfce7"
          iconColor="#15803d"
          onClick={() => {
            setConfirmationStatus('CONFIRMED');
          }}
          isActive={confirmationStatus === 'CONFIRMED'}
          activeLabel="Confirmed"
          loading={loading}
        />

        <StatCard
          title="Installation Value"
          value={`₹${stats.totalValue.toLocaleString()}`}
          subtitle="Total customer billings"
          icon={DollarSign}
          bgLight="#fef3c7"
          iconColor="#b45309"
          onClick={() => {
            fetchInstallations(1);
          }}
          loading={loading}
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <form onSubmit={handleSearchSubmit} className="filter-form-responsive" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Text Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search ID, Serial (e.g. VS000401), Partner, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: '42px', paddingLeft: '38px', paddingRight: search ? '32px' : '12px', borderRadius: '8px', fontSize: '13px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Super Admin Partner Type Filter */}
          {isSuperAdmin && (
            <div style={{ flex: '0 0 auto', minWidth: '175px' }}>
              <select
                className="form-control"
                value={partnerTypeFilter}
                onChange={(e) => setPartnerTypeFilter(e.target.value)}
                style={{ height: '42px', borderRadius: '8px', fontSize: '13px' }}
              >
                <option value="">All Partner Levels</option>
                <option value="PREMIUM_EXCLUSIVE_DISTRICT">Premium Exclusive District</option>
                <option value="STANDARD_EXCLUSIVE_DISTRICT">Standard Exclusive District</option>
                <option value="NON_EXCLUSIVE_DISTRICT">Non-Exclusive District</option>
                <option value="DISTRICT_FRANCHISE">District Franchise</option>
                <option value="SUB_FRANCHISE">Sub-Franchise</option>
                <option value="STATE_FRANCHISE">State Franchise</option>
              </select>
            </div>
          )}

          {/* State Filter */}
          <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ height: '42px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="">All States ({statesList.length})</option>
              {statesList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ height: '42px', borderRadius: '8px', fontSize: '13px' }}
              disabled={!selectedState}
            >
              <option value="">{selectedState ? `All in ${selectedState}` : 'All Districts'}</option>
              {districtsList.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Type Filter */}
          <div style={{ flex: '0 0 auto', minWidth: '135px' }}>
            <select
              className="form-control"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              style={{ height: '42px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="">All Types</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '42px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
            >
              <Search size={15} />
              <span>Filter</span>
            </button>

            {(search || customerType || confirmationStatus || selectedState || selectedDistrict || partnerTypeFilter) && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSearch('');
                  setCustomerType('');
                  setConfirmationStatus('');
                  setSelectedState('');
                  setSelectedDistrict('');
                  setPartnerTypeFilter('');
                  fetchInstallations(1);
                }}
                style={{ height: '42px', padding: '0 14px', borderRadius: '8px', fontSize: '13px' }}
              >
                Reset
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fetchInstallations(pagination.page)}
              title="Refresh list"
              style={{ height: '42px', width: '42px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>

      {/* Installations List Table */}
      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <div>Loading installation logs and audit records...</div>
        </div>
      ) : installations.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Wrench size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Installation Records Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.5' }}>
            {search || customerType || selectedState || selectedDistrict || partnerTypeFilter
              ? 'No installations match your current filter parameters. Try resetting your search.'
              : isSuperAdmin
              ? 'No card installations recorded in the network yet. When Franchise Partners and Sub-Franchise Partners perform installations in the field with proof photos, all customer details and photos will appear here in real-time.'
              : 'You have not recorded any card installations yet. Click the button below to register a customer and install cards.'}
          </p>
          {!isSuperAdmin && (
            <button
              onClick={() => navigate('/customers/new')}
              className="btn btn-primary"
              style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} />
              <span>Add Customer / Install Card</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-only card" style={{ padding: '0', overflowX: 'auto', marginBottom: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '1180px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '13%', whiteSpace: 'nowrap' }}>Installation ID</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '20%', whiteSpace: 'nowrap' }}>Installed By (Partner)</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '22%', whiteSpace: 'nowrap' }}>Customer & Location</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '11%', whiteSpace: 'nowrap' }}>Connected Load</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '14%', whiteSpace: 'nowrap' }}>Cards Installed</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '10%', whiteSpace: 'nowrap' }}>Proof Photos</th>
                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Audit Action</th>
                </tr>
              </thead>
              <tbody>
                {installations.map((ins) => {
                  const partnerDoc = ins.partnerId;
                  const parentPartner = partnerDoc?.parentPartnerId;
                  const hasMcb = !!ins.mcbPhoto;
                  const hasCard = !!ins.installedCardPhoto;
                  const hasBill = !!ins.billPhoto;
                  const hasSign = !!ins.customerSignaturePhoto;
                  const photoCount = [hasMcb, hasCard, hasBill, hasSign].filter(Boolean).length;

                  return (
                    <tr key={ins._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                      {/* 1. Installation ID & Date */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                          {ins.installationId}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                          <Calendar size={12} style={{ color: '#94a3b8' }} />
                          <span>{new Date(ins.installationDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div style={{ marginTop: '5px' }}>
                          {getCustomerTypeBadge(ins.customerType)}
                        </div>
                      </td>

                      {/* 2. Installed By Partner & Hierarchy */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                          {partnerDoc?.fullName || 'Direct HQ'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#0284c7', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                          <span>{partnerDoc?.franchiseId}</span>
                          {partnerDoc?.mobileNumber && (
                            <>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ color: '#64748b', fontFamily: 'inherit', fontWeight: 500 }}>{partnerDoc.mobileNumber}</span>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: '6px' }}>
                          {partnerDoc?.franchiseType && <FranchiseTypeBadge type={partnerDoc.franchiseType} />}
                        </div>
                        {/* If Sub-Franchise, show Parent District Franchise */}
                        {parentPartner && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', marginTop: '5px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>↳</span>
                            <span>Upline:</span>
                            <strong>{parentPartner.fullName}</strong>
                            <span style={{ color: '#64748b', fontSize: '10.5px' }}>({parentPartner.franchiseId})</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Customer & Address */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                          {ins.customerId?.fullName || 'Customer'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <User size={12} style={{ color: '#94a3b8' }} />
                          <span>{ins.customerId?.mobileNumber}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '11.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.35 }}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#94a3b8' }} />
                          <span>
                            {ins.installationAddress?.houseOrShopNumber ? `${ins.installationAddress.houseOrShopNumber}, ` : ''}
                            {ins.installationAddress?.district}, {ins.installationAddress?.state}
                          </span>
                        </div>
                        {ins.latitude && (
                          <div style={{ marginTop: '5px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10.5px',
                                color: ins.territoryMatch !== false ? '#15803d' : '#b91c1c',
                                background: ins.territoryMatch !== false ? '#dcfce7' : '#fee2e2',
                                border: `1px solid ${ins.territoryMatch !== false ? '#bbf7d0' : '#fecaca'}`,
                                padding: '1px 7px',
                                borderRadius: '12px',
                                fontWeight: 700,
                              }}
                            >
                              <ShieldCheck size={11} />
                              {ins.territoryMatch !== false ? 'GPS Verified' : 'Territory Flagged'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. Connected Load */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '6px', fontSize: '12.5px' }}>
                          <Zap size={13} /> {ins.connectedLoadKw} kW
                        </div>
                        {ins.meterNumber && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                            Meter: <strong style={{ color: '#334155' }}>{ins.meterNumber}</strong>
                          </div>
                        )}
                      </td>

                      {/* 5. Cards Installed & Commercials */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontSize: '12.5px' }}>
                          <CreditCard size={13} /> {ins.installedCardCount} Card{ins.installedCardCount > 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#166534', fontFamily: 'monospace', fontWeight: 600, marginTop: '4px' }}>
                          {ins.cardSerialNumbers?.slice(0, 2).join(', ')}
                          {ins.cardSerialNumbers?.length > 2 ? ` (+${ins.cardSerialNumbers.length - 2} more)` : ''}
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                          ₹{ins.totalAmount?.toLocaleString()}
                        </div>
                      </td>

                      {/* 6. Proof Photos Chips */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {hasMcb && (
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoModal(ins, 'MCB')}
                                title="Click to view MCB Panel Photo"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '11px',
                                  borderRadius: '5px',
                                  border: '1px solid #BAE6FD',
                                  backgroundColor: '#F0F9FF',
                                  color: '#0369A1',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                <Camera size={11} /> MCB
                              </button>
                            )}
                            {hasCard && (
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoModal(ins, 'CARD')}
                                title="Click to view Installed Card Photo"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '11px',
                                  borderRadius: '5px',
                                  border: '1px solid #BBF7D0',
                                  backgroundColor: '#F0FDF4',
                                  color: '#15803D',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                <CreditCard size={11} /> Card
                              </button>
                            )}
                            {hasBill && (
                              <button
                                type="button"
                                onClick={() => handleOpenPhotoModal(ins, 'BILL')}
                                title="Click to view Electricity Bill Photo"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '11px',
                                  borderRadius: '5px',
                                  border: '1px solid #FED7AA',
                                  backgroundColor: '#FFF7ED',
                                  color: '#C2410C',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 600,
                                }}
                              >
                                <FileText size={11} /> Bill
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                            📸 {photoCount} Proof Photo{photoCount !== 1 ? 's' : ''} Attached
                          </div>
                        </div>
                      </td>

                      {/* 7. Action Button */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(ins, 'MCB')}
                          className="btn btn-primary"
                          style={{
                            padding: '7px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
                          }}
                        >
                          <Camera size={13} />
                          <span>Audit Proof</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {installations.map((ins) => {
              const partnerDoc = ins.partnerId;
              const parentPartner = partnerDoc?.parentPartnerId;
              return (
                <div
                  key={ins._id}
                  className="mobile-card-item"
                  style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', backgroundColor: '#FFFFFF' }}
                >
                  <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {ins.installationId}
                    </span>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '15px' }}>
                      ₹{ins.totalAmount?.toLocaleString()}
                    </div>
                  </div>

                  {/* Partner Hierarchy Info */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                      INSTALLED BY PARTNER
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {partnerDoc?.fullName || 'Direct HQ'} ({partnerDoc?.franchiseId})
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {partnerDoc?.franchiseType && <FranchiseTypeBadge type={partnerDoc.franchiseType} />}
                    </div>
                    {parentPartner && (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Upline: <strong>{parentPartner.fullName}</strong> ({parentPartner.franchiseId})
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div style={{ marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {ins.customerId?.fullName || 'Customer'} (📱 {ins.customerId?.mobileNumber})
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      📍 {ins.installationAddress?.district}, {ins.installationAddress?.state}
                    </div>
                  </div>

                  <div className="mobile-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <div className="mobile-card-label" style={{ fontSize: '11px', color: '#64748B' }}>Connected Load</div>
                      <div className="mobile-card-value" style={{ color: '#0284c7', fontWeight: '700' }}>
                        ⚡ {ins.connectedLoadKw} kW
                      </div>
                    </div>
                    <div>
                      <div className="mobile-card-label" style={{ fontSize: '11px', color: '#64748B' }}>Cards Installed</div>
                      <div className="mobile-card-value" style={{ color: '#15803d', fontWeight: '700' }}>
                        💳 {ins.installedCardCount} Card{ins.installedCardCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Audit Proof Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenPhotoModal(ins, 'MCB')}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px' }}
                  >
                    <Camera size={14} />
                    <span>View Installation Photos & Proof</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {installations.length} of {pagination.totalRecords} installations (Page {pagination.page} of {pagination.totalPages})
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => fetchInstallations(pagination.page - 1)}
                className="btn btn-outline"
                style={{ padding: '6px 14px', opacity: pagination.hasPrevPage ? 1 : 0.5 }}
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => fetchInstallations(pagination.page + 1)}
                className="btn btn-outline"
                style={{ padding: '6px 14px', opacity: pagination.hasNextPage ? 1 : 0.5 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* PHOTO PROOF & INSTALLATION AUDIT MODAL */}
      {/* ============================================================ */}
      {selectedInstallation && (
        <div
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
            padding: '16px',
          }}
          onClick={handleClosePhotoModal}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Installation Evidence & Proof Audit: {selectedInstallation.installationId}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    Customer: {selectedInstallation.customerId?.fullName} • Date: {new Date(selectedInstallation.installationDateTime).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePhotoModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', overflowY: 'auto', flex: 1 }}>
              {/* Left Column: Photo Viewer */}
              <div style={{ padding: '20px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                {/* Photo Selector Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'MCB', label: '⚡ MCB Panel Photo', photo: selectedInstallation.mcbPhoto },
                    { id: 'CARD', label: '💳 Installed Card Photo', photo: selectedInstallation.installedCardPhoto },
                    { id: 'BILL', label: '📄 Electricity Bill', photo: selectedInstallation.billPhoto },
                    { id: 'SIGNATURE', label: '✍️ Signature Proof', photo: selectedInstallation.customerSignaturePhoto },
                  ].map((tab) => {
                    const isTabActive = activePhotoTab === tab.id;
                    const hasImage = !!tab.photo;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePhotoTab(tab.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: isTabActive ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                          backgroundColor: isTabActive ? '#E0F2FE' : '#F8FAFC',
                          color: isTabActive ? '#0369A1' : hasImage ? '#334155' : '#94A3B8',
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label} {hasImage ? '✓' : '(N/A)'}
                      </button>
                    );
                  })}
                </div>

                {/* Current Photo Display */}
                <div
                  style={{
                    flex: 1,
                    minHeight: '280px',
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {(() => {
                    let photoUrl = '';
                    let photoTitle = '';
                    if (activePhotoTab === 'MCB') {
                      photoUrl = selectedInstallation.mcbPhoto;
                      photoTitle = 'MCB / ELCB Distribution Panel Photo';
                    } else if (activePhotoTab === 'CARD') {
                      photoUrl = selectedInstallation.installedCardPhoto;
                      photoTitle = 'Installed Vidhyut Saathi Card on Meter/Panel';
                    } else if (activePhotoTab === 'BILL') {
                      photoUrl = selectedInstallation.billPhoto;
                      photoTitle = 'Customer Electricity Utility Bill';
                    } else if (activePhotoTab === 'SIGNATURE') {
                      photoUrl = selectedInstallation.customerSignaturePhoto;
                      photoTitle = 'Customer Signature & Consent';
                    }

                    if (!photoUrl) {
                      return (
                        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
                          <ImageIcon size={36} style={{ margin: '0 auto 8px', color: '#64748B' }} />
                          <div>No photo uploaded for {photoTitle}</div>
                        </div>
                      );
                    }

                    return (
                      <img
                        src={photoUrl}
                        alt={photoTitle}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '380px',
                          objectFit: 'contain',
                        }}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Complete Installation & Partner Audit Specs */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                {/* Partner Hierarchy Card */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    🏢 EXECUTING FRANCHISE PARTNER
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedInstallation.partnerId?.fullName || 'Direct HQ Installation'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    ID: <strong>{selectedInstallation.partnerId?.franchiseId}</strong> • Mobile: {selectedInstallation.partnerId?.mobileNumber}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    {selectedInstallation.partnerId?.franchiseType && (
                      <FranchiseTypeBadge type={selectedInstallation.partnerId.franchiseType} />
                    )}
                  </div>
                  {selectedInstallation.partnerId?.parentPartnerId && (
                    <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#0369A1', background: '#E0F2FE', padding: '4px 8px', borderRadius: '6px' }}>
                      Direct Parent: <strong>{selectedInstallation.partnerId.parentPartnerId.fullName}</strong> ({selectedInstallation.partnerId.parentPartnerId.franchiseId})
                    </div>
                  )}
                </div>

                {/* Customer & Location Card */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    👤 CUSTOMER & SITE LOCATION
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedInstallation.customerId?.fullName} ({selectedInstallation.customerId?.customerId})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    📱 Mobile: {selectedInstallation.customerId?.mobileNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📍 Full Address: {selectedInstallation.installationAddress?.houseOrShopNumber ? `${selectedInstallation.installationAddress.houseOrShopNumber}, ` : ''}
                    {selectedInstallation.installationAddress?.street ? `${selectedInstallation.installationAddress.street}, ` : ''}
                    {selectedInstallation.installationAddress?.locality ? `${selectedInstallation.installationAddress.locality}, ` : ''}
                    {selectedInstallation.installationAddress?.city}, {selectedInstallation.installationAddress?.district}, {selectedInstallation.installationAddress?.state} - {selectedInstallation.installationAddress?.pinCode}
                  </div>

                  {/* GPS Coordinates */}
                  {selectedInstallation.latitude && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#15803D', background: '#DCFCE7', padding: '4px 8px', borderRadius: '6px' }}>
                      <MapPin size={13} />
                      <span>
                        GPS: {selectedInstallation.latitude.toFixed(5)}, {selectedInstallation.longitude.toFixed(5)} ({selectedInstallation.territoryMatch !== false ? 'Authorized Territory' : 'Territory Flagged'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Technical Load & Cards Card */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    ⚡ ELECTRICAL LOAD & CARDS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Connected Load:</span>
                      <div style={{ fontWeight: '700', color: '#0284C7' }}>{selectedInstallation.connectedLoadKw} kW</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Phase:</span>
                      <div style={{ fontWeight: '700' }}>{selectedInstallation.phase || 'Single Phase'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Cards Installed:</span>
                      <div style={{ fontWeight: '700', color: '#16A34A' }}>{selectedInstallation.installedCardCount} Card(s)</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                      <div style={{ fontWeight: '800', color: '#15803D' }}>₹{selectedInstallation.totalAmount?.toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Installed Serial Numbers:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                      {selectedInstallation.cardSerialNumbers?.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#F8FAFC',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={handleClosePhotoModal}
                className="btn btn-outline"
                style={{ padding: '8px 18px' }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationsPage;
