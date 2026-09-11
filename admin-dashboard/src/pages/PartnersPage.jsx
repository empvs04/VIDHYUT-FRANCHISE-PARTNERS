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
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

const PartnersPage = () => {
  const [partners, setPartners] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [franchiseType, setFranchiseType] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [stateFilter, setStateFilter] = useState('');

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
      };

      const res = await api.get('/partners', { params });
      if (res.data?.data) {
        setPartners(res.data.data.partners);
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Failed to fetch franchise partners.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, franchiseType, accountStatus, stateFilter, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPartners(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPartners]);

  // Handle Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async (partner) => {
    const newStatus = partner.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMessage = `Are you sure you want to change status of ${partner.fullName} (${partner.franchiseId}) to ${newStatus}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.patch(`/partners/${partner._id}/status`, { status: newStatus });
      showToast(`Partner status changed to ${newStatus}`, 'success');
      fetchPartners(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
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
            Franchise Partners Directory
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage State & District Franchise Partners across all authorized territories
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
              placeholder="Search by Name, Mobile, Email, Franchise ID..."
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
            </select>
          </div>

          <div style={{ minWidth: '140px' }}>
            <select
              className="select"
              value={accountStatus}
              onChange={(e) => setAccountStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <input
              type="text"
              className="input"
              placeholder="Filter by State..."
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            />
          </div>

          <button
            onClick={() => fetchPartners(1)}
            className="btn btn-outline"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Partners Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Franchise ID</th>
              <th>Partner Name</th>
              <th>Type</th>
              <th>Territory</th>
              <th>Mobile</th>
              <th>City</th>
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
                  <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                    {p.franchiseId}
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{p.fullName}</div>
                    {p.email && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{p.email}</div>}
                  </td>
                  <td>
                    <FranchiseTypeBadge type={p.franchiseType} />
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{p.district}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{p.state}</div>
                  </td>
                  <td>{p.mobileNumber}</td>
                  <td>{p.city}</td>
                  <td>
                    <StatusBadge status={p.accountStatus} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <Link
                        to={`/partners/${p._id}`}
                        className="btn btn-outline btn-sm"
                        title="View Full Profile"
                      >
                        <Eye size={14} />
                      </Link>

                      <button
                        onClick={() => openEditModal(p)}
                        className="btn btn-outline btn-sm"
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`btn btn-sm ${p.accountStatus === 'ACTIVE' ? 'btn-danger-outline' : 'btn-outline'}`}
                        title={p.accountStatus === 'ACTIVE' ? 'Deactivate Partner' : 'Activate Partner'}
                        style={p.accountStatus === 'INACTIVE' ? { color: '#16a34a' } : {}}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditModalOpen(false)}
            >
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
