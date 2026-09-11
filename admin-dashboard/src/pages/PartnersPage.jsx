import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
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
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const PartnersPage = () => {
  const { isSuperAdmin } = useAuth();
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

  const { showToast } = useNotification();

  const fetchPartners = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: search.trim(),
        franchiseType,
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
  }, [search, franchiseType, accountStatus, stateFilter, districtFilter, showToast]);

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

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Franchise Partner Directory
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            State, District & Sub-Franchise Partners across authorized territories
          </p>
        </div>

        <Link to="/partners/new" className="btn btn-primary">
          <UserPlus size={16} />
          <span>New Franchise Partner</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="input"
              placeholder="Search Partner ID, Name, Mobile, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="select"
              value={franchiseType}
              onChange={(e) => setFranchiseType(e.target.value)}
            >
              <option value="">All Franchise Types</option>
              <option value="STATE_FRANCHISE">State Franchise</option>
              <option value="DISTRICT_FRANCHISE">District Franchise</option>
              <option value="SUB_FRANCHISE">Sub-Franchise</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="select"
              value={accountStatus}
              onChange={(e) => setAccountStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          <div style={{ minWidth: '140px' }}>
            <input
              type="text"
              className="input"
              placeholder="State..."
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '140px' }}>
            <input
              type="text"
              className="input"
              placeholder="District..."
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            />
          </div>

          <button onClick={() => fetchPartners(1)} className="btn btn-outline" title="Refresh List">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
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
            {partners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {loading ? 'Searching partners database...' : 'No matching franchise partners found.'}
                </td>
              </tr>
            ) : (
              partners.map((p) => (
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
      <div className="mobile-cards-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {partners.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            {loading ? 'Searching partners database...' : 'No matching franchise partners found.'}
          </div>
        ) : (
          partners.map((p) => (
            <div key={p._id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{p.fullName}</div>
                  <div
                    onClick={() => handleCopyId(p.franchiseId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: 'var(--color-primary)',
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{p.franchiseId}</span>
                    {copiedId === p.franchiseId ? <Check size={12} color="#16a34a" /> : <Copy size={12} style={{ opacity: 0.6 }} />}
                  </div>
                </div>
                <StatusBadge status={p.accountStatus} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FranchiseTypeBadge type={p.franchiseType} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {p.district}, {p.state}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} color="#64748B" />
                  <span>{p.mobileNumber}</span>
                </div>
                {p.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="#64748B" />
                    <span>{p.email}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <Link to={`/partners/${p._id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <Eye size={14} />
                  <span>Profile</span>
                </Link>
                {isSuperAdmin && (
                  <>
                    <button onClick={() => openEditModal(p)} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button onClick={() => openStatusModal(p)} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      <Power size={14} color={p.accountStatus === 'ACTIVE' ? '#16A34A' : '#DC2626'} />
                      <span>Status</span>
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
    </div>
  );
};

export default PartnersPage;
