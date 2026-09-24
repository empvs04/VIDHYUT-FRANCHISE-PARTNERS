import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  Calendar,
  Zap,
  Award,
} from 'lucide-react';

const CardAllotmentCelebrationModal = ({
  isOpen,
  onClose,
  allotmentData,
  partner,
}) => {
  const navigate = useNavigate();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimateIn(true), 50);
      // Immediately mark this allotment ID as acknowledged so it never pops up again across page reloads
      if (allotmentData) {
        try {
          if (allotmentData.allotmentId) {
            localStorage.setItem(`vs_allotment_ack_${allotmentData.allotmentId}`, 'true');
          }
          if (allotmentData.transactionDbId) {
            localStorage.setItem(`vs_allotment_ack_${allotmentData.transactionDbId}`, 'true');
          }
        } catch {
          // localStorage disabled or private mode fallback
        }
      }
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen, allotmentData]);

  if (!isOpen || !allotmentData) return null;

  const {
    allotmentId,
    transactionDbId,
    cardCount = 0,
    firstSerial = '',
    lastSerial = '',
    assignedAt,
    assignedBy = 'Central HQ Admin',
    notes = '',
  } = allotmentData;

  const handleAcknowledgeAndClose = () => {
    try {
      if (allotmentId) {
        localStorage.setItem(`vs_allotment_ack_${allotmentId}`, 'true');
      }
      if (transactionDbId) {
        localStorage.setItem(`vs_allotment_ack_${transactionDbId}`, 'true');
      }
    } catch (e) {
      console.error('Failed to save acknowledgement:', e);
    }
    onClose();
  };

  const handleGoToInventory = () => {
    handleAcknowledgeAndClose();
    navigate('/cards');
  };

  const handleGoToDistribute = () => {
    handleAcknowledgeAndClose();
    if (partner?.franchiseType === 'SUB_FRANCHISE') {
      navigate('/customers/new');
    } else {
      navigate('/cards/distribute');
    }
  };

  const formattedDate = assignedAt
    ? new Date(assignedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  // Confetti particles data
  const particles = [
    { id: 1, left: '8%', delay: '0s', duration: '2.5s', color: '#F59E0B', size: '9px', shape: 'rect' },
    { id: 2, left: '18%', delay: '0.4s', duration: '3.1s', color: '#10B981', size: '7px', shape: 'circle' },
    { id: 3, left: '30%', delay: '0.2s', duration: '2.8s', color: '#38BDF8', size: '10px', shape: 'rect' },
    { id: 4, left: '44%', delay: '0.7s', duration: '3.4s', color: '#EC4899', size: '8px', shape: 'circle' },
    { id: 5, left: '56%', delay: '0.1s', duration: '2.6s', color: '#FBBF24', size: '10px', shape: 'rect' },
    { id: 6, left: '70%', delay: '0.5s', duration: '3.2s', color: '#6366F1', size: '7px', shape: 'circle' },
    { id: 7, left: '82%', delay: '0.3s', duration: '2.9s', color: '#10B981', size: '9px', shape: 'rect' },
    { id: 8, left: '92%', delay: '0.6s', duration: '3.5s', color: '#F43F5E', size: '10px', shape: 'circle' },
  ];

  return (
    <div
      className="card-allotment-celebration-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.86)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '12px 10px',
        opacity: animateIn ? 1 : 0,
        transition: 'opacity 0.25s ease-out',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={handleAcknowledgeAndClose}
    >
      <style>{`
        .card-allotment-celebration-modal {
          width: 100%;
          max-width: 500px;
          max-height: 90dvh;
          max-height: 90vh;
          overflow-y: auto;
          background: linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
          border-radius: 18px;
          border: 1.5px solid rgba(245, 158, 11, 0.4);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(245, 158, 11, 0.22);
          color: #F8FAFC;
          position: relative;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .celebration-modal-inner {
          padding: 24px 20px 18px;
        }

        .celebration-header-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 16px;
        }

        .celebration-manifest-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .celebration-serial-card {
          grid-column: 1 / -1;
        }

        .celebration-action-buttons-wrap {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .celebration-actions-row {
          display: flex;
          gap: 10px;
          flex-direction: column;
        }

        @media (min-width: 480px) {
          .celebration-actions-row {
            flex-direction: row;
          }
        }

        @media (max-width: 480px) {
          .celebration-modal-inner {
            padding: 20px 14px 14px;
          }
          .celebration-manifest-grid {
            gap: 8px;
          }
        }
      `}</style>

      {/* Falling Confetti Particles Animation */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: '-20px',
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              opacity: 0.85,
              transform: 'rotate(45deg)',
              animation: `celebrationFall ${p.duration} ease-in infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Main Celebratory Modal Dialog */}
      <div
        className="card-allotment-celebration-modal"
        style={{
          zIndex: 2,
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Strip */}
        <div
          style={{
            height: '5px',
            background: 'linear-gradient(90deg, #F59E0B, #10B981, #38BDF8, #F59E0B)',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s linear infinite',
          }}
        />

        {/* Close Button with Mobile-Friendly Touch Target */}
        <button
          onClick={handleAcknowledgeAndClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#CBD5E1';
          }}
        >
          <X size={18} />
        </button>

        <div className="celebration-modal-inner">
          {/* Festive Trophy & Sparkle Header */}
          <div className="celebration-header-stack">
            {/* Glowing Icon Container (Centered at top) */}
            <div style={{ position: 'relative', margin: '0 auto 10px auto' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-6px',
                  background: 'radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(245, 158, 11, 0) 70%)',
                  borderRadius: '50%',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                }}
              >
                <Award size={28} color="#FFFFFF" />
              </div>
            </div>

            {/* Top Pill Badge (Centered below icon) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: '800',
                letterSpacing: '0.6px',
                color: '#FBBF24',
                textTransform: 'uppercase',
                marginBottom: '10px',
                boxShadow: '0 0 14px rgba(245, 158, 11, 0.2)',
              }}
            >
              <Sparkles size={12} color="#FBBF24" />
              <span>STOCK ALLOTMENT CELEBRATION</span>
              <Zap size={12} color="#FBBF24" />
            </div>

            {/* Title & Subtitle */}
            <h2
              style={{
                fontSize: 'clamp(18px, 5vw, 22px)',
                fontWeight: '800',
                color: '#FFFFFF',
                marginBottom: '6px',
                letterSpacing: '-0.3px',
                lineHeight: 1.25,
                padding: '0 8px',
              }}
            >
              🎉 Congratulations, {partner?.fullName || 'Partner'}!
            </h2>
            <p
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                lineHeight: '1.4',
                maxWidth: '420px',
                margin: '0 auto',
              }}
            >
              Central Headquarters has allotted new smart energy card stock to your franchise inventory!
            </p>
          </div>

          {/* Lucrative Big Cards Counter Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 95, 70, 0.25) 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
              padding: '12px 14px',
              textAlign: 'center',
              marginBottom: '14px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.8px',
                color: '#34D399',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              TOTAL NEW STOCK ALLOTTED
            </div>
            <div
              style={{
                fontSize: 'clamp(24px, 6.5vw, 30px)',
                fontWeight: '900',
                letterSpacing: '-0.5px',
                color: '#FFFFFF',
                textShadow: '0 0 20px rgba(52, 211, 153, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                lineHeight: 1.2,
              }}
            >
              <CreditCard size={24} color="#34D399" />
              <span>+{cardCount} Smart Cards</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#A7F3D0', fontWeight: '600', marginTop: '3px' }}>
              Active &amp; ready for immediate territory distribution
            </div>
          </div>

          {/* Consignment Voucher Info Card (Clean Full Width Range + 2-Col Specs) */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: '800',
                letterSpacing: '0.6px',
                color: '#94A3B8',
                textTransform: 'uppercase',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} color="#38BDF8" />
              <span>ALLOTMENT DETAILS &amp; SERIAL MANIFEST</span>
            </div>

            <div className="celebration-manifest-grid">
              {/* Serial Range (Full Width so numbers never break awkwardly) */}
              <div
                className="celebration-serial-card"
                style={{
                  background: 'rgba(30, 41, 59, 0.85)',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#94A3B8', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Serial Range Manifest
                </div>
                <div
                  style={{
                    fontWeight: '700',
                    color: '#38BDF8',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 'clamp(11.5px, 3.4vw, 13px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    lineHeight: 1.3,
                  }}
                >
                  {firstSerial && lastSerial ? (
                    <>
                      <span>{firstSerial}</span>
                      <span style={{ color: '#F59E0B', fontWeight: '900' }}>➔</span>
                      <span>{lastSerial}</span>
                    </>
                  ) : (
                    <span>{cardCount} Cards</span>
                  )}
                </div>
              </div>

              {/* Franchise Territory */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px' }}>
                  Territory
                </div>
                <div
                  style={{
                    fontWeight: '700',
                    color: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <MapPin size={12} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {partner?.district || partner?.state || 'Territory'}
                  </span>
                </div>
              </div>

              {/* Allotted By */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px' }}>
                  Consigned By
                </div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#F8FAFC',
                    fontSize: '11.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {assignedBy}
                </div>
              </div>

              {/* Allotment Date */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px' }}>
                  Allocation Date
                </div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                  }}
                >
                  <Calendar size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {notes && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontStyle: 'italic',
                }}
              >
                <strong>Note:</strong> {notes}
              </div>
            )}
          </div>

          {/* Action Buttons (Full-Width Responsive on Mobile) */}
          <div className="celebration-action-buttons-wrap">
            <div className="celebration-actions-row">
              <button
                className="celebration-action-primary-btn"
                onClick={handleGoToDistribute}
                style={{
                  flex: '1 1 170px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Zap size={15} />
                <span>
                  {partner?.franchiseType === 'SUB_FRANCHISE'
                    ? 'Start Installation'
                    : 'Start Distributing'}
                </span>
                <ArrowRight size={14} />
              </button>

              <button
                className="celebration-action-secondary-btn"
                onClick={handleGoToInventory}
                style={{
                  flex: '1 1 130px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Package size={15} color="#38BDF8" />
                <span>View Card Stock</span>
              </button>
            </div>

            <button
              onClick={handleAcknowledgeAndClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '11.5px',
                fontWeight: '500',
                padding: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              Acknowledge &amp; Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardAllotmentCelebrationModal;
