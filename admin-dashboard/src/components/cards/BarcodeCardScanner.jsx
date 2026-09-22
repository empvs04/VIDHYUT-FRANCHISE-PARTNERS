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
  Check,
  AlertTriangle,
  ScanLine,
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
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // AudioContext blocked or unsupported
  }
};

const playWarningSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // AudioContext blocked
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Single-Scan with Retry Control States
  const [isPausedAfterScan, setIsPausedAfterScan] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { serial, status: 'SUCCESS' | 'DUPLICATE' | 'NOT_IN_STOCK', message: '' }

  const scannerRef = useRef(null);
  const scannerId = 'barcode-card-viewfinder-region';
  const isScanLockedRef = useRef(false);

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

  // Handle a detected barcode result (Single-Scan Mode)
  const handleScanSuccess = useCallback(
    (decodedText) => {
      // Synchronous Lock: Ignore any additional frames immediately after detection
      if (isScanLockedRef.current) {
        return;
      }
      isScanLockedRef.current = true;

      if (!decodedText || typeof decodedText !== 'string') {
        isScanLockedRef.current = false;
        return;
      }

      // Clean scanned text (extract serial format if QR contains URL or text)
      let serial = decodedText.trim();
      const match = serial.match(/(VS\d{4,8}|[A-Z0-9]{5,15})/i);
      if (match) {
        serial = match[0].toUpperCase();
      } else {
        serial = serial.toUpperCase();
      }

      // 1. Pause Hardware Scanner Feed immediately to stop continuous scanning
      try {
        if (scannerRef.current && typeof scannerRef.current.pause === 'function') {
          scannerRef.current.pause(true);
        }
      } catch (err) {
        console.warn('Scanner pause non-fatal error:', err);
      }

      // 2. Validate Card Serial
      const isDuplicate = scannedCards.some((s) => s.toUpperCase() === serial);
      const isStockRestricted = availableSerialsSet.current.size > 0;
      const isNotInStock = isStockRestricted && !availableSerialsSet.current.has(serial);

      if (isDuplicate) {
        if (soundEnabled) playWarningSound();
        setScanResult({
          serial,
          status: 'DUPLICATE',
          message: `Card ${serial} is already in your scanned list!`,
        });
        setIsPausedAfterScan(true);
        return;
      }

      if (isNotInStock) {
        if (soundEnabled) playWarningSound();
        setScanResult({
          serial,
          status: 'NOT_IN_STOCK',
          message: `Card ${serial} is NOT found in your available stock inventory!`,
        });
        setIsPausedAfterScan(true);
        return;
      }

      // 3. Success: Play sound and add card
      if (soundEnabled) {
        playBeepSound();
      }

      const addResult = onAddCard(serial);
      if (addResult === false) {
        setScanResult({
          serial,
          status: 'NOT_IN_STOCK',
          message: `Card ${serial} could not be added from stock.`,
        });
      } else {
        setScanResult({
          serial,
          status: 'SUCCESS',
          message: `Card ${serial} scanned and added successfully!`,
        });
      }

      setIsPausedAfterScan(true);
    },
    [scannedCards, soundEnabled, onAddCard]
  );

  // Resume / Retry for Next Scan
  const handleRetryOrNextScan = async () => {
    setScanResult(null);
    setIsPausedAfterScan(false);
    isScanLockedRef.current = false;

    try {
      if (scannerRef.current) {
        const state = typeof scannerRef.current.getState === 'function' ? scannerRef.current.getState() : null;
        // State 3 = PAUSED in html5-qrcode
        if (state === 3 && typeof scannerRef.current.resume === 'function') {
          scannerRef.current.resume();
          return;
        }
      }
      // If not paused or resumed, ensure scanner is active
      if (!isScanning) {
        await startScanner();
      }
    } catch (err) {
      console.warn('Error resuming scanner, restarting instance...', err);
      startScanner();
    }
  };

  // Start Camera Scanning with FULL SCREEN Viewfinder Scanning
  const startScanner = async () => {
    setCameraError('');
    setScanResult(null);
    setIsPausedAfterScan(false);
    isScanLockedRef.current = false;

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
          Html5QrcodeSupportedFormats.DATA_MATRIX,
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

      // Wide Full-Screen qrbox calculation: Scan across 95% width & 90% height of the full mobile screen
      const wideQrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        const width = Math.max(Math.floor(viewfinderWidth * 0.94), 260);
        const height = Math.max(Math.floor(viewfinderHeight * 0.90), 200);
        return { width, height };
      };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: wideQrboxFunction,
          // Omitting restrictive aspectRatio so it utilizes full container dimensions
        },
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // Frame error ignore
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
        setIsPausedAfterScan(false);
        setScanResult(null);
        isScanLockedRef.current = false;
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
      if (soundEnabled) playWarningSound();
      setScanResult({
        serial,
        status: 'DUPLICATE',
        message: `Card ${serial} is already in the list!`,
      });
      setIsPausedAfterScan(true);
      return;
    }

    if (availableSerialsSet.current.size > 0 && !availableSerialsSet.current.has(serial)) {
      if (soundEnabled) playWarningSound();
      setScanResult({
        serial,
        status: 'NOT_IN_STOCK',
        message: `Card ${serial} is not in your available stock!`,
      });
      setIsPausedAfterScan(true);
      return;
    }

    if (soundEnabled) {
      playBeepSound();
    }

    onAddCard(serial);
    setScanResult({
      serial,
      status: 'SUCCESS',
      message: `Card ${serial} manually added successfully!`,
    });
    setIsPausedAfterScan(true);
    setManualInput('');
  };

  return (
    <div className="barcode-card-scanner-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Dynamic Keyframes & Full Screen Scanner Styles */}
      <style>{`
        #barcode-card-viewfinder-region {
          width: 100% !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        #barcode-card-viewfinder-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 12px !important;
          display: block !important;
        }
        #barcode-card-viewfinder-region img {
          display: none !important;
        }
        @keyframes laserScanAnimation {
          0% { top: 6%; opacity: 0.85; }
          50% { top: 92%; opacity: 1; }
          100% { top: 6%; opacity: 0.85; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes resultPopIn {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

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
              backgroundColor: isPausedAfterScan ? '#F59E0B' : isScanning ? '#22C55E' : '#EF4444',
              boxShadow: isPausedAfterScan
                ? '0 0 8px #F59E0B'
                : isScanning
                ? '0 0 8px #22C55E'
                : 'none',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.3px' }}>
            {isPausedAfterScan
              ? 'CARD SCANNED • READY FOR NEXT'
              : isScanning
              ? 'FULL SCREEN CAMERA SCANNER ACTIVE'
              : 'SCANNER PAUSED'}
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

      {/* Camera Viewfinder Box (Expanded Full Screen Size) */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#000000',
          borderRadius: '14px',
          overflow: 'hidden',
          minHeight: '340px',
          maxHeight: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          border: '2px solid #1E293B',
        }}
      >
        <div
          id={scannerId}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '340px',
            overflow: 'hidden',
          }}
        />

        {/* ACTIVE SCANNING FULL SCREEN RETICLE OVERLAY */}
        {isScanning && !isPausedAfterScan && (
          <div
            style={{
              position: 'absolute',
              inset: '12px',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            {/* Top Viewfinder Frame Brackets */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderTop: '3.5px solid #38BDF8',
                  borderLeft: '3.5px solid #38BDF8',
                  borderTopLeftRadius: '8px',
                }}
              />
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderTop: '3.5px solid #38BDF8',
                  borderRight: '3.5px solid #38BDF8',
                  borderTopRightRadius: '8px',
                }}
              />
            </div>

            {/* Laser Line Scanning Effect */}
            <div
              style={{
                position: 'absolute',
                left: '12px',
                right: '12px',
                height: '3px',
                backgroundColor: '#38BDF8',
                boxShadow: '0 0 12px #38BDF8, 0 0 20px #0284C7',
                borderRadius: '2px',
                animation: 'laserScanAnimation 2.2s infinite ease-in-out',
              }}
            />

            {/* Subtitle Banner Badge */}
            <div
              style={{
                alignSelf: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(6px)',
                color: '#E0F2FE',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              ⚡ Full-Screen Active: Point camera at any card barcode
            </div>

            {/* Bottom Viewfinder Frame Brackets */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderBottom: '3.5px solid #38BDF8',
                  borderLeft: '3.5px solid #38BDF8',
                  borderBottomLeftRadius: '8px',
                }}
              />
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderBottom: '3.5px solid #38BDF8',
                  borderRight: '3.5px solid #38BDF8',
                  borderBottomRightRadius: '8px',
                }}
              />
            </div>
          </div>
        )}

        {/* SINGLE-SCAN RESULT OVERLAY (PAUSED AFTER SCAN - WITH RETRY / SCAN NEXT BUTTON) */}
        {isPausedAfterScan && scanResult && (
          <div
            style={{
              position: 'absolute',
              inset: '0',
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              textAlign: 'center',
              color: 'white',
              zIndex: 30,
              animation: 'resultPopIn 0.25s ease-out',
            }}
          >
            {/* Status Icon */}
            {scanResult.status === 'SUCCESS' ? (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  border: '2px solid #22C55E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.35)',
                }}
              >
                <CheckCircle2 size={36} color="#22C55E" />
              </div>
            ) : scanResult.status === 'DUPLICATE' ? (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  border: '2px solid #F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
                }}
              >
                <AlertTriangle size={34} color="#F59E0B" />
              </div>
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid #EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.35)',
                }}
              >
                <AlertCircle size={36} color="#EF4444" />
              </div>
            )}

            {/* Status Title */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color:
                  scanResult.status === 'SUCCESS'
                    ? '#86EFAC'
                    : scanResult.status === 'DUPLICATE'
                    ? '#FCD34D'
                    : '#FCA5A5',
                marginBottom: '6px',
              }}
            >
              {scanResult.status === 'SUCCESS'
                ? 'BARCODE SCANNED & ADDED'
                : scanResult.status === 'DUPLICATE'
                ? 'ALREADY SCANNED'
                : 'CARD NOT IN STOCK'}
            </div>

            {/* Serial Number Display */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '24px',
                fontWeight: '900',
                letterSpacing: '1.5px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '6px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              {scanResult.serial}
            </div>

            {/* Message info */}
            <p
              style={{
                fontSize: '13px',
                color: '#CBD5E1',
                maxWidth: '380px',
                marginBottom: '20px',
                lineHeight: 1.4,
              }}
            >
              {scanResult.message}
            </p>

            {/* Primary Action Button: "Scan Next Card / Retry" */}
            <button
              type="button"
              onClick={handleRetryOrNextScan}
              style={{
                backgroundColor: scanResult.status === 'SUCCESS' ? '#0284C7' : '#D97706',
                color: '#FFFFFF',
                padding: '12px 26px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow:
                  scanResult.status === 'SUCCESS'
                    ? '0 4px 16px rgba(2, 132, 199, 0.5)'
                    : '0 4px 16px rgba(217, 119, 6, 0.5)',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={17} />
              <span>
                {scanResult.status === 'SUCCESS'
                  ? 'Scan Next Card (अगला कार्ड स्कैन करें)'
                  : 'Retry Scan (दोबारा स्कैन करें)'}
              </span>
            </button>
          </div>
        )}

        {/* Camera Permission / Error message */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: '0',
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              color: 'white',
              zIndex: 40,
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
              Scan cards one by one using the full-screen camera scanner above.
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
