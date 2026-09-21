import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Zap,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';

const playBeepSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime); // Crisp High Beep
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // AudioContext blocked or unsupported
  }
};

const BarcodeCardScanner = ({
  scannedCards = [],
  onAddCard,
  onRemoveCard,
  onClearAll,
  availableCards = [],
  warehouseAvailable = 0,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [lastScannedSerial, setLastScannedSerial] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const scannerRef = useRef(null);
  const scannerId = 'barcode-card-viewfinder-region';
  const lastScannedTimeRef = useRef(0);

  // Set of available serial numbers in inventory for instant lookup
  const availableSerialsSet = useRef(new Set());

  useEffect(() => {
    if (Array.isArray(availableCards) && availableCards.length > 0) {
      availableSerialsSet.current = new Set(
        availableCards.map((c) => (typeof c === 'string' ? c.toUpperCase() : c.serialNumber?.toUpperCase()))
      );
    } else {
      availableSerialsSet.current = new Set();
    }
  }, [availableCards]);

  // Handle a detected barcode result
  const handleScanSuccess = useCallback(
    (decodedText) => {
      const now = Date.now();
      // Throttle scanning to avoid multi-trigger on same frame (500ms debounce)
      if (now - lastScannedTimeRef.current < 500) {
        return;
      }

      if (!decodedText || typeof decodedText !== 'string') return;
      
      // Clean scanned text (extract serial format if QR contains URL or text)
      let serial = decodedText.trim();
      const match = serial.match(/(VS\d{4,8}|[A-Z0-9]{5,15})/i);
      if (match) {
        serial = match[0].toUpperCase();
      } else {
        serial = serial.toUpperCase();
      }

      lastScannedTimeRef.current = now;

      // Check if already in scanned list
      if (scannedCards.includes(serial)) {
        setDuplicateWarning(`Card ${serial} is already in the scanned list!`);
        setTimeout(() => setDuplicateWarning(''), 3000);
        return;
      }

      if (soundEnabled) {
        playBeepSound();
      }

      setDuplicateWarning('');
      setLastScannedSerial(serial);
      onAddCard(serial);
    },
    [scannedCards, soundEnabled, onAddCard]
  );

  // Start Camera Scanning
  const startScanner = async () => {
    setCameraError('');
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      // Get list of cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          setAvailableCameras(devices);
        }
      } catch {
        // ignore device listing error
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: facingMode };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.777778,
        },
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // On frame error: ignore frame parse failures
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera Scanner Error:', err);
      setIsScanning(false);
      setCameraError(
        err?.name === 'NotAllowedError' || err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings to scan barcodes.'
          : 'Unable to access camera. Please check camera connection or enter serial numbers manually below.'
      );
    }
  };

  // Stop Camera Scanning
  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  // Auto-start scanner when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
  }, [facingMode, selectedCameraId]);

  // Flip Camera Front / Back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Manual fallback add
  const handleManualAdd = (e) => {
    e?.preventDefault();
    if (!manualInput.trim()) return;
    const serial = manualInput.trim().toUpperCase();

    if (scannedCards.includes(serial)) {
      setDuplicateWarning(`Card ${serial} is already in the list!`);
      setTimeout(() => setDuplicateWarning(''), 3000);
      return;
    }

    if (soundEnabled) {
      playBeepSound();
    }

    setDuplicateWarning('');
    setLastScannedSerial(serial);
    onAddCard(serial);
    setManualInput('');
  };

  return (
    <div className="barcode-card-scanner-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0F172A',
          color: 'white',
          padding: '10px 14px',
          borderRadius: '10px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isScanning ? '#22C55E' : '#EF4444',
              boxShadow: isScanning ? '0 0 8px #22C55E' : 'none',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.3px' }}>
            {isScanning ? 'LIVE CAMERA BARCODE SCANNER ACTIVE' : 'SCANNER PAUSED'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Beep Audio Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              padding: '5px 8px',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
          >
            {soundEnabled ? <Volume2 size={14} color="#38BDF8" /> : <VolumeX size={14} color="#F87171" />}
            <span style={{ fontSize: '11px' }}>{soundEnabled ? 'Beep On' : 'Muted'}</span>
          </button>

          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              padding: '5px 8px',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Switch Front/Back Camera"
          >
            <FlipHorizontal size={14} />
            <span style={{ fontSize: '11px' }}>Flip Camera</span>
          </button>

          {/* Start / Pause Scanner Button */}
          {isScanning ? (
            <button
              type="button"
              onClick={stopScanner}
              style={{
                background: '#DC2626',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CameraOff size={14} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              style={{
                background: '#0284C7',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Camera size={14} />
              <span>Resume</span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewfinder Box */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#000000',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        <div
          id={scannerId}
          style={{
            width: '100%',
            maxWidth: '480px',
            height: '100%',
            overflow: 'hidden',
          }}
        />

        {/* Scan Target Overlay Reticle */}
        {isScanning && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '260px',
              height: '140px',
              border: '2px dashed #38BDF8',
              borderRadius: '10px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px',
              boxSizing: 'border-box',
              zIndex: 10,
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '12px', height: '12px', borderTop: '3px solid #38BDF8', borderLeft: '3px solid #38BDF8' }} />
              <div style={{ width: '12px', height: '12px', borderTop: '3px solid #38BDF8', borderRight: '3px solid #38BDF8' }} />
            </div>

            <div style={{ fontSize: '11px', color: '#E0F2FE', fontWeight: '700', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center' }}>
              Align Card Barcode Inside Reticle
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '12px', height: '12px', borderBottom: '3px solid #38BDF8', borderLeft: '3px solid #38BDF8' }} />
              <div style={{ width: '12px', height: '12px', borderBottom: '3px solid #38BDF8', borderRight: '3px solid #38BDF8' }} />
            </div>
          </div>
        )}

        {/* Camera Permission / Error message */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: '0',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              color: 'white',
              zIndex: 20,
            }}
          >
            <AlertCircle size={32} color="#F87171" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#FCA5A5', marginBottom: '4px' }}>
              Camera Scan Unavailable
            </div>
            <p style={{ fontSize: '12.5px', color: '#CBD5E1', maxWidth: '380px', marginBottom: '16px' }}>
              {cameraError}
            </p>
            <button
              type="button"
              onClick={startScanner}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Retry Camera Permission</span>
            </button>
          </div>
        )}
      </div>

      {/* Duplicate / Notification Warnings */}
      {duplicateWarning && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <AlertCircle size={16} color="#D97706" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      {/* Quick Manual Entry Input Fallback */}
      <form
        onSubmit={handleManualAdd}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#F8FAFC',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <input
          type="text"
          className="input"
          style={{
            height: '38px',
            fontSize: '13px',
            padding: '0 12px',
            flex: 1,
            backgroundColor: '#FFFFFF',
          }}
          placeholder="Manual serial entry (e.g. VS0000412)..."
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-outline"
          disabled={!manualInput.trim()}
          style={{
            height: '38px',
            padding: '0 14px',
            fontSize: '12.5px',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Plus size={14} />
          <span>Add Card</span>
        </button>
      </form>

      {/* ============================================================ */}
      {/* SCANNED CARDS QUEUE MANAGEMENT                               */}
      {/* ============================================================ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
            paddingBottom: '10px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={17} color="#0284C7" />
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Scanned Cards Queue
            </span>
            <span
              style={{
                backgroundColor: scannedCards.length > 0 ? '#E0F2FE' : '#F1F5F9',
                color: scannedCards.length > 0 ? '#0284C7' : '#64748B',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {scannedCards.length} {scannedCards.length === 1 ? 'Card' : 'Cards'} Scanned
            </span>
          </div>

          {scannedCards.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Remove all scanned cards"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Cards Chip List */}
        {scannedCards.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px dashed #E2E8F0',
            }}
          >
            <Camera size={24} color="#94A3B8" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              No cards scanned yet
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Hold card box barcode in front of camera to continuously scan and add up to 50+ cards
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px 2px',
            }}
          >
            {scannedCards.map((serial, idx) => {
              const isAvailable =
                availableSerialsSet.current.size === 0 || availableSerialsSet.current.has(serial.toUpperCase());

              return (
                <div
                  key={serial}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: isAvailable ? '#F0F9FF' : '#FEF2F2',
                    border: `1px solid ${isAvailable ? '#BAE6FD' : '#FECACA'}`,
                    color: isAvailable ? '#0369A1' : '#B91C1C',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: '600' }}>#{idx + 1}</span>
                  <span>{serial}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveCard(serial)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: isAvailable ? '#64748B' : '#EF4444',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                    }}
                    title={`Remove card ${serial}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeCardScanner;
