import React, { useState } from 'react';
import {
  Search,
  CreditCard,
  User,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Building2,
  Phone,
  Mail,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  FileText,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';

const GlobalAuditPage = () => {
  const [activeTab, setActiveTab] = useState('CARD_AUDIT'); // 'CARD_AUDIT' or 'CUSTOMER_AUDIT'
  const { showToast } = useNotification();

  // Card Audit State
  const [cardSerial, setCardSerial] = useState('');
  const [cardAuditData, setCardAuditData] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Customer Audit State
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerAuditResults, setCustomerAuditResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Handle Card Serial Audit Lookup
  const handleCardSearch = async (e) => {
    e?.preventDefault();
    if (!cardSerial.trim()) {
      showToast('Please enter a Card Serial Number to audit.', 'warning');
      return;
    }

    try {
      setCardLoading(true);
      setCardAuditData(null);
      const res = await api.get(`/reports/audit/card/${encodeURIComponent(cardSerial.trim().toUpperCase())}`);
      if (res.data?.data) {
        setCardAuditData(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || `Card "${cardSerial}" not found in system.`, 'error');
    } finally {
      setCardLoading(false);
    }
  };

  // Handle Customer Deep Search
  const handleCustomerSearch = async (e) => {
    e?.preventDefault();
    if (!customerQuery.trim()) {
      showToast('Please enter Customer ID, Name, or Mobile Number.', 'warning');
      return;
    }

    try {
      setCustomerLoading(true);
      setCustomerAuditResults([]);
      const res = await api.get('/reports/audit/customer', { params: { search: customerQuery.trim() } });
      if (res.data?.data) {
        setCustomerAuditResults(res.data.data);
        if (res.data.data.length === 0) {
          showToast('No matching customer records found.', 'info');
        }
      }
    } catch {
      showToast('Failed to perform customer search.', 'error');
    } finally {
      setCustomerLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <Search size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">Global Audit & Trace Engine</h1>
            <p className="page-subtitle">
              Deep trace single card lifecycle from manufacture to installation and search connected customer records.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('CARD_AUDIT')}
          style={{
            padding: '11px 18px',
            fontWeight: activeTab === 'CARD_AUDIT' ? 800 : 600,
            fontSize: '13.5px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'CARD_AUDIT' ? '3.5px solid #0284c7' : '3.5px solid transparent',
            color: activeTab === 'CARD_AUDIT' ? '#0284c7' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={17} />
          <span>Single Card Serial Audit</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMER_AUDIT')}
          style={{
            padding: '11px 18px',
            fontWeight: activeTab === 'CUSTOMER_AUDIT' ? 800 : 600,
            fontSize: '13.5px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'CUSTOMER_AUDIT' ? '3.5px solid #0284c7' : '3.5px solid transparent',
            color: activeTab === 'CUSTOMER_AUDIT' ? '#0284c7' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <User size={17} />
          <span>Customer Lineage Search</span>
        </button>
      </div>

      {/* TAB 1: CARD SERIAL AUDIT */}
      {activeTab === 'CARD_AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search Box */}
          <div className="card" style={{ padding: '16px' }}>
            <form onSubmit={handleCardSearch} className="audit-search-form">
              <div className="audit-search-input-wrap">
                <input
                  type="text"
                  placeholder="Enter Card Serial Number (e.g., VS000001)..."
                  value={cardSerial}
                  onChange={(e) => setCardSerial(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                />
                <CreditCard
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
                />
              </div>
              <button
                type="submit"
                disabled={cardLoading}
                className="btn btn-primary audit-search-btn"
              >
                {cardLoading ? 'Tracing...' : 'Trace Serial'}
              </button>
            </form>
          </div>

          {/* Search Results / Card Audit View */}
          {cardAuditData && (
            <div className="analytics-chart-grid">
              {/* Card Profile & Current Status */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Card Serial Number
                  </span>
                  <StatusBadge status={cardAuditData.card.status} />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', fontFamily: 'monospace' }}>
                  {cardAuditData.card.serialNumber}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Owner</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                      {cardAuditData.card.currentOwnerId ? (
                        <>
                          <div>{cardAuditData.card.currentOwnerId.fullName} <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>({cardAuditData.card.currentOwnerId.franchiseId})</span></div>
                          <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '2px' }}>
                            {cardAuditData.card.currentOwnerId.franchiseType} • {cardAuditData.card.currentOwnerId.state}
                          </div>
                        </>
                      ) : (
                        'Headquarters (Vidhyut Saathi HQ)'
                      )}
                    </div>
                  </div>

                  {cardAuditData.card.previousOwnerId && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Previous Owner</div>
                      <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '2px' }}>
                        {cardAuditData.card.previousOwnerId.fullName} ({cardAuditData.card.previousOwnerId.franchiseId})
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Date</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '2px' }}>
                      {cardAuditData.card.assignedAt ? new Date(cardAuditData.card.assignedAt).toLocaleString('en-IN') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Installation Link */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={17} color="#0284c7" />
                  <span>Installation & Consumer Details</span>
                </div>

                {cardAuditData.installation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Installation ID</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                        {cardAuditData.installation.installationId}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Customer Name</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {cardAuditData.customer?.fullName} <span style={{ color: '#64748b', fontSize: '12px' }}>({cardAuditData.customer?.customerId})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {cardAuditData.customer?.mobileNumber} • {cardAuditData.customer?.customerType}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Installation Address</div>
                      <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                        {cardAuditData.installation.installationAddress?.fullAddress || `${cardAuditData.installation.installationAddress?.city || ''}, ${cardAuditData.installation.installationAddress?.district || ''}, ${cardAuditData.installation.installationAddress?.state || ''}`}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', marginTop: '2px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Connected Specs</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0369a1', marginTop: '2px' }}>
                        Load: {cardAuditData.installation.connectedLoadKw} kW | Cards: {cardAuditData.installation.installedCardCount} | Amount: ₹{cardAuditData.installation.totalAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                    <AlertTriangle size={28} style={{ marginBottom: '6px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>This card has not yet been installed at a customer premise.</p>
                  </div>
                )}
              </div>

              {/* GPS & Location Audit */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={17} color="#0284c7" />
                  <span>GPS Location Verification</span>
                </div>

                {cardAuditData.locationVerification ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Territory Match</span>
                      {cardAuditData.locationVerification.territoryMatch ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> MATCHED
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={13} /> MISMATCH
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>GPS Coordinates</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace', marginTop: '2px' }}>
                        {cardAuditData.locationVerification.latitude?.toFixed(6)}, {cardAuditData.locationVerification.longitude?.toFixed(6)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                        Accuracy: ±{cardAuditData.locationVerification.accuracyMeters}m ({cardAuditData.locationVerification.accuracyStatus})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Geocoded Address</div>
                      <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                        {cardAuditData.locationVerification.formattedAddress || `${cardAuditData.locationVerification.district || ''}, ${cardAuditData.locationVerification.state || ''}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                    <MapPin size={28} style={{ marginBottom: '6px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No GPS verification record captured yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Timeline */}
          {cardAuditData?.history && cardAuditData.history.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={17} color="#0284c7" />
                <span>Immutable Card Lifecycle History Trail ({cardAuditData.history.length} events)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {cardAuditData.history.map((event, idx) => (
                  <div
                    key={event._id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      paddingBottom: '14px',
                      borderBottom: idx < cardAuditData.history.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                          {event.action}
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          Status: <strong>{event.newStatus}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(event.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ fontSize: '12.5px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b' }}>From: </span>
                      {event.fromOwnerId?.fullName ? `${event.fromOwnerId.fullName} (${event.fromOwnerId.franchiseId})` : event.fromOwnerType || 'HQ'}
                      {' → '}
                      <span style={{ color: '#64748b' }}>To: </span>
                      {event.toOwnerId?.fullName ? `${event.toOwnerId.fullName} (${event.toOwnerId.franchiseId})` : event.toOwnerType || 'HQ'}
                    </div>

                    {event.reason && (
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
                        Note: {event.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER LINEAGE SEARCH */}
      {activeTab === 'CUSTOMER_AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search Input */}
          <div className="card" style={{ padding: '16px' }}>
            <form onSubmit={handleCustomerSearch} className="audit-search-form">
              <div className="audit-search-input-wrap">
                <input
                  type="text"
                  placeholder="Enter Customer ID, Mobile Number, or Full Name..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              </div>
              <button
                type="submit"
                disabled={customerLoading}
                className="btn btn-primary audit-search-btn"
              >
                {customerLoading ? 'Searching...' : 'Search Lineage'}
              </button>
            </form>
          </div>

          {/* Results List */}
          {customerAuditResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {customerAuditResults.map((item) => (
                <div key={item.customer._id} className="card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                        {item.customer.fullName}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                        Customer ID: <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{item.customer.customerId}</strong> • Mobile: {item.customer.mobileNumber}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>{item.customer.customerType}</span>
                      <span className={`badge ${item.customer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                        {item.customer.status}
                      </span>
                    </div>
                  </div>

                  {/* Connected Partner & Address */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Created By Partner</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                        {item.customer.createdByPartnerId?.fullName} <span style={{ color: '#0284c7' }}>({item.customer.createdByPartnerId?.franchiseId})</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {item.customer.createdByPartnerId?.district}, {item.customer.createdByPartnerId?.state}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Premise Address</div>
                      <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                        {item.customer.address?.fullAddress || `${item.customer.address?.city || ''}, ${item.customer.address?.district || ''}, ${item.customer.address?.state || ''}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Electricity Specs</div>
                      <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                        Load: <strong>{item.customer.electricityDetails?.connectedLoadKw} kW</strong> | Board: {item.customer.electricityDetails?.electricityBoard || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Installations Connected */}
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                      Installations & Serial Numbers ({item.installations.length})
                    </div>
                    {item.installations.map((inst) => (
                      <div
                        key={inst._id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          background: '#ffffff',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                            {inst.installationId} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>({new Date(inst.createdAt).toLocaleDateString('en-IN')})</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                            Serials: <strong style={{ color: '#0f172a' }}>{inst.cardSerialNumbers?.join(', ')}</strong> ({inst.installedCardCount} Cards)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                            ₹{inst.totalAmount?.toLocaleString('en-IN')}
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: inst.verificationStatus === 'VERIFIED' ? '#16a34a' : '#f59e0b' }}>
                            {inst.verificationStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalAuditPage;

