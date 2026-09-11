import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building,
  Power,
  Edit2,
  FileText,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Copy,
  Check,
  Network,
  Building2,
  Users,
  CreditCard,
  Wrench,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const PartnerDetailPage = () => {
  const { id } = useParams();
  const { isSuperAdmin } = useAuth();
  const [partner, setPartner] = useState(null);
  const [parentPartner, setParentPartner] = useState(null);
  const [childPartners, setChildPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  const { showToast } = useNotification();

  const fetchPartnerDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/partners/${id}`);
      if (res.data?.data) {
        setPartner(res.data.data);
        setParentPartner(res.data.data.parentPartner || res.data.data.parentPartnerId || null);
        setChildPartners(res.data.data.childPartners || []);
        setSelectedStatus(res.data.data.accountStatus || 'ACTIVE');
      }
    } catch {
      showToast('Failed to fetch partner profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerDetail();
  }, [id]);

  const handleCopyFranchiseId = (idToCopy) => {
    const text = idToCopy || partner?.franchiseId;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Franchise ID "${text}" copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyStatus = async () => {
    if (!partner) return;
    try {
      await api.patch(`/partners/${partner._id}/status`, { status: selectedStatus });
      showToast(`Partner status updated to ${selectedStatus}`, 'success');
      setStatusModalOpen(false);
      fetchPartnerDetail();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading partner record from MongoDB Atlas...
      </div>
    );
  }

  if (!partner) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#dc2626', marginBottom: '16px' }}>Franchise Partner not found.</p>
        <Link to="/partners" className="btn btn-outline">
          Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/partners" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Partners</span>
        </Link>

        {isSuperAdmin && (
          <button onClick={() => setStatusModalOpen(true)} className="btn btn-outline btn-sm">
            <Power size={14} color={partner.accountStatus === 'ACTIVE' ? '#16A34A' : '#DC2626'} />
            <span>Manage Status ({partner.accountStatus})</span>
          </button>
        )}
      </div>

      {/* Main Identity Banner Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '24px',
              }}
            >
              {partner.fullName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {partner.fullName}
                </h1>
                <StatusBadge status={partner.accountStatus} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Franchise ID with Click-to-Copy Button */}
                <div
                  onClick={() => handleCopyFranchiseId(partner.franchiseId)}
                  title="Click to copy Franchise ID"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0F172A',
                    color: '#38BDF8',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                  }}
                >
                  <span>{partner.franchiseId}</span>
                  {copied ? <Check size={14} color="#86EFAC" /> : <Copy size={14} />}
                </div>

                <FranchiseTypeBadge type={partner.franchiseType} />

                {partner.isGovIdVerified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#15803d',
                      backgroundColor: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Verified ID ({partner.govIdType})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered On</div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>
              {new Date(partner.joiningDate || partner.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            {partner.expiryDate && (
              <div style={{ fontSize: '11px', color: '#D97706', marginTop: '3px' }}>
                Expires: {new Date(partner.expiryDate).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Core Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Authorized Territory Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <MapPin size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Authorized Territory</h2>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Authorized State</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {partner.state}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Primary District</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {partner.district}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Operational City / Town</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {partner.city} ({partner.pinCode})
            </div>
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '8px 12px',
              backgroundColor: '#F0F9FF',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11.5px',
              color: '#0369A1',
            }}
          >
            🔒 Backend territory rules enforce operations exclusively within {partner.district}, {partner.state}.
          </div>
        </div>

        {/* Contact & Address Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Building size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Contact & Login Information</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Phone size={16} color="var(--text-muted)" />
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Registered Mobile (OTP Login)</div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>+91 {partner.mobileNumber}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Mail size={16} color="var(--text-muted)" />
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Email Address (Login ID)</div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>{partner.email || 'Not provided'}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Premises Address</div>
            <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>
              {partner.addressLine1}
              {partner.addressLine2 ? `, ${partner.addressLine2}` : ''}
            </div>
          </div>
        </div>

        {/* Parent Partner Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Network size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Parent Franchise Partner</h2>
          </div>

          {parentPartner ? (
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Authorized Parent</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                {parentPartner.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {parentPartner.franchiseId}
                </span>
                <FranchiseTypeBadge type={parentPartner.franchiseType} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Territory: {parentPartner.district ? `${parentPartner.district}, ` : ''}{parentPartner.state}
              </div>
              {parentPartner._id && (
                <Link
                  to={`/partners/${parentPartner._id}`}
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '12px', display: 'inline-flex', fontSize: '12px' }}
                >
                  <span>View Parent Profile</span>
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Direct Super Admin Allocation
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This partner was directly established under Vidhyut Saathi Headquarters without an intermediary State Franchise.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Child Sub-Franchise Network Table / Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>
              Sub-Franchise Partner Network ({childPartners.length})
            </h2>
          </div>

          {isSuperAdmin && partner.franchiseType !== 'SUB_FRANCHISE' && (
            <Link to="/partners/new" className="btn btn-outline btn-sm">
              <Users size={14} />
              <span>Add Sub-Franchise</span>
            </Link>
          )}
        </div>

        {childPartners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
            No Sub-Franchise partners onboarded under this partner yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Franchise ID</th>
                  <th>Partner Name</th>
                  <th>Type</th>
                  <th>City / Area</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {childPartners.map((child) => (
                  <tr key={child._id}>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{child.franchiseId}</td>
                    <td style={{ fontWeight: '600' }}>{child.fullName}</td>
                    <td>
                      <FranchiseTypeBadge type={child.franchiseType} />
                    </td>
                    <td>{child.city}</td>
                    <td>{child.mobileNumber}</td>
                    <td>
                      <StatusBadge status={child.accountStatus} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/partners/${child._id}`} className="btn btn-outline btn-sm">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Government ID & Compliance Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <ShieldCheck size={18} color="#0284c7" />
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Government Proof Identification</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID Document Type</div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              {partner.govIdType !== 'NONE' ? partner.govIdType : 'Pending'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID Number (Masked)</div>
            <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>
              {partner.verificationDetails?.maskedId || partner.govIdNumber || 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Optical Verification Status</div>
            <div style={{ marginTop: '2px' }}>
              {partner.isGovIdVerified ? (
                <span style={{ color: '#15803D', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Authentic {partner.verificationDetails?.entityType || 'Verified'}
                </span>
              ) : (
                <span style={{ color: '#92400E', fontSize: '12px' }}>Pending Verification</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Future Modules Section (Coming in Next Phase) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
          Upcoming Partner Operations (Phase 2+)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <CreditCard size={18} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Card Inventory & Allocation</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>Serial number stock & distribution</p>
            <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <Wrench size={18} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Customer Installations</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>GPS validation & electricity bills</p>
            <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <BarChart3 size={18} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Financial Settlements</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>Commission calculation & payouts</p>
            <span className="nav-badge-soon" style={{ marginTop: '8px', display: 'inline-block' }}>Coming in Next Phase</span>
          </div>
        </div>
      </div>

      {/* Status Management Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Manage Partner Status: ${partner.franchiseId}`}
        maxWidth="440px"
      >
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Select operational status for <strong>{partner.fullName}</strong>.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Operational Status
            </label>
            <select
              className="select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApplyStatus}>
              Apply Status
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartnerDetailPage;
