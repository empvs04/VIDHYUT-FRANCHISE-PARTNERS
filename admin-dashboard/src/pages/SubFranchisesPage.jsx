import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  Filter,
  Eye,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
  Network,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const SubFranchisesPage = () => {
  const { isSuperAdmin, partner: authPartner } = useAuth();
  const { showToast } = useNotification();

  const [subFranchises, setSubFranchises] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [parentsList, setParentsList] = useState([]);

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetPartner, setTargetPartner] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

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

  // Delete Modal State (Super Admin)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch States list
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

  // Fetch Districts when state changes
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

  // Fetch Franchise Partners list to populate parent filter dropdown
  useEffect(() => {
    const fetchParents = async () => {
      try {
        const res = await api.get('/partners', { params: { limit: 100 } });
        if (res.data?.data?.partners) {
          const eligible = res.data.data.partners.filter(
            (p) => p.franchiseType !== 'SUB_FRANCHISE'
          );
          setParentsList(eligible);
        }
      } catch {}
    };
    fetchParents();
  }, []);

  // Fetch Sub-Franchise Partners
  const fetchSubFranchises = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: search.trim(),
        franchiseType: 'SUB_FRANCHISE',
        accountStatus,
        state: stateFilter.trim(),
        district: districtFilter.trim(),
        parentPartnerId: parentFilter || undefined,
      };

      const res = await api.get('/partners', { params });
      if (res.data?.data) {
        setSubFranchises(res.data.data.partners);
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Failed to fetch sub-franchise partners.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, accountStatus, stateFilter, districtFilter, parentFilter, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubFranchises(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSubFranchises]);

  // Copy helper
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Franchise ID "${id}" copied!`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status Modal
  const openStatusModal = (partner) => {
    setTargetPartner(partner);
    setSelectedStatus(partner.accountStatus);
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!targetPartner) return;
    try {
      await api.patch(`/partners/${targetPartner._id}/status`, { status: selectedStatus });
      showToast(`Sub-franchise status updated to ${selectedStatus}`, 'success');
      setStatusModalOpen(false);
      fetchSubFranchises(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Edit Modal
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

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      await api.put(`/partners/${editingPartner._id}`, editForm);
      showToast('Sub-franchise details updated successfully!', 'success');
      setEditModalOpen(false);
      fetchSubFranchises(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update sub-franchise', 'error');
    }
  };

  // Delete Sub-Franchise Handler
  const confirmDeletePartner = async () => {
    if (!partnerToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/partners/${partnerToDelete._id}`);
      showToast(res.data?.message || 'Sub-Franchise partner deleted successfully.', 'success');
      setDeleteModalOpen(false);
      setPartnerToDelete(null);
      fetchSubFranchises(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete sub-franchise partner', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Building2 size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">Sub-Franchise Partners Directory</h1>
            <p className="page-subtitle">
              Comprehensive registry of all Sub-Franchise partners created under State & District Franchise Partners across all territories.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            onClick={() => fetchSubFranchises(pagination.page)}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <Network size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '12.5px', color: '#166534', lineHeight: 1.45 }}>
          <strong style={{ color: '#14532d' }}>Franchise Hierarchy Notice:</strong> Sub-Franchise partners are appointed directly by Franchise Partners. Card stock distribution to Sub-Franchises is performed exclusively by their parent Franchise Partner.
        </div>
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
          <Link
            to="/partners"
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
              background: '#F0F9FF',
              border: '1.5px solid #BAE6FD',
              color: '#0369A1',
            }}
          >
            <Users size={15} color="#0284C7" />
            <span>&larr; Franchise Partners (State & District)</span>
          </Link>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
            }}
          >
            <Building2 size={15} />
            <span>Sub-Franchise Partners Directory</span>
          </div>
        </div>
      )}

      {/* Filter & Search Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        {/* Row 1: Search Bar & Reset Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search Sub-Franchise, ID, Mobile, City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', paddingRight: search ? '60px' : '14px', fontSize: '13.5px' }}
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

          {(search || parentFilter || accountStatus || stateFilter || districtFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setParentFilter('');
                setAccountStatus('');
                setStateFilter('');
                setDistrictFilter('');
              }}
              className="btn btn-outline"
              style={{ fontSize: '12.5px', padding: '8px 14px', color: '#64748b' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: 4-Column Dropdown Selectors */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* 1. Parent Franchise Partner Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px', display: 'block', letterSpacing: '0.5px' }}>
              Parent Franchise Partner
            </label>
            <select
              className="select"
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
            >
              <option value="">All Parent Franchises</option>
              {parentsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.fullName} ({p.franchiseId})
                </option>
              ))}
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
              style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
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
              style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
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
              style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
            >
              <option value="">{stateFilter ? 'All Districts' : 'Select State First'}</option>
              {districtsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Sub-Franchises Table (Desktop Table Only) */}
      <div className="card desktop-table-only" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                <th style={{ padding: '14px 18px' }}>Sub-Franchise Partner</th>
                <th style={{ padding: '14px 18px' }}>Parent Franchise Partner</th>
                <th style={{ padding: '14px 18px' }}>Territory (State / District)</th>
                <th style={{ padding: '14px 18px' }}>Contact Info</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Created Date</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading sub-franchise partners...
                  </td>
                </tr>
              ) : subFranchises.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No sub-franchise partners found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                subFranchises.map((partner) => (
                  <tr key={partner._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                    {/* Partner Name & Franchise ID */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{partner.fullName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>{partner.franchiseId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(partner.franchiseId)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                          title="Copy ID"
                        >
                          {copiedId === partner.franchiseId ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    {/* Parent Franchise Partner */}
                    <td style={{ padding: '14px 18px' }}>
                      {partner.parentPartnerId ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {partner.parentPartnerId.fullName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {partner.parentPartnerId.franchiseId} ({partner.parentPartnerId.franchiseType?.replace('_FRANCHISE', '')})
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Super Admin / HQ</span>
                      )}
                    </td>

                    {/* Territory */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                        <MapPin size={13} color="#0284c7" />
                        <span>{partner.district}, {partner.state}</span>
                      </div>
                      {partner.city && <div style={{ fontSize: '11px', color: '#64748b', marginLeft: '17px' }}>{partner.city}</div>}
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                        <Phone size={12} color="#64748b" />
                        <span>{partner.mobileNumber}</span>
                      </div>
                      {partner.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                          <Mail size={11} />
                          <span>{partner.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={partner.accountStatus} />
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(partner.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link
                          to={`/partners/${partner._id}`}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '4px 8px' }}
                          title="View Profile"
                        >
                          <Eye size={13} />
                        </Link>
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(partner)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px' }}
                              title="Edit Details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusModal(partner)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px' }}
                              title="Change Status"
                            >
                              <Power size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPartnerToDelete(partner);
                                setDeleteModalOpen(true);
                              }}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px', borderColor: '#fca5a5', color: '#dc2626' }}
                              title="Delete Sub-Franchise"
                            >
                              <Trash2 size={13} />
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
      </div>

      {/* Mobile Responsive Cards View (Sub-Franchises) */}
      <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {subFranchises.length === 0 ? (

          <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            {loading ? 'Searching sub-franchises...' : 'No sub-franchise partners found.'}
          </div>
        ) : (
          subFranchises.map((partner) => (
            <div
              key={partner._id}
              className="card"
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #059669',
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
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {partner.fullName?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                      {partner.fullName}
                    </div>
                    <div
                      onClick={() => handleCopyId(partner.franchiseId)}
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
                        {partner.franchiseId}
                      </span>
                      {copiedId === partner.franchiseId ? (
                        <Check size={12} color="#16a34a" />
                      ) : (
                        <Copy size={12} color="#94a3b8" />
                      )}
                    </div>
                  </div>
                </div>

                <StatusBadge status={partner.accountStatus} />
              </div>

              {/* Parent Partner & Territory Tag */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {partner.parentPartnerId && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      background: '#eff6ff',
                      color: '#1e40af',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #dbeafe',
                      fontWeight: 600,
                      width: 'fit-content',
                    }}
                  >
                    <span>Parent: {partner.parentPartnerId.fullName} ({partner.parentPartnerId.franchiseId})</span>
                  </div>
                )}

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
                    width: 'fit-content',
                  }}
                >
                  <MapPin size={13} color="#059669" />
                  <span>{partner.district}, {partner.state} {partner.city ? `(${partner.city})` : ''}</span>
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
                  <Phone size={13} color="#059669" />
                  <a
                    href={`tel:${partner.mobileNumber}`}
                    style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}
                  >
                    {partner.mobileNumber}
                  </a>
                </div>
                {partner.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={13} color="#64748b" />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{partner.email}</span>
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
                  to={`/partners/${partner._id}`}
                  style={{
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '0 6px',
                    background: '#059669',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
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
                      onClick={() => openEditModal(partner)}
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
                      onClick={() => openStatusModal(partner)}
                      style={{
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '0 6px',
                        background: partner.accountStatus === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                        color: partner.accountStatus === 'ACTIVE' ? '#16a34a' : '#dc2626',
                        border: partner.accountStatus === 'ACTIVE' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Toggle Status"
                    >
                      <Power size={13} />
                      <span>{partner.accountStatus === 'ACTIVE' ? 'Active' : 'Status'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPartnerToDelete(partner);
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
                      title="Delete Sub-Franchise"
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
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: '#ffffff',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Showing {subFranchises.length} of {pagination.total} Sub-Franchise Partners (Page {pagination.page} of {pagination.totalPages || 1})
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => fetchSubFranchises(pagination.page - 1)}
            className="btn btn-sm btn-secondary"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => fetchSubFranchises(pagination.page + 1)}
            className="btn btn-sm btn-secondary"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>


      {/* Status Modal */}
      {statusModalOpen && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Update Status: ${targetPartner?.fullName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Change the operational account status for this Sub-Franchise partner.
            </p>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Account Status
              </label>
              <select
                className="form-control"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveStatus}
              >
                Save Status
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Sub-Franchise: ${editingPartner?.fullName}`}
        >
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Full Name
              </label>
              <input
                type="text"
                className="form-control"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Email
              </label>
              <input
                type="email"
                className="form-control"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  City / Town
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  PIN Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.pinCode}
                  onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Address
              </label>
              <input
                type="text"
                className="form-control"
                value={editForm.addressLine1}
                onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Internal Notes
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Sub-Franchise
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Partner Modal */}
      {deleteModalOpen && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Sub-Franchise Partner"
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
                Are you sure you want to delete this Sub-Franchise?
              </div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#DC2626', marginTop: '6px' }}>
                {partnerToDelete?.fullName}
              </div>
              <div style={{ fontSize: '13px', color: '#7F1D1D', fontFamily: 'monospace', marginTop: '2px' }}>
                {partnerToDelete?.franchiseId} • {partnerToDelete?.district}, {partnerToDelete?.state}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              This action will permanently remove the Sub-Franchise partner document from MongoDB Atlas, delete their authentication account, and reclaim any assigned inventory back to HQ warehouse.
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
      )}
    </div>
  );
};

export default SubFranchisesPage;
