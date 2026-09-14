import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  UserPlus,
  Filter,
  Eye,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const PartnersPage = () => {
  const { isSuperAdmin, partner: authPartner } = useAuth();
  const [partners, setPartners] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [franchiseType, setFranchiseType] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Fetch states from API
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

  // Fetch districts when state filter changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!stateFilter) {
        setDistrictsList([]);
        setDistrictFilter('');
        return;
      }
      try {
        const res = await api.get('/territories/districts', { params: { state: stateFilter } });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
        }
      } catch {
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [stateFilter]);

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetPartner, setTargetPartner] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    city: '',
    addressLine1: '',
    pinCode: '',
    notes: '',
  });

  // Delete Partner Modal State (Super Admin Only)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { showToast } = useNotification();

  const fetchPartners = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: search.trim(),
        franchiseType: franchiseType || (isSuperAdmin ? 'FRANCHISE_ONLY' : undefined),
        accountStatus,
        state: stateFilter.trim(),
        district: districtFilter.trim(),
      };

      const res = await api.get('/partners', { params });
      if (res.data?.data) {
        setPartners(res.data.data.partners);
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Failed to fetch franchise partners from Atlas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, franchiseType, accountStatus, stateFilter, districtFilter, isSuperAdmin, showToast]);


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPartners(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPartners]);

  // Copy Franchise ID helper
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Franchise ID "${id}" copied!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Status Change Modal
  const openStatusModal = (partner) => {
    setTargetPartner(partner);
    setSelectedStatus(partner.accountStatus);
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleSaveStatus = async () => {
    if (!targetPartner) return;
    try {
      await api.patch(`/partners/${targetPartner._id}/status`, { status: selectedStatus });
      showToast(`Partner status updated to ${selectedStatus}`, 'success');
      setStatusModalOpen(false);
      fetchPartners(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update partner status', 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (partner) => {
    setEditingPartner(partner);
    setEditForm({
      fullName: partner.fullName || '',
      email: partner.email || '',
      city: partner.city || '',
      addressLine1: partner.addressLine1 || '',
      pinCode: partner.pinCode || '',
      notes: partner.notes || '',
    });
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;

    try {
      await api.put(`/partners/${editingPartner._id}`, editForm);
      showToast('Franchise partner details updated successfully!', 'success');
      setEditModalOpen(false);
      fetchPartners(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update partner details', 'error');
    }
  };

  // Delete Partner Handler
  const confirmDeletePartner = async () => {
    if (!partnerToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/partners/${partnerToDelete._id}`);
      showToast(res.data?.message || 'Franchise Partner deleted successfully.', 'success');
      setDeleteModalOpen(false);
      setPartnerToDelete(null);
      fetchPartners(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete partner', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const partnerCanAdd = isSuperAdmin || authPartner?.franchiseType !== 'SUB_FRANCHISE';
  const displayPartners = isSuperAdmin
    ? partners
    : partners.filter((p) => String(p._id) !== String(authPartner?._id));

  return (

    <div>
      {/* Page Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box">
            <Users size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isSuperAdmin ? 'Franchise Partner Directory' : 'Sub-Franchise Network'}
            </h1>
            <p className="page-subtitle">
              {isSuperAdmin
                ? 'State & District Franchise Partners across authorized territories'
                : `Sub-franchise partners authorized under ${authPartner?.fullName || 'your franchise'} (${authPartner?.franchiseId || ''})`}
            </p>
          </div>
        </div>

        {partnerCanAdd && (
          <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
            {isSuperAdmin && (
              <Link to="/sub-franchises" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} />
                <span>View Sub-Franchises</span>
              </Link>
            )}
            <Link to="/partners/new" className="btn btn-primary">
              <UserPlus size={16} />
              <span>{isSuperAdmin ? 'New Franchise Partner' : 'Add Sub-Franchise'}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Super Admin Directory Tabs */}
      {isSuperAdmin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            marginBottom: '18px',
            width: '100%',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Users size={15} />
            <span>Franchise Partners (State & District)</span>
          </div>
          <Link
            to="/sub-franchises"
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              borderRadius: '8px',
              background: '#FAF5FF',
              border: '1.5px solid #E9D5FF',
              color: '#7E22CE',
            }}
          >
            <Building2 size={15} color="#9333EA" />
            <span>Sub-Franchise Partners Directory &rarr;</span>
          </Link>
        </div>
      )}

      {/* Lucrative Filter & Search Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        {/* Row 1: Search Bar & Quick Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search Partner ID, Full Name, Mobile Number, City, Gov ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(search || franchiseType || accountStatus || stateFilter || districtFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFranchiseType('');
                  setAccountStatus('');
                  setStateFilter('');
                  setDistrictFilter('');
                }}
                className="btn btn-outline"
                style={{ fontSize: '13px', padding: '9px 14px', color: '#64748b' }}
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchPartners(1)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Row 2: 4-Column Dropdown Selectors */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* 1. Franchise Type */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', display: 'block', letterSpacing: '0.5px' }}>
              Franchise Type
            </label>
            <select
              className="select"
              value={franchiseType}
              onChange={(e) => setFranchiseType(e.target.value)}
              style={{ width: '100%' }}
            >
              {isSuperAdmin ? (
                <>
                  <option value="">All Franchise Partners (State & District)</option>
                  <option value="STATE_FRANCHISE">State Franchise</option>
                  <option value="DISTRICT_FRANCHISE">District Franchise</option>
                </>
              ) : (
                <>
                  <option value="">All Network Partners</option>
                  <option value="DISTRICT_FRANCHISE">District Franchise</option>
                  <option value="SUB_FRANCHISE">Sub-Franchise</option>
                </>
              )}
            </select>
          </div>

          {/* 2. Account Status */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', display: 'block', letterSpacing: '0.5px' }}>
              Account Status
            </label>
            <select
              className="select"
              value={accountStatus}
              onChange={(e) => setAccountStatus(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          {/* 3. State */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', display: 'block', letterSpacing: '0.5px' }}>
              State Territory
            </label>
            <select
              className="select"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setDistrictFilter('');
              }}
              style={{ width: '100%' }}
            >
              <option value="">All States</option>
              {statesList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 4. District */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', display: 'block', letterSpacing: '0.5px' }}>
              District Territory
            </label>
            <select
              className="select"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              disabled={!stateFilter}
              style={{ width: '100%' }}
            >
              <option value="">{stateFilter ? 'All Districts' : 'Select State First'}</option>
              {districtsList.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Desktop Table View */}
      <div className="table-container desktop-table-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Franchise ID</th>
              <th>Partner Name</th>
              <th>Type</th>
              <th>Territory</th>
              <th>Parent Partner</th>
              <th>Mobile & Email</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayPartners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {loading
                    ? 'Searching partners database...'
                    : isSuperAdmin
                    ? 'No matching franchise partners found.'
                    : 'No sub-franchises registered under your network yet.'}
                </td>
              </tr>
            ) : (
              displayPartners.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div
                      onClick={() => handleCopyId(p.franchiseId)}
                      title="Click to copy Franchise ID"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <span>{p.franchiseId}</span>
                      {copiedId === p.franchiseId ? (
                        <Check size={13} color="#16a34a" />
                      ) : (
                        <Copy size={13} style={{ opacity: 0.6 }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{p.fullName}</div>
                  </td>
                  <td>
                    <FranchiseTypeBadge type={p.franchiseType} />
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{p.district}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{p.state}</div>
                  </td>
                  <td>
                    {p.parentPartnerId ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {p.parentPartnerId.fullName} ({p.parentPartnerId.franchiseId})
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Direct (Super Admin)</span>
                    )}
                  </td>
                  <td>
                    <div>{p.mobileNumber}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{p.email}</div>
                  </td>
                  <td>
                    <StatusBadge status={p.accountStatus} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <Link to={`/partners/${p._id}`} className="btn btn-outline btn-sm" title="View Profile">
                        <Eye size={14} />
                      </Link>

                      {isSuperAdmin && (
                        <>
                          <button onClick={() => openEditModal(p)} className="btn btn-outline btn-sm" title="Edit Details">
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => openStatusModal(p)}
                            className="btn btn-outline btn-sm"
                            title="Manage Status"
                          >
                            <Power size={14} color={p.accountStatus === 'ACTIVE' ? '#16A34A' : '#DC2626'} />
                          </button>

                          <button
                            onClick={() => {
                              setPartnerToDelete(p);
                              setDeleteModalOpen(true);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                            title="Delete Partner Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Cards View */}
      <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px' }}>
        {displayPartners.length === 0 ? (

          <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            {loading
              ? 'Searching partners database...'
              : isSuperAdmin
              ? 'No matching franchise partners found.'
              : 'No sub-franchises registered under your network yet.'}
          </div>
        ) : (
          displayPartners.map((p) => (
            <div
              key={p._id}
              className="card"
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #0284c7',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Header: Avatar, Name, ID & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {p.fullName?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                      {p.fullName}
                    </div>
                    <div
                      onClick={() => handleCopyId(p.franchiseId)}
                      title="Click to copy ID"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        marginTop: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                        {p.franchiseId}
                      </span>
                      {copiedId === p.franchiseId ? (
                        <Check size={12} color="#16a34a" />
                      ) : (
                        <Copy size={12} color="#94a3b8" />
                      )}
                    </div>
                  </div>
                </div>

                <StatusBadge status={p.accountStatus} />
              </div>

              {/* Tag & Territory Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <FranchiseTypeBadge type={p.franchiseType} />
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    background: '#f8fafc',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <MapPin size={13} color="#0284c7" />
                  <span>{p.district}, {p.state}</span>
                </div>
              </div>

              {/* Contact Information Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={13} color="#0284c7" />
                  <a
                    href={`tel:${p.mobileNumber}`}
                    style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}
                  >
                    {p.mobileNumber}
                  </a>
                </div>
                {p.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={13} color="#64748b" />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{p.email}</span>
                  </div>
                )}
              </div>

              {/* Equal Action Buttons Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSuperAdmin ? 'repeat(4, 1fr)' : '1fr',
                  gap: '8px',
                  marginTop: '6px',
                  width: '100%',
                }}
              >
                <Link
                  to={`/partners/${p._id}`}
                  style={{
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '0 6px',
                    background: '#0284c7',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
                    whiteSpace: 'nowrap',
                  }}
                  title="View Profile"
                >
                  <Eye size={14} />
                  <span>View</span>
                </Link>

                {isSuperAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      style={{
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '0 6px',
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Edit Details"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openStatusModal(p)}
                      style={{
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '0 6px',
                        background: p.accountStatus === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                        color: p.accountStatus === 'ACTIVE' ? '#16a34a' : '#dc2626',
                        border: p.accountStatus === 'ACTIVE' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Toggle Status"
                    >
                      <Power size={13} />
                      <span>{p.accountStatus === 'ACTIVE' ? 'Active' : 'Status'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPartnerToDelete(p);
                        setDeleteModalOpen(true);
                      }}
                      style={{
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '0 6px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Delete Partner"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total partners)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fetchPartners(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || loading}
              className="btn btn-outline btn-sm"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              onClick={() => fetchPartners(pagination.page + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="btn btn-outline btn-sm"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Status Management Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Partner Status: ${targetPartner?.franchiseId || ''}`}
        maxWidth="440px"
      >
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Update account operational status for <strong>{targetPartner?.fullName}</strong> ({targetPartner?.district}, {targetPartner?.state}).
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Select Operational Status
            </label>
            <select
              className="select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE (Authorized for operations)</option>
              <option value="INACTIVE">INACTIVE (Temporarily disabled)</option>
              <option value="SUSPENDED">SUSPENDED (Restricted by Admin)</option>
              <option value="EXPIRED">EXPIRED (Agreement period ended)</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSaveStatus}>
              Apply Status Change
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Partner Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Partner: ${editingPartner?.franchiseId || ''}`}
        maxWidth="600px"
      >
        <form onSubmit={handleSaveEdit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                City
              </label>
              <input
                type="text"
                className="input"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                PIN Code
              </label>
              <input
                type="text"
                className="input"
                value={editForm.pinCode}
                onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                maxLength={6}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
              Address Line 1
            </label>
            <input
              type="text"
              className="input"
              value={editForm.addressLine1}
              onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
              Administrative Notes
            </label>
            <textarea
              className="input"
              rows={3}
              style={{ resize: 'vertical' }}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Partner Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Franchise Partner"
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
            <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: '700', textTransform: 'uppercase' }}>
              Are you sure you want to delete this partner?
            </div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#DC2626', marginTop: '6px' }}>
              {partnerToDelete?.fullName}
            </div>
            <div style={{ fontSize: '13px', color: '#7F1D1D', fontFamily: 'monospace', marginTop: '2px' }}>
              {partnerToDelete?.franchiseId} • {partnerToDelete?.district}, {partnerToDelete?.state}
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            This action will permanently remove the partner document from MongoDB Atlas, delete their authentication account, and reclaim any assigned inventory back to HQ warehouse.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={confirmDeletePartner}
              disabled={deleteLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {deleteLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartnersPage;
