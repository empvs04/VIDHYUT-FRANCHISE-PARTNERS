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
  Download,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';

const PartnerDetailPage = () => {
  const { id } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();

  const fetchPartnerDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/partners/${id}`);
      if (res.data?.data) {
        setPartner(res.data.data);
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

  const handleToggleStatus = async () => {
    if (!partner) return;
    const newStatus = partner.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Change account status of ${partner.fullName} to ${newStatus}?`)) return;

    try {
      await api.patch(`/partners/${partner._id}/status`, { status: newStatus });
      showToast(`Partner status updated to ${newStatus}`, 'success');
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
    <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link to="/partners" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Partners</span>
        </Link>

        <button
          onClick={handleToggleStatus}
          className={`btn btn-sm ${partner.accountStatus === 'ACTIVE' ? 'btn-danger-outline' : 'btn-outline'}`}
          style={partner.accountStatus === 'INACTIVE' ? { color: '#16a34a', borderColor: '#86efac' } : {}}
        >
          <Power size={14} />
          <span>{partner.accountStatus === 'ACTIVE' ? 'Deactivate Partner' : 'Activate Partner'}</span>
        </button>
      </div>

      {/* Main Identity Banner Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {partner.fullName}
                </h1>
                <StatusBadge status={partner.accountStatus} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '0.5px' }}>
                  Franchise ID: {partner.franchiseId}
                </span>
                <span style={{ color: 'var(--border-color)' }}>•</span>
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered On</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {new Date(partner.joiningDate || partner.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Authorized Territory Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <MapPin size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Authorized Territory</h2>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Authorized State</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {partner.state}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Primary District</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {partner.district}
            </div>
          </div>

          {partner.authorizedDistricts?.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Authorized District Coverage
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {partner.authorizedDistricts.map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: '11.5px',
                      backgroundColor: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: '500',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              backgroundColor: '#f0f9ff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: '#0369a1',
            }}
          >
            🔒 Backend territory rules prevent card allocations & future installations outside {partner.district}.
          </div>
        </div>

        {/* Contact & Login Identifiers Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Building size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Login & Contact Channels</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Phone size={16} color="var(--text-muted)" />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mobile Number (Primary Login)</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>+91 {partner.mobileNumber}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Mail size={16} color="var(--text-muted)" />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email (Secondary Login)</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{partner.email || 'Not provided'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered Office Address</div>
            <div style={{ fontSize: '13.5px', fontWeight: '500', marginTop: '2px' }}>
              {partner.addressLine1}
              {partner.addressLine2 ? `, ${partner.addressLine2}` : ''}
              <br />
              {partner.city}, {partner.state} - {partner.pinCode}
            </div>
          </div>
        </div>

        {/* Government ID & Document Proof Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <ShieldCheck size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Government Proof & Compliance</h2>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID Document Type</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {partner.govIdType !== 'NONE' ? partner.govIdType : 'Pending Submission'}
            </div>
          </div>

          {partner.govIdNumber && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Document Number (Masked)</div>
              <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>
                {partner.verificationDetails?.maskedId || partner.govIdNumber}
              </div>
            </div>
          )}

          {partner.isGovIdVerified ? (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#166534',
                fontSize: '12.5px',
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              <span>{partner.verificationDetails?.message || 'Document structure & checksum validated'}</span>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: '12.5px',
                color: '#92400e',
              }}
            >
              Document proof pending verification
            </div>
          )}

          {/* Attached Documents */}
          {partner.otherDocuments?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Uploaded Attachments ({partner.otherDocuments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {partner.otherDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileCheck size={14} color="#0284c7" />
                      <span style={{ fontWeight: '600' }}>{doc.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Internal Notes Card */}
      {partner.notes && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <FileText size={16} color="#0284c7" />
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Administrative Notes</h3>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {partner.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default PartnerDetailPage;
