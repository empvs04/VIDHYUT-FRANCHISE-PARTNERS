import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Send,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  DollarSign,
  User,
  Phone,
  MapPin,
  Calendar,
  Check,
  X,
  Upload,
  RefreshCw,
  ExternalLink,
  Layers,
  Printer,
  Copy,
} from 'lucide-react';
import api from '../services/api';
import {
  TransactionStatusBadge,
  PaymentStatusBadge,
  TransactionTypeBadge,
  CardStatusBadge,
  FranchiseTypeBadge,
} from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, partner: currentPartner } = useAuth();
  const { showToast } = useNotification();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'CONFIRM' | 'DISPUTE' | 'PAYMENT_PROOF' | 'VERIFY_PAYMENT' | 'CANCEL'
  const [modalNotes, setModalNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('QUANTITY_MISMATCH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch transaction details
  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/transactions/${id}`);
      if (res.data?.data?.transaction) {
        setTransaction(res.data.data.transaction);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error fetching transaction details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  // Actions
  const handleConfirmTransaction = async () => {
    setActionLoading(true);
    try {
      await api.post(`/transactions/${id}/confirm`, {
        notes: modalNotes.trim() || undefined,
      });
      showToast('Consignment confirmed successfully! Inventory updated.', 'success');
      setActiveModal(null);
      fetchTransaction();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to confirm consignment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeTransaction = async () => {
    if (!modalNotes.trim()) {
      showToast('Please provide detailed dispute notes', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/transactions/${id}/dispute`, {
        disputeReason,
        disputeNotes: modalNotes.trim(),
      });
      showToast('Transaction disputed. Head Office notified.', 'warning');
      setActiveModal(null);
      fetchTransaction();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit dispute', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentReference.trim()) {
      showToast('Please enter Payment Reference / UTR Number', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/transactions/${id}/payment-proof`, {
        referenceNumber: paymentReference.trim(),
        paymentMethod,
        notes: modalNotes.trim() || undefined,
      });
      showToast('Payment proof submitted successfully!', 'success');
      setActiveModal(null);
      fetchTransaction();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit payment proof', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayment = async (approved) => {
    setActionLoading(true);
    try {
      await api.post(`/transactions/${id}/verify-payment`, {
        approved,
        notes: modalNotes.trim() || undefined,
      });
      showToast(
        approved ? 'Payment verified successfully!' : 'Payment marked as rejected',
        approved ? 'success' : 'warning'
      );
      setActiveModal(null);
      fetchTransaction();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTransaction = async () => {
    setActionLoading(true);
    try {
      await api.post(`/transactions/${id}/cancel`, {
        cancellationReason: modalNotes.trim() || undefined,
      });
      showToast('Transaction cancelled and stock released back to seller', 'info');
      setActiveModal(null);
      fetchTransaction();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel transaction', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={28} style={{ margin: '0 auto 12px' }} />
        <div>Loading transaction certificate details...</div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <XCircle size={40} style={{ color: '#DC2626', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Transaction Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>The requested transfer ID does not exist or you do not have permission to view it.</p>
        <Link to="/transactions" className="btn btn-primary">Back to Transactions</Link>
      </div>
    );
  }

  const sellerPartner = transaction.sellerPartnerId || transaction.fromPartner;
  const buyerPartner = transaction.buyerPartnerId || transaction.toPartner;

  // Permissions
  const isReceiver =
    !isSuperAdmin &&
    currentPartner?._id &&
    (buyerPartner?._id || buyerPartner)?.toString() === currentPartner._id.toString();
  const isSender =
    isSuperAdmin ||
    (currentPartner?._id &&
      (sellerPartner?._id || sellerPartner)?.toString() === currentPartner._id.toString());
  const canConfirm =
    transaction.status === 'PENDING_CONFIRMATION' && (isReceiver || isSuperAdmin);
  const canDispute =
    transaction.status === 'PENDING_CONFIRMATION' && isReceiver;
  const canCancel =
    transaction.status === 'PENDING_CONFIRMATION' && isSender;
  const canSubmitPaymentProof =
    transaction.transactionType === 'SALE' &&
    transaction.paymentStatus !== 'VERIFIED' &&
    (isReceiver || isSender);
  const canVerifyPayment =
    isSuperAdmin &&
    transaction.transactionType === 'SALE' &&
    transaction.paymentStatus === 'SUBMITTED';

  return (
    <div>
      {/* Top Header & Breadcrumb */}
      <div className="page-header-wrap" style={{ marginBottom: '18px' }}>
        <div className="page-header-left">
          <button
            onClick={() => navigate('/transactions')}
            className="page-header-back-btn"
            title="Back to Transactions"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="page-header-text">
            <h1 className="page-title" style={{ fontSize: '18px' }}>
              Consignment Certificate Details
            </h1>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            onClick={() => window.print()}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={16} />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Header Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '6px solid #0284C7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {transaction.transactionId}
              </h1>
              <TransactionTypeBadge type={transaction.transactionType} />
              <TransactionStatusBadge status={transaction.status} />
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Consignment created on{' '}
              <strong>
                {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {canConfirm && (
              <button
                onClick={() => {
                  setModalNotes('');
                  setActiveModal('CONFIRM');
                }}
                className="btn btn-primary"
                style={{ backgroundColor: '#16A34A', borderColor: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} /> Confirm Receipt & Accept Stock
              </button>
            )}

            {canDispute && (
              <button
                onClick={() => {
                  setDisputeReason('QUANTITY_MISMATCH');
                  setModalNotes('');
                  setActiveModal('DISPUTE');
                }}
                className="btn btn-outline"
                style={{ color: '#DC2626', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={16} /> Dispute Shipment
              </button>
            )}

            {canSubmitPaymentProof && (
              <button
                onClick={() => {
                  setPaymentReference('');
                  setPaymentMethod('UPI');
                  setModalNotes('');
                  setActiveModal('PAYMENT_PROOF');
                }}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={16} /> Submit Payment Proof
              </button>
            )}

            {canVerifyPayment && (
              <button
                onClick={() => {
                  setModalNotes('');
                  setActiveModal('VERIFY_PAYMENT');
                }}
                className="btn btn-outline"
                style={{ color: '#047857', borderColor: '#A7F3D0', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={16} /> Verify Payment
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => {
                  setModalNotes('');
                  setActiveModal('CANCEL');
                }}
                className="btn btn-outline"
                style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <X size={16} /> Cancel Consignment
              </button>
            )}
          </div>
        </div>

        {/* Dispute Alert Banner if Disputed */}
        {transaction.status === 'DISPUTED' && (
          <div style={{ marginTop: '20px', padding: '14px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#B91C1C' }}>
                Consignment Disputed: {transaction.disputeReason}
              </div>
              <div style={{ fontSize: '12.5px', color: '#7F1D1D', marginTop: '2px' }}>
                {transaction.disputeNotes || 'Dispute raised by receiving franchise partner.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: 1. Transfer Parties & Commercials */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Origin / Seller Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} /> Consignment Origin (Sender)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              {sellerPartner ? (sellerPartner.fullName || sellerPartner.name) : 'Vidhyut Saathi Energy Savers HQ'}
            </div>

            {sellerPartner ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {sellerPartner.franchiseId || sellerPartner.franchiseCode}
                  </span>
                  {sellerPartner.franchiseType && (
                    <FranchiseTypeBadge type={sellerPartner.franchiseType} />
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Territory: {sellerPartner.district || sellerPartner.authorizedDistrict || sellerPartner.state || sellerPartner.authorizedState || 'India'}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> {sellerPartner.mobileNumber || sellerPartner.phone || 'N/A'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Central Warehouse Stock Allocation
              </div>
            )}
          </div>
        </div>

        {/* Destination / Buyer Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} /> Consignment Destination (Receiver)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              {buyerPartner?.fullName || buyerPartner?.name || 'Unknown Partner'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '700' }}>
                {buyerPartner?.franchiseId || buyerPartner?.franchiseCode}
              </span>
              {buyerPartner?.franchiseType && (
                <FranchiseTypeBadge type={buyerPartner.franchiseType} />
              )}
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> Territory: {buyerPartner?.district || buyerPartner?.authorizedDistrict || buyerPartner?.state || buyerPartner?.authorizedState || 'Unassigned'}
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} /> {buyerPartner?.mobileNumber || buyerPartner?.phone || 'N/A'}
            </div>
          </div>
        </div>

        {/* Commercials Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={15} /> Commercials & Value
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Quantity:</span>
              <span style={{ fontWeight: '800', color: '#0284C7' }}>{transaction.quantity} Cards</span>
            </div>

            {transaction.freeQuantity !== undefined && transaction.freeQuantity > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chargeable (Paid) Cards:</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>
                    {transaction.paidQuantity !== undefined ? transaction.paidQuantity : Math.max(0, transaction.quantity - transaction.freeQuantity)} Cards
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#FDF4FF', padding: '4px 8px', borderRadius: '6px', border: '1px solid #F0ABFC' }}>
                  <span style={{ color: '#86198F', fontWeight: '700' }}>🎁 Free / Complimentary:</span>
                  <span style={{ fontWeight: '800', color: '#86198F' }}>
                    {transaction.freeQuantity} Free Cards (₹0)
                  </span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Rate Per Card:</span>
              <span style={{ fontWeight: '600' }}>₹{transaction.pricePerCard || 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
              <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Total Consignment Value:</span>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#16A34A' }}>
                ₹{(transaction.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Payment Status:</span>
              <PaymentStatusBadge status={transaction.paymentStatus} />
            </div>

            {transaction.paymentReference && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>UTR / Ref:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{transaction.paymentReference}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manifest of Cards Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={18} className="text-primary" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
              Consignment Serial Number Manifest ({transaction.cards?.length || 0} Units)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Status in this batch
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#FFFFFF' }}>
                <th style={{ padding: '10px 16px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)' }}>#</th>
                <th style={{ padding: '10px 16px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)' }}>SERIAL NUMBER</th>
                <th style={{ padding: '10px 16px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)' }}>BATCH ID</th>
                <th style={{ padding: '10px 16px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)' }}>CURRENT STATUS</th>
                <th style={{ padding: '10px 16px', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {transaction.cards?.map((c, idx) => (
                <tr key={c._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>
                      {c.serialNumber}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {c.cardBatchId || 'STANDARD'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <CardStatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link
                      to={`/cards/${c._id}`}
                      className="btn btn-outline"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      title="Inspect card lifecycle history"
                    >
                      Audit Card <ExternalLink size={10} style={{ marginLeft: '4px' }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Notes Section */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} /> Audit Trail & Remarks Log
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
          {transaction.notes && (
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <strong>Transfer Notes:</strong> {transaction.notes}
            </div>
          )}

          {transaction.confirmedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D' }}>
              <CheckCircle2 size={16} />
              <span>
                Confirmed & Activated by receiver on{' '}
                <strong>
                  {new Date(transaction.confirmedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            </div>
          )}

          {transaction.paymentVerifiedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
              <ShieldCheck size={16} />
              <span>
                Payment officially verified by Super Admin on{' '}
                <strong>
                  {new Date(transaction.paymentVerifiedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Confirm Receipt */}
      {activeModal === 'CONFIRM' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#15803D', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> Confirm Consignment Receipt
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              By confirming, all <strong>{transaction.quantity} cards</strong> will be immediately updated to <strong>ASSIGNED</strong> under your franchise account.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Remarks (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Package inspected & approved"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setActiveModal(null)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmTransaction} disabled={actionLoading} style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}>
                {actionLoading ? <RefreshCw className="spin" size={16} /> : <Check size={16} />} Confirm & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Dispute Shipment */}
      {activeModal === 'DISPUTE' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#DC2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Dispute Consignment
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Reason</label>
              <select className="form-control" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
                <option value="QUANTITY_MISMATCH">Quantity Mismatch</option>
                <option value="WRONG_SERIALS">Wrong Serial Numbers</option>
                <option value="DAMAGED_CARDS">Damaged Cards</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Dispute Explanation *</label>
              <textarea className="form-control" rows="3" value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setActiveModal(null)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDisputeTransaction} disabled={actionLoading || !modalNotes.trim()} style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}>
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Submit Payment Proof */}
      {activeModal === 'PAYMENT_PROOF' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>
              Submit Payment Reference
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Payment Mode</label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>UTR / Reference Number *</label>
              <input type="text" className="form-control" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setActiveModal(null)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitPaymentProof} disabled={actionLoading || !paymentReference.trim()}>
                Submit Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Verify Payment */}
      {activeModal === 'VERIFY_PAYMENT' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>
              Verify Consignment Payment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              UTR Reference: <strong>{transaction.paymentReference}</strong> (₹{(transaction.totalAmount || 0).toLocaleString('en-IN')})
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => handleVerifyPayment(false)} style={{ color: '#DC2626' }}>Reject</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" onClick={() => setActiveModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleVerifyPayment(true)} style={{ backgroundColor: '#15803D' }}>Approve Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Cancel */}
      {activeModal === 'CANCEL' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#DC2626', marginBottom: '12px' }}>
              Cancel Consignment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Are you sure? All {transaction.quantity} locked cards will be released back into your available inventory.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setActiveModal(null)}>Back</button>
              <button className="btn btn-primary" onClick={handleCancelTransaction} style={{ backgroundColor: '#DC2626' }}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
