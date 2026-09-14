import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Zap,
  MapPin,
  CreditCard,
  Building,
  Home,
  Factory,
  CheckCircle2,
  Calendar,
  FileText,
  Camera,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [customer, setCustomer] = useState(null);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Photo Lightbox Modal
  const [modalPhoto, setModalPhoto] = useState(null);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${id}`);
      if (res.data?.data) {
        setCustomer(res.data.data.customer);
        setInstallations(res.data.data.installations || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch customer profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
            <Home size={14} /> Residential
          </span>
        );
      case 'COMMERCIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
            <Building size={14} /> Commercial
          </span>
        );
      case 'INDUSTRIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
            <Factory size={14} /> Industrial
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: 'center', padding: '64px' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
        <div>Loading customer profile...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-body" style={{ textAlign: 'center', padding: '64px' }}>
        <h3>Customer not found</h3>
        <button onClick={() => navigate('/customers')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <button onClick={() => navigate('/customers')} className="page-header-back-btn" title="Back to Customers">
            <ArrowLeft size={18} />
          </button>
          <div className="page-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                {customer.customerId}
              </span>
              {getTypeBadge(customer.customerType)}
            </div>
            <h1 className="page-title">
              {customer.fullName}
            </h1>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="page-header-actions">
            <button
              onClick={() => navigate('/customers/new')}
              className="btn btn-primary"
            >
              <Plus size={18} />
              <span>Add New Installation</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of Profile Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Card 1: Contact & Profile */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Users size={18} color="#0284c7" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Customer Contact</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Mobile Number:</span>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>📱 {customer.mobileNumber}</div>
            </div>
            {customer.alternateMobileNumber && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Alternate Mobile:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '1px' }}>{customer.alternateMobileNumber}</div>
              </div>
            )}
            {customer.email && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '1px' }}>✉️ {customer.email}</div>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Registered Partner:</span>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>
                {customer.createdByPartnerId?.fullName || 'Direct HQ'}
                {customer.createdByPartnerId?.franchiseId && ` (${customer.createdByPartnerId.franchiseId})`}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Address */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <MapPin size={18} color="#0284c7" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Installation Address</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Full Address:</span>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>
                {customer.address?.houseOrShopNumber && `${customer.address.houseOrShopNumber}, `}
                {customer.address?.street && `${customer.address.street}, `}
                {customer.address?.locality && `${customer.address.locality}, `}
                {customer.address?.city}, {customer.address?.district}, {customer.address?.state} - {customer.address?.pinCode}
              </div>
            </div>
            {customer.address?.landmark && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Landmark:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{customer.address.landmark}</div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Electricity Details */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Zap size={18} color="#0284c7" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Electricity Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Connected Load:</span>
              <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '14px' }}>⚡ {customer.electricityDetails?.connectedLoadKw || 0} kW</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Phase:</span>
              <div style={{ fontWeight: 600 }}>{customer.electricityDetails?.phase === 'THREE_PHASE' ? 'Three Phase' : 'Single Phase'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Monthly Bill:</span>
              <div style={{ fontWeight: 600 }}>₹{customer.electricityDetails?.monthlyElectricityBill?.toLocaleString() || 0}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Highest 12M Bill:</span>
              <div style={{ fontWeight: 600 }}>₹{customer.electricityDetails?.highestElectricityBill12Months?.toLocaleString() || 0}</div>
            </div>
            {customer.electricityDetails?.consumerAccountNumber && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Consumer No:</span>
                <div style={{ fontWeight: 600 }}>{customer.electricityDetails.consumerAccountNumber}</div>
              </div>
            )}
            {customer.electricityDetails?.meterNumber && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Meter No:</span>
                <div style={{ fontWeight: 600 }}>{customer.electricityDetails.meterNumber}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Installations History Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} color="#15803d" />
            Installation History ({installations.length})
          </h2>
        </div>

        {installations.length === 0 ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No installation records logged for this customer yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {installations.map((ins, index) => (
              <div key={ins._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '12.5px', fontWeight: 700 }}>
                      {ins.installationId}
                    </span>
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Installation #{installations.length - index} • {new Date(ins.installationDateTime).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {ins.latitude && (
                      <span
                        style={{
                          background: ins.territoryMatch !== false ? '#dcfce7' : '#fee2e2',
                          color: ins.territoryMatch !== false ? '#15803d' : '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <MapPin size={12} />
                        {ins.territoryMatch !== false
                          ? `GPS Verified (${ins.detectedDistrict || 'In Territory'})`
                          : `Territory Mismatch (${ins.detectedDistrict || 'Flagged'})`}
                      </span>
                    )}
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Confirmed via {ins.customerConfirmationMethod}
                    </span>
                  </div>
                </div>

                {/* Installed Cards Pills */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>Installed Card Serial Numbers ({ins.cardSerialNumbers?.length || 0}):</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ins.cardSerialNumbers?.map((serial) => (
                      <span
                        key={serial}
                        style={{
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CreditCard size={13} /> {serial}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Commercials Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Connected Load:</span>
                    <div style={{ fontWeight: 700, color: '#0284c7' }}>{ins.connectedLoadKw} kW</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Installed Quantity:</span>
                    <div style={{ fontWeight: 700 }}>{ins.installedCardCount} Cards</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Price Per Card:</span>
                    <div style={{ fontWeight: 600 }}>₹{ins.pricePerCard?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total Amount Charged:</span>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '15px' }}>₹{ins.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>

                {/* Photos Row */}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Installation Proof Documents & Photos:
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {ins.mcbPhoto && (
                      <div
                        onClick={() => setModalPhoto({ url: ins.mcbPhoto, title: 'MCB / ELCB Distribution Panel Photo' })}
                        style={{ cursor: 'pointer', textAlign: 'center' }}
                      >
                        <img src={ins.mcbPhoto} alt="MCB" style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>MCB Panel</div>
                      </div>
                    )}
                    {ins.billPhoto && (
                      <div
                        onClick={() => setModalPhoto({ url: ins.billPhoto, title: 'Highest Electricity Bill Photo' })}
                        style={{ cursor: 'pointer', textAlign: 'center' }}
                      >
                        <img src={ins.billPhoto} alt="Bill" style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Electricity Bill</div>
                      </div>
                    )}
                    {ins.installedCardPhoto && (
                      <div
                        onClick={() => setModalPhoto({ url: ins.installedCardPhoto, title: 'Installed Vidhyut Saathi Cards Photo' })}
                        style={{ cursor: 'pointer', textAlign: 'center' }}
                      >
                        <img src={ins.installedCardPhoto} alt="Installed Card" style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Installed Card</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {modalPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', padding: '20px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{modalPhoto.title}</h3>
              <button
                onClick={() => setModalPhoto(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <img src={modalPhoto.url} alt="Proof Document" style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
