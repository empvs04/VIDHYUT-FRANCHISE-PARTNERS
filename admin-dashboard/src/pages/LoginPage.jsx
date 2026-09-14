import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('ADMIN'); // 'ADMIN' or 'PARTNER'

  // Super Admin state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Franchise Partner OTP state
  const [partnerIdentifier, setPartnerIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMeta, setOtpMeta] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  const { loginAdmin, requestPartnerOTP, verifyPartnerOTP, resendPartnerOTP } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Handle Resend Countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle Admin Password Login
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      showToast('Please enter both admin email and password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await loginAdmin(adminEmail, adminPassword);
      showToast('Welcome back, Super Admin!', 'success');
      navigate('/');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Invalid admin credentials. Please verify.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Franchise Partner Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!partnerIdentifier.trim()) {
      showToast('Please enter your Mobile Number, Email, or Franchise ID.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const data = await requestPartnerOTP(partnerIdentifier.trim());
      setOtpMeta(data);
      setOtpSent(true);
      setResendTimer(data?.cooldownSeconds || 60);

      // Auto-fill in dev mode if devCode is returned
      if (data?.devCode) {
        setOtpCode(data.devCode);
      }

      showToast(`Verification code sent to registered mobile!`, 'success');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Partner login failed. Please verify your credentials.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Franchise Partner Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      showToast('Please enter the 6-digit OTP sent to your phone.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await verifyPartnerOTP(partnerIdentifier.trim(), otpCode.trim());
      showToast(`Welcome, ${res.partner?.fullName || res.user?.fullName}!`, 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid or expired OTP code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Partner OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      setIsLoading(true);
      const data = await resendPartnerOTP(partnerIdentifier.trim());
      setOtpMeta(data);
      setResendTimer(data?.cooldownSeconds || 60);
      if (data?.devCode) {
        setOtpCode(data.devCode);
      }
      showToast('A new OTP has been dispatched.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not resend OTP.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            padding: '32px 24px 20px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: '#0284C7',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Zap size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Vidhyut Saathi
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Energy Savers Pvt. Ltd. — Franchise Portal
          </p>
        </div>

        {/* Tab Switcher: Super Admin vs Franchise Partner */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#F8FAFC',
            padding: '4px 6px',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('ADMIN');
              setOtpSent(false);
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'ADMIN' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'ADMIN' ? '#0284C7' : '#64748B',
              fontWeight: activeTab === 'ADMIN' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'ADMIN' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Lock size={15} />
            <span>Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PARTNER')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'PARTNER' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'PARTNER' ? '#0284C7' : '#64748B',
              fontWeight: activeTab === 'PARTNER' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'PARTNER' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Building2 size={15} />
            <span>Franchise Partner</span>
          </button>
        </div>

        {/* Tab 1: Super Admin Form */}
        {activeTab === 'ADMIN' && (
          <form onSubmit={handleAdminSubmit} style={{ padding: '28px 24px' }}>
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Admin Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="email"
                  className="input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="admin@vidhyutsaathi.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="password"
                  className="input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In as Super Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div
              style={{
                marginTop: '20px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <ShieldCheck size={16} color="#0284c7" />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Restricted Area. Authorized Super Admin access only.
              </span>
            </div>
          </form>
        )}

        {/* Tab 2: Franchise Partner OTP Form */}
        {activeTab === 'PARTNER' && (
          <div style={{ padding: '28px 24px' }}>
            {!otpSent ? (
              // Step 1: Input Identifier
              <form onSubmit={handleRequestOTP}>
                <div style={{ marginBottom: '18px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Mobile No. / Email / Franchise ID
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Smartphone
                      size={17}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: '38px' }}
                      placeholder="e.g. 9820123456 or VS-MH-MUM-1001"
                      value={partnerIdentifier}
                      onChange={(e) => setPartnerIdentifier(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    Enter registered mobile number, email, or Franchise ID to receive secure login OTP.
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Dispatching OTP...</span>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Step 2: Verify OTP
              <form onSubmit={handleVerifyOTP}>
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CheckCircle2 size={16} color="#0284c7" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A' }}>
                      {otpMeta?.partnerName || 'Franchise Partner'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                    OTP sent to: <strong>{otpMeta?.maskedMobile}</strong> ({otpMeta?.franchiseId})
                  </div>

                  {otpMeta?.devCode && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        backgroundColor: '#FEF3C7',
                        border: '1px dashed #F59E0B',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        🧪 <strong>Testing OTP:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '800', letterSpacing: '2px', color: '#B45309' }}>
                          {otpMeta.devCode}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(otpMeta.devCode)}
                        style={{
                          background: '#F59E0B',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Enter 6-Digit OTP Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={17}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      type="text"
                      className="input"
                      style={{
                        paddingLeft: '38px',
                        letterSpacing: '4px',
                        fontSize: '16px',
                        fontWeight: '700',
                      }}
                      placeholder="••••••"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center', marginBottom: '12px' }}
                  disabled={isLoading}
                >
                  {isLoading ? <span>Verifying OTP...</span> : <span>Verify & Sign In</span>}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Change ID/Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendTimer > 0 ? '#94A3B8' : '#0284C7',
                      fontWeight: '600',
                      cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
