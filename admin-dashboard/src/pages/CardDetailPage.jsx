import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  User,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Layers,
  History,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
} from 'lucide-react';
import api from '../services/api';
import { CardStatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CardDetailPage = () => {
  const { id } = useParams();
  const { isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status Action Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('BLOCKED');
  const [statusReason, setStatusReason] = useState('');

  const fetchCardDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [cardRes, histRes] = await Promise.all([
        api.get(`/cards/${id}`),
        api.get(`/cards/${id}/history`),
      ]);

      if (cardRes.data?.data) {
        setCard(cardRes.data.data);
      }
      if (histRes.data?.data) {
        setHistory(histRes.data.data.history || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load card details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchCardDetails();
  }, [fetchCardDetails]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Serial "${text}" copied!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Status Change Submit
  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (targetStatus === 'BLOCKED' && !statusReason.trim()) {
      showToast('Please provide a reason for blocking this card.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.patch(`/cards/${id}/status`, {
        newStatus: targetStatus,
        reason: statusReason.trim(),
      });

      showToast(`Card status updated to ${targetStatus}!`, 'success');
      setShowStatusModal(false);
      setStatusReason('');
      fetchCardDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update card status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
        <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading Card Details & History...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Card Not Found</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
          The requested card record does not exist or has been removed.
        </p>
        <Link to="/cards" className="btn btn-outline">
          Back to Card Inventory
        </Link>
      </div>
    );
  }

  const isHQ = card.currentOwnerType === 'HEADQUARTERS' || !card.currentOwnerId;
  const owner = card.currentOwnerId;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Navigation & Status Card */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <Link to="/cards" className="page-header-back-btn" title="Back to Inventory">
            <ArrowLeft size={18} />
          </Link>
          <div className="page-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
                {card.serialNumber}
              </h1>
              <CardStatusBadge status={card.status} />
              <button
                type="button"
                onClick={() => handleCopy(card.serialNumber)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: copied ? '#16A34A' : '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Copy Serial Number"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="page-subtitle">
              Permanent Physical Electric Saver Card Registry Record
            </p>
          </div>
        </div>

        {/* Super Admin Status Action Buttons */}
        {isSuperAdmin && card.status !== 'INSTALLED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {card.status === 'BLOCKED' ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setTargetStatus('AVAILABLE');
                  setShowStatusModal(true);
                }}
                style={{ backgroundColor: '#16A34A', borderColor: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Unlock size={14} />
                <span>Unblock Card</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setTargetStatus('BLOCKED');
                  setShowStatusModal(true);
                }}
                style={{ color: '#DC2626', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Lock size={14} />
                <span>Block / QC Hold</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Blocked Alert Banner if Status is Blocked */}
      {card.status === 'BLOCKED' && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <ShieldAlert size={22} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#991B1B' }}>
              Card is Currently BLOCKED / QC Hold
            </div>
            <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
              Reason: <strong>{card.blockedReason || 'Restricted by Super Admin'}</strong>
            </div>
            {card.blockedAt && (
              <div style={{ fontSize: '11.5px', color: '#7F1D1D', marginTop: '4px' }}>
                Blocked on {formatDate(card.blockedAt)} by {card.blockedBy?.fullName || 'Super Admin'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 1 & 2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card Metadata Specifications */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <CreditCard size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Card Specifications</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Serial Number:</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{card.serialNumber}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <CardStatusBadge status={card.status} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ownership Type:</span>
              <strong>{isHQ ? 'Vidhyut Saathi HQ (Central Warehouse)' : 'Franchise Partner Possession'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Batch Identifier:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{card.batchId || 'MANUAL-ENTRY'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Registered Date:</span>
              <span>{formatDate(card.createdAt)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last Updated:</span>
              <span>{formatDate(card.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Current Owner Details */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Building2 size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Current Custody & Ownership</h2>
          </div>

          {isHQ ? (
            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Building2 size={24} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Vidhyut Saathi Energy Savers Pvt. Ltd.</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Central Warehouse • Ready for Partner Allocation
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Partner Name:</span>
                <strong style={{ color: '#0284C7' }}>{owner?.fullName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Franchise ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>{owner?.franchiseId}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Franchise Level:</span>
                <FranchiseTypeBadge type={owner?.franchiseType} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Territory:</span>
                <span>
                  {owner?.district}, {owner?.state}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mobile Number:</span>
                <span>{owner?.mobileNumber}</span>
              </div>

              {card.previousOwnerId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Transferred From:</span>
                  <span style={{ fontWeight: '600', color: '#9333EA' }}>
                    {card.previousOwnerId.fullName} ({card.previousOwnerId.franchiseId || 'Partner'})
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Date:</span>
                <span>{formatDate(card.assignedAt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Immutable Ownership History & Audit Trail */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <History size={18} color="#0284c7" />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Immutable Audit History Trail</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Permanent chronological record of every stock creation, assignment, and status transition
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No audit records found for this card.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '24px' }}>
            {/* Vertical timeline connector line */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '7px',
                width: '2px',
                backgroundColor: '#E2E8F0',
              }}
            />

            {history.map((event, idx) => {
              const isFirst = idx === 0;

              return (
                <div
                  key={event._id}
                  style={{
                    position: 'relative',
                    marginBottom: idx === history.length - 1 ? '0' : '22px',
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: isFirst ? '#0284C7' : '#94A3B8',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 0 1px #CBD5E1',
                    }}
                  />

                  {/* Event content box */}
                  <div
                    style={{
                      backgroundColor: isFirst ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor:
                              event.action === 'CREATED'
                                ? '#E0F2FE'
                                : event.action === 'ASSIGNED'
                                ? '#DCFCE7'
                                : event.action === 'BLOCKED'
                                ? '#FEE2E2'
                                : '#F1F5F9',
                            color:
                              event.action === 'CREATED'
                                ? '#0369A1'
                                : event.action === 'ASSIGNED'
                                ? '#15803D'
                                : event.action === 'BLOCKED'
                                ? '#B91C1C'
                                : '#475569',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          {event.action}
                        </span>

                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Status: {event.newStatus}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        <span>{formatDate(event.timestamp)}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {event.reason || 'Status updated'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                      <div>
                        {event.toOwnerId ? (
                          <span>
                            Owner: <strong>{event.toOwnerId.fullName}</strong> ({event.toOwnerId.franchiseId})
                          </span>
                        ) : (
                          <span>Owner: <strong>Vidhyut Saathi HQ</strong></span>
                        )}
                      </div>

                      <div>
                        Logged by: <strong>{event.performedBy?.fullName || 'Super Admin'}</strong> ({event.performedByRole})
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Modal for Block / Unblock */}
      {showStatusModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {targetStatus === 'BLOCKED' ? (
                <ShieldAlert size={22} color="#DC2626" />
              ) : (
                <CheckCircle2 size={22} color="#16A34A" />
              )}
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                {targetStatus === 'BLOCKED' ? 'Block Card (QC Hold)' : 'Unblock Card to Available'}
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {targetStatus === 'BLOCKED'
                ? `Blocking card ${card.serialNumber} prevents any partner allocation or customer installation.`
                : `Unblocking card ${card.serialNumber} restores it to AVAILABLE status in the warehouse.`}
            </p>

            <form onSubmit={handleStatusChangeSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  {targetStatus === 'BLOCKED' ? 'Reason for Blocking' : 'Unblocking Notes'}{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', padding: '10px' }}
                  placeholder={
                    targetStatus === 'BLOCKED'
                      ? 'e.g. Defective NFC chip detected during quality inspection'
                      : 'e.g. QC re-testing verified chip functionality'
                  }
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowStatusModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: targetStatus === 'BLOCKED' ? '#DC2626' : '#16A34A',
                    borderColor: targetStatus === 'BLOCKED' ? '#DC2626' : '#16A34A',
                  }}
                  disabled={actionLoading || !statusReason.trim()}
                >
                  {actionLoading
                    ? 'Updating...'
                    : targetStatus === 'BLOCKED'
                    ? 'Confirm Block Card'
                    : 'Confirm Unblock Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardDetailPage;
