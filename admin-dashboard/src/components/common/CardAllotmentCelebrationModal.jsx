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
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  if (!isOpen || !allotmentData) return null;

  const {
    allotmentId,
    cardCount = 0,
    firstSerial = '',
    lastSerial = '',
    assignedAt,
    assignedBy = 'Central HQ Admin',
    notes = '',
  } = allotmentData;

  const handleAcknowledgeAndClose = () => {
    if (allotmentId) {
      try {
        localStorage.setItem(`vs_allotment_ack_${allotmentId}`, 'true');
      } catch (e) {
        console.error('Failed to save acknowledgement:', e);
      }
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
    { id: 1, left: '8%', delay: '0s', duration: '2.5s', color: '#F59E0B', size: '10px', shape: 'rect' },
    { id: 2, left: '16%', delay: '0.4s', duration: '3.1s', color: '#10B981', size: '8px', shape: 'circle' },
    { id: 3, left: '25%', delay: '0.2s', duration: '2.8s', color: '#38BDF8', size: '12px', shape: 'rect' },
    { id: 4, left: '38%', delay: '0.7s', duration: '3.4s', color: '#EC4899', size: '9px', shape: 'circle' },
    { id: 5, left: '50%', delay: '0.1s', duration: '2.6s', color: '#FBBF24', size: '11px', shape: 'rect' },
    { id: 6, left: '62%', delay: '0.5s', duration: '3.2s', color: '#6366F1', size: '8px', shape: 'circle' },
    { id: 7, left: '75%', delay: '0.3s', duration: '2.9s', color: '#10B981', size: '10px', shape: 'rect' },
    { id: 8, left: '85%', delay: '0.6s', duration: '3.5s', color: '#F43F5E', size: '12px', shape: 'circle' },
    { id: 9, left: '92%', delay: '0.2s', duration: '2.7s', color: '#38BDF8', size: '9px', shape: 'rect' },
    { id: 10, left: '4%', delay: '0.8s', duration: '3.3s', color: '#8B5CF6', size: '11px', shape: 'circle' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        opacity: animateIn ? 1 : 0,
        transition: 'opacity 0.25s ease-out',
        overflowY: 'auto',
      }}
      onClick={handleAcknowledgeAndClose}
    >
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
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          borderRadius: '20px',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 45px rgba(245, 158, 11, 0.25)',
          color: '#F8FAFC',
          overflow: 'hidden',
          zIndex: 2,
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Strip */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #F59E0B, #10B981, #38BDF8, #F59E0B)',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s linear infinite',
          }}
        />

        {/* Close Button */}
        <button
          onClick={handleAcknowledgeAndClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <X size={18} />
        </button>

        <div style={{ padding: '28px 24px 24px' }}>
          {/* Festive Trophy & Sparkle Header */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            {/* Top Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '1px',
                color: '#FBBF24',
                textTransform: 'uppercase',
                marginBottom: '14px',
                boxShadow: '0 0 16px rgba(245, 158, 11, 0.2)',
              }}
            >
              <Sparkles size={13} color="#FBBF24" />
              <span>STOCK ALLOTMENT CELEBRATION</span>
              <Zap size={13} color="#FBBF24" />
            </div>

            {/* Glowing Icon Container */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-10px',
                  background: 'radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(245, 158, 11, 0) 70%)',
                  borderRadius: '50%',
                  animation: 'pulseGlow 2s infinite',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '68px',
                  height: '68px',
                  margin: '0 auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                }}
              >
                <Award size={36} color="#FFFFFF" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#FFFFFF',
                marginBottom: '4px',
                letterSpacing: '-0.3px',
              }}
            >
              🎉 Congratulations, {partner?.fullName || 'Partner'}!
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: '#CBD5E1',
                lineHeight: '1.45',
                maxWidth: '440px',
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
              borderRadius: '16px',
              padding: '16px 20px',
              textAlign: 'center',
              marginBottom: '18px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
                color: '#34D399',
                textTransform: 'uppercase',
                marginBottom: '2px',
              }}
            >
              TOTAL NEW STOCK ALLOTTED
            </div>
            <div
              style={{
                fontSize: '34px',
                fontWeight: '900',
                letterSpacing: '-1px',
                color: '#FFFFFF',
                textShadow: '0 0 25px rgba(52, 211, 153, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CreditCard size={30} color="#34D399" />
              <span>+{cardCount} Smart Cards</span>
            </div>
            <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: '500' }}>
              Active and ready for immediate territory distribution
            </div>
          </div>

          {/* Consignment Voucher Info Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.8px',
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                fontSize: '12.5px',
              }}
            >
              {/* Serial Range */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginBottom: '2px' }}>
                  Allocated Serial Range
                </div>
                <div style={{ fontWeight: '700', color: '#38BDF8', fontFamily: 'monospace', fontSize: '13px' }}>
                  {firstSerial && lastSerial ? `${firstSerial} ➔ ${lastSerial}` : `${cardCount} Cards`}
                </div>
              </div>

              {/* Franchise Territory */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginBottom: '2px' }}>
                  Franchise Territory
                </div>
                <div style={{ fontWeight: '700', color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#F59E0B" />
                  <span>
                    {partner?.district || 'District'}, {partner?.state || 'State'}
                  </span>
                </div>
              </div>

              {/* Allotted By */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginBottom: '2px' }}>
                  Consigned By
                </div>
                <div style={{ fontWeight: '600', color: '#F8FAFC' }}>
                  {assignedBy}
                </div>
              </div>

              {/* Allotment Date */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginBottom: '2px' }}>
                  Allocation Date
                </div>
                <div style={{ fontWeight: '600', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="#94A3B8" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>

            {notes && (
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '11.5px',
                  color: '#94A3B8',
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontStyle: 'italic',
                }}
              >
                <strong>Note:</strong> {notes}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleGoToDistribute}
                style={{
                  flex: '1 1 180px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.35)';
                }}
              >
                <Zap size={16} />
                <span>
                  {partner?.franchiseType === 'SUB_FRANCHISE'
                    ? 'Start Customer Installation'
                    : 'Start Distributing Stock'}
                </span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={handleGoToInventory}
                style={{
                  flex: '1 1 140px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <Package size={16} color="#38BDF8" />
                <span>View Card Stock</span>
              </button>
            </div>

            <button
              onClick={handleAcknowledgeAndClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '12px',
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
