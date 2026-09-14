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
      <div className="page-header-wrap" style={{ marginBottom: '16px' }}>
        <div className="page-header-left">
          <Link to="/partners" className="page-header-back-btn" title="Back to Partners">
            <ArrowLeft size={18} />
          </Link>
          <div className="page-header-text">
            <h1 className="page-title" style={{ fontSize: '18px' }}>
              Partner Profile & Network
            </h1>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="page-header-actions">
            <button onClick={() => setStatusModalOpen(true)} className="btn btn-outline btn-sm">
              <Power size={14} color={partner.accountStatus === 'ACTIVE' ? '#16A34A' : '#DC2626'} />
              <span>Manage Status ({partner.accountStatus})</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Identity Banner Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Row: Avatar, Name, Status, and Badges */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '22px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  flexShrink: 0,
                }}
              >
                {partner.fullName.charAt(0).toUpperCase()}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {partner.fullName}
                  </h1>
                  <StatusBadge status={partner.accountStatus} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      fontSize: '13px',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{partner.franchiseId}</span>
                    {copied ? <Check size={13} color="#86EFAC" /> : <Copy size={13} />}
                  </div>

                  <FranchiseTypeBadge type={partner.franchiseType} />

                  {partner.isGovIdVerified && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        padding: '3px 8px',
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

            {/* Registration Date Meta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                alignSelf: 'flex-start',
              }}
            >
              <Calendar size={15} color="#64748B" />
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Registered On
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {new Date(partner.joiningDate || partner.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {partner.expiryDate && (
                <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '8px', marginLeft: '4px' }}>
                  <div style={{ fontSize: '10.5px', color: '#D97706', fontWeight: '600' }}>Expires</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#B45309' }}>
                    {new Date(partner.expiryDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Core Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Authorized Territory Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <MapPin size={18} color="#0284c7" />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Authorized Territory</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>State</div>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {partner.state}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Primary District</div>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {partner.district}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Operational City / Town</div>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                {partner.city} {partner.pinCode ? `(${partner.pinCode})` : ''}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#F0F9FF',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11.5px',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              lineHeight: 1.35,
            }}
          >
            🔒 Backend territory rules enforce operations exclusively within {partner.district}, {partner.state}.
          </div>
        </div>

        {/* Contact & Address Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Building size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Contact & Login Information</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <Phone size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Registered Mobile (OTP Login)</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>+91 {partner.mobileNumber}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <Mail size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Email Address (Login ID)</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{partner.email || 'Not provided'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <MapPin size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Premises Address</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                {partner.addressLine1}
                {partner.addressLine2 ? `, ${partner.addressLine2}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Parent Partner Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Network size={18} color="#0284c7" />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Parent Franchise Partner</h2>
            </div>

            {parentPartner ? (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Authorized Parent</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {parentPartner.fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: '4px' }}>
                    {parentPartner.franchiseId}
                  </span>
                  <FranchiseTypeBadge type={parentPartner.franchiseType} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Territory: {parentPartner.district ? `${parentPartner.district}, ` : ''}{parentPartner.state}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Direct Super Admin Allocation
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  This partner was directly established under Vidhyut Saathi Headquarters without an intermediary State Franchise.
                </p>
              </div>
            )}
          </div>

          {parentPartner && parentPartner._id && (
            <Link
              to={`/partners/${parentPartner._id}`}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
            >
              <span>View Parent Profile</span>
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Child Sub-Franchise Network Table / Mobile Cards */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
              Sub-Franchise Partner Network ({childPartners.length})
            </h2>
          </div>

          {isSuperAdmin && partner.franchiseType !== 'SUB_FRANCHISE' && (
            <Link to="/partners/new" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-only table-responsive">
              <table className="data-table" style={{ width: '100%' }}>
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

            {/* Mobile Touch Cards View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px' }}>
              {childPartners.map((child) => (
                <Link
                  key={child._id}
                  to={`/partners/${child._id}`}
                  className="mobile-card-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {child.fullName}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', marginTop: '2px' }}>
                        {child.franchiseId}
                      </div>
                    </div>
                    <StatusBadge status={child.accountStatus} />
                  </div>

                  <div className="mobile-card-grid">
                    <div>
                      <div className="mobile-card-label">Franchise Level</div>
                      <div className="mobile-card-value">
                        <FranchiseTypeBadge type={child.franchiseType} />
                      </div>
                    </div>

                    <div>
                      <div className="mobile-card-label">City / Area</div>
                      <div className="mobile-card-value">
                        {child.city || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="mobile-card-label">Mobile</div>
                      <div className="mobile-card-value">
                        {child.mobileNumber || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="mobile-card-label">Territory</div>
                      <div className="mobile-card-value">
                        {child.district || partner.district}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', gap: '4px' }}>
                      <span>View Profile</span>
                      <ExternalLink size={13} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Government ID & Compliance Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <ShieldCheck size={18} color="#0284c7" />
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Government Proof Identification</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>ID Document Type</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {partner.govIdType !== 'NONE' ? partner.govIdType : 'Pending'}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>ID Number (Masked)</div>
            <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '4px' }}>
              {partner.verificationDetails?.maskedId || partner.govIdNumber || 'N/A'}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Optical Verification Status</div>
            <div style={{ marginTop: '4px' }}>
              {partner.isGovIdVerified ? (
                <span style={{ color: '#15803D', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Authentic {partner.verificationDetails?.entityType || 'Verified'}
                </span>
              ) : (
                <span style={{ color: '#92400E', fontSize: '12.5px', fontWeight: '600' }}>Pending Verification</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Future Modules Section (Coming in Next Phase) */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', margin: '0 0 14px 0' }}>
          Upcoming Partner Operations (Phase 2+)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <CreditCard size={17} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Card Inventory & Allocation</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 8px 0' }}>Serial number stock & distribution</p>
            <span className="nav-badge-soon" style={{ display: 'inline-block' }}>Coming in Next Phase</span>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <Wrench size={17} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Customer Installations</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 8px 0' }}>GPS validation & electricity bills</p>
            <span className="nav-badge-soon" style={{ display: 'inline-block' }}>Coming in Next Phase</span>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '6px' }}>
              <BarChart3 size={17} />
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Financial Settlements</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 8px 0' }}>Commission calculation & payouts</p>
            <span className="nav-badge-soon" style={{ display: 'inline-block' }}>Coming in Next Phase</span>
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
