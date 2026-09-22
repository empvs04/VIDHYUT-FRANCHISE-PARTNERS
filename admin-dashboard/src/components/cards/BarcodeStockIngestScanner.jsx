import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Package,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  ScanLine,
  Box,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  FlipHorizontal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import api from '../../services/api';

const playBeepSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
};

const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.1); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.1); // D6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {}
};

const playWarningSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
};

// Helper: Parse potential Box Barcode Range (e.g. "VSB000101-VSB000200" or "BC100-BC200")
const parseBarcodeBoxRange = (text) => {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();

  // Pattern: PREFIX + NUMBER - PREFIX + NUMBER (e.g. VSB000101-VSB000200 or BC100-BC200)
  const rangeMatch = clean.match(/^([A-Za-z_-]+)(\d+)\s*(?:-|to|\.\.|:)\s*([A-Za-z_-]+)?(\d+)$/i);
  if (rangeMatch) {
    const prefix1 = rangeMatch[1].toUpperCase();
    const startNumStr = rangeMatch[2];
    const prefix2 = (rangeMatch[3] || prefix1).toUpperCase();
    const endNumStr = rangeMatch[4];

    if (prefix1 === prefix2) {
      const startNum = parseInt(startNumStr, 10);
      const endNum = parseInt(endNumStr, 10);
      const padding = startNumStr.length;

      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum - startNum <= 2500) {
        const serials = [];
        for (let i = startNum; i <= endNum; i++) {
          serials.push(`${prefix1}${String(i).padStart(padding, '0')}`);
        }
        return {
          isRange: true,
          prefix: prefix1,
          startNum,
          endNum,
          startNumStr,
          endNumStr,
          count: serials.length,
          serials,
          rawCode: clean,
        };
      }
    }
  }

  return null;
};

// Clean raw barcode string
const cleanBarcodeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const urlObj = new URL(cleaned);
      const searchParam = urlObj.searchParams.get('serial') || urlObj.searchParams.get('card');
      if (searchParam) return searchParam.toUpperCase().trim();
      const segments = urlObj.pathname.split('/').filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1].toUpperCase().trim();
    } catch {}
  }
  return cleaned.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
};

const BarcodeStockIngestScanner = ({
  boxNotes = '',
  setBoxNotes,
}) => {
  const navigate = useNavigate();

  // Scanner & Camera state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Auto-Suffix Mode (Allows scanning same physical test card barcode repeatedly)
  const [autoUniqueMode, setAutoUniqueMode] = useState(true);

  // Stock Ingestion Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState(null); 
  // lastScannedResult: { status: 'SUCCESS' | 'ERROR', count: 100, serials: [...], ... }

  // Session history of batches added
  const [sessionBatches, setSessionBatches] = useState([]);

  const scannerRef = useRef(null);
  const scannerId = 'barcode-stock-ingest-viewfinder';
  const isScanLockedRef = useRef(false);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setCameraStarting(false);
  }, []);

  // Helper to resolve unique serial by adding incremental suffix if it already exists
  const resolveUniqueSerial = async (baseSerial) => {
    const rawClean = cleanBarcodeText(baseSerial);
    if (!rawClean) return rawClean;

    if (!autoUniqueMode) {
      return rawClean;
    }

    try {
      // Check existing cards in DB matching prefix or search
      const searchRes = await api.get('/cards', { params: { search: rawClean, limit: 50 } });
      const existingCards = searchRes.data?.data?.cards || [];
      const existingSerials = new Set(existingCards.map((c) => c.serialNumber?.toUpperCase()));

      // If not taken, use directly
      if (!existingSerials.has(rawClean)) {
        return rawClean;
      }

      // If taken, truncate base to 16 chars max to allow suffix like -01
      const baseTruncated = rawClean.length > 16 ? rawClean.slice(0, 16) : rawClean;

      for (let i = 1; i <= 99; i++) {
        const suffix = String(i).padStart(2, '0');
        const candidate = `${baseTruncated}-${suffix}`;
        if (!existingSerials.has(candidate)) {
          // Double-check candidate
          const checkRes = await api.get('/cards', { params: { search: candidate, limit: 1 } });
          const checkCards = checkRes.data?.data?.cards || [];
          const isMatch = checkCards.some((c) => c.serialNumber?.toUpperCase() === candidate);
          if (!isMatch) {
            return candidate;
          }
        }
      }

      // Fallback timestamp suffix
      return `${baseTruncated}-${Date.now().toString().slice(-4)}`;
    } catch {
      return `${rawClean.slice(0, 15)}-${Date.now().toString().slice(-3)}`;
    }
  };

  // Ingest Serials directly into Stock
  const ingestStockDirectly = async (serialsToAdd, detectedInfo) => {
    if (!serialsToAdd || serialsToAdd.length === 0) {
      setLastScannedResult({
        status: 'ERROR',
        error: 'No valid serial numbers extracted from barcode.',
        scannedCode: detectedInfo?.rawCode || '',
      });
      if (soundEnabled) playWarningSound();
      return;
    }

    setIsProcessing(true);
    setLastScannedResult(null);

    try {
      // If Auto-Unique mode is active, ensure all serials are unique with suffix if repeated
      let finalSerials = [];
      let hadSuffixed = false;

      if (autoUniqueMode) {
        if (serialsToAdd.length === 1) {
          const resolved = await resolveUniqueSerial(serialsToAdd[0]);
          if (resolved !== serialsToAdd[0]) {
            hadSuffixed = true;
          }
          finalSerials = [resolved];
        } else {
          // Range case
          const firstResolved = await resolveUniqueSerial(serialsToAdd[0]);
          if (firstResolved !== serialsToAdd[0]) {
            hadSuffixed = true;
            const suffixMatch = firstResolved.match(/-(\d+)$/);
            const suffixStr = suffixMatch ? `-${suffixMatch[1]}` : `-${Date.now().toString().slice(-3)}`;
            finalSerials = serialsToAdd.map((s) => `${s.slice(0, 16)}${suffixStr}`);
          } else {
            finalSerials = serialsToAdd;
          }
        }
      } else {
        finalSerials = serialsToAdd;
      }

      const notesPayload = `[BARCODE STOCK] ${boxNotes?.trim() || 'Physical Barcode Stock Ingestion'}${
        detectedInfo?.isRange ? ` (Box ${detectedInfo.rawCode})` : ''
      }${hadSuffixed ? ' [Auto-Suffixed Duplicate]' : ''}`;

      const res = await api.post('/cards/manual', {
        serialNumbers: finalSerials,
        notes: notesPayload,
      });

      const totalCreated = res.data?.data?.totalCreated || finalSerials.length;
      const batchId = res.data?.data?.batchId || 'BATCH-' + Date.now();

      if (soundEnabled) playSuccessChime();

      const successRecord = {
        status: 'SUCCESS',
        batchId,
        count: totalCreated,
        serials: finalSerials,
        detectedInfo,
        firstSerial: finalSerials[0],
        lastSerial: finalSerials[finalSerials.length - 1],
        originalScanned: serialsToAdd[0],
        wasSuffixed: hadSuffixed,
        timestamp: new Date(),
      };

      setLastScannedResult(successRecord);
      setSessionBatches((prev) => [successRecord, ...prev]);
    } catch (err) {
      if (soundEnabled) playWarningSound();
      const errorMsg =
        err.response?.data?.message ||
        'Failed to add scanned cards to stock. Card serial may already exist in database.';

      setLastScannedResult({
        status: 'ERROR',
        error: errorMsg,
        serials: serialsToAdd,
        detectedInfo,
        scannedCode: detectedInfo?.rawCode || serialsToAdd[0] || '',
      });
    } finally {
      setIsProcessing(false);
      isScanLockedRef.current = false;
    }
  };

  // Handle single scan event from camera (SINGLE-TIME SCAN TRIGGER)
  const handleScanSuccess = useCallback(
    async (decodedText) => {
      if (isScanLockedRef.current) return;
      isScanLockedRef.current = true;

      if (!decodedText || typeof decodedText !== 'string') {
        isScanLockedRef.current = false;
        return;
      }

      // 1. Immediately Stop Camera to enforce Single-Time Scan
      if (soundEnabled) playBeepSound();
      await stopCamera();

      // 2. Parse barcode data
      const boxRange = parseBarcodeBoxRange(decodedText);
      if (boxRange && boxRange.count > 0) {
        await ingestStockDirectly(boxRange.serials, boxRange);
      } else {
        const cleanSerial = cleanBarcodeText(decodedText);
        if (!cleanSerial) {
          if (soundEnabled) playWarningSound();
          setLastScannedResult({
            status: 'ERROR',
            error: `Scanned barcode "${decodedText}" contains no valid alphanumeric serial characters.`,
            scannedCode: decodedText,
          });
          isScanLockedRef.current = false;
          return;
        }

        await ingestStockDirectly([cleanSerial], {
          isRange: false,
          rawCode: cleanSerial,
          count: 1,
        });
      }
    },
    [soundEnabled, stopCamera, boxNotes, autoUniqueMode]
  );

  // Start Camera in Full Box View
  const startCamera = useCallback(async () => {
    setCameraError('');
    setLastScannedResult(null);
    isScanLockedRef.current = false;
    setCameraStarting(true);
    setIsScanning(true);

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }

    try {
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

      // Find available cameras if not loaded
      let deviceIdToUse = selectedCameraId;
      if (!deviceIdToUse) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            const backCam = devices.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            deviceIdToUse = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(deviceIdToUse);
          }
        } catch {}
      }

      const cameraConfig = deviceIdToUse
        ? { deviceId: { exact: deviceIdToUse } }
        : { facingMode: 'environment' };

      const wideQrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        const width = Math.max(Math.floor(viewfinderWidth * 0.94), 260);
        const height = Math.max(Math.floor(viewfinderHeight * 0.88), 220);
        return { width, height };
      };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: wideQrboxFunction,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setCameraStarting(false);
      setIsScanning(true);
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(
        err?.name === 'NotAllowedError' || err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera permissions in browser settings.'
          : 'Unable to start camera video stream. Please check camera connection or type serials below.'
      );
      setIsScanning(false);
      setCameraStarting(false);
    }
  }, [selectedCameraId, handleScanSuccess, stopCamera]);

  // Flip camera between front/back
  const handleFlipCamera = async () => {
    if (availableCameras.length < 2) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    if (isScanning) {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Handle Manual or Barcode Gun Input
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const raw = manualInput.trim();
    setManualInput('');

    const boxRange = parseBarcodeBoxRange(raw);
    if (boxRange && boxRange.count > 0) {
      await ingestStockDirectly(boxRange.serials, boxRange);
    } else {
      const cleanSerial = cleanBarcodeText(raw);
      if (!cleanSerial) {
        if (soundEnabled) playWarningSound();
        setLastScannedResult({
          status: 'ERROR',
          error: `Input "${raw}" contains no valid alphanumeric serial characters.`,
          scannedCode: raw,
        });
        return;
      }

      await ingestStockDirectly([cleanSerial], {
        isRange: false,
        rawCode: cleanSerial,
        count: 1,
      });
    }
  };

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          const backCam = cameras.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : cameras[0].id);
        }
      })
      .catch(() => {});

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        #${scannerId} {
          width: 100% !important;
          min-height: 360px !important;
          border: none !important;
        }
        #${scannerId} video {
          width: 100% !important;
          height: 100% !important;
          min-height: 360px !important;
          max-height: 520px !important;
          object-fit: cover !important;
          border-radius: 12px !important;
          display: block !important;
        }
        #${scannerId} img {
          display: none !important;
        }
        #${scannerId}__scan_region {
          min-height: 320px !important;
        }
        @keyframes laserSweep {
          0% { top: 12%; opacity: 0.85; }
          50% { top: 82%; opacity: 1; }
          100% { top: 12%; opacity: 0.85; }
        }
      `}</style>

      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#F8FAFC',
          border: '1px solid #334155',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <ScanLine size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
                  Barcode & Card Box Instant Ingestion
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    letterSpacing: '0.4px',
                  }}
                >
                  LIVE AUTO-ADD
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
                Scan single card or box range barcode (e.g. <code>VSB000101-VSB000200</code>) — system registers stock instantly in 1 step!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Auto-Unique Mode Switcher */}
            <button
              type="button"
              onClick={() => setAutoUniqueMode((prev) => !prev)}
              style={{
                background: autoUniqueMode ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.15)',
                border: `1px solid ${autoUniqueMode ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                color: autoUniqueMode ? '#34D399' : '#94A3B8',
                padding: '7px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '700',
              }}
              title="When enabled, scanning the same physical test barcode multiple times will auto-append -01, -02 so you can add multiple cards freely"
            >
              <Zap size={15} color={autoUniqueMode ? '#34D399' : '#94A3B8'} />
              <span>{autoUniqueMode ? 'Multi-Scan Suffix: ON' : 'Strict Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              style={{
                background: soundEnabled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: soundEnabled ? '#38BDF8' : '#94A3B8',
                padding: '7px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lot Notes & Multi-Scan Info */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box size={16} color="#0284C7" />
            <span>Packaging / Box Lot Reference (Optional):</span>
          </label>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
            ⚡ Same test barcode scan karne par automatically <code>-01, -02...</code> add ho jayega!
          </span>
        </div>
        <input
          type="text"
          className="input"
          placeholder="e.g. Barcode Box #1 - 100 Pcs (Lot OCT26)"
          value={boxNotes}
          onChange={(e) => setBoxNotes && setBoxNotes(e.target.value)}
          style={{ fontSize: '13.5px', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* MAIN SCANNER FULL-BOX CONTAINER */}
      <div
        className="card"
        style={{
          padding: '20px',
          position: 'relative',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          borderRadius: '14px',
        }}
      >
        {/* Header inside scanner container */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={18} color="#0284c7" />
              <span>Full Box Camera Scanner</span>
            </h4>
            {isScanning && !cameraStarting && (
              <span
                style={{
                  fontSize: '11.5px',
                  color: '#16A34A',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#DCFCE7',
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                Camera Live (1-Shot Scan)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={handleFlipCamera}
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FlipHorizontal size={14} />
                <span>Switch Cam</span>
              </button>
            )}

            {isScanning && (
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#DC2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CameraOff size={14} />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* FULL BOX SCANNER VIEWPORT / STATES */}
        <div
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            minHeight: '360px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: isScanning ? '2px solid #38BDF8' : '2px dashed #334155',
            boxShadow: isScanning ? '0 0 24px rgba(56, 189, 248, 0.25)' : 'none',
          }}
        >
          {/* HTML5 QRCODE CONTAINER — ALWAYS MOUNTED AND FULL SIZED */}
          <div
            id={scannerId}
            style={{
              width: '100%',
              minHeight: '360px',
              display: isScanning ? 'block' : 'none',
            }}
          />

          {/* LASER SCANNING ANIMATION LINE OVERLAY WHEN SCANNING */}
          {isScanning && !cameraStarting && (
            <div
              style={{
                position: 'absolute',
                left: '8%',
                right: '8%',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #22C55E, #38BDF8, #22C55E, transparent)',
                boxShadow: '0 0 12px #22C55E',
                animation: 'laserSweep 2.2s infinite ease-in-out',
                pointerEvents: 'none',
                zIndex: 8,
              }}
            />
          )}

          {/* CAMERA STARTING / LOADING OVERLAY */}
          {cameraStarting && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                zIndex: 12,
              }}
            >
              <RefreshCw size={40} color="#38BDF8" className="animate-spin" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Opening Camera Scanner...</p>
            </div>
          )}

          {/* STATE 2: PROCESSING / INGESTING LOADER */}
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                padding: '24px',
                textAlign: 'center',
                zIndex: 20,
              }}
            >
              <RefreshCw size={48} color="#38BDF8" className="animate-spin" style={{ marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700' }}>Adding Stock to Warehouse...</h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#94A3B8' }}>
                Registering card stock into database with uniqueness resolution...
              </p>
            </div>
          )}

          {/* STATE 3: SUCCESS RESULT (STOCK ADDED MESSAGE) */}
          {!isScanning && !isProcessing && lastScannedResult?.status === 'SUCCESS' && (
            <div
              style={{
                width: '100%',
                minHeight: '360px',
                padding: '32px 20px',
                textAlign: 'center',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  border: '3px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  marginBottom: '14px',
                  boxShadow: '0 6px 16px rgba(22, 163, 74, 0.2)',
                }}
              >
                <CheckCircle2 size={40} />
              </div>

              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.6px',
                  marginBottom: '10px',
                }}
              >
                STOCK ADDED SUCCESSFULLY!
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#14532D' }}>
                +{lastScannedResult.count} Cards Added to Inventory
              </h3>

              <div style={{ margin: '0 0 20px', fontSize: '14px', color: '#15803D', maxWidth: '460px' }}>
                {lastScannedResult.detectedInfo?.isRange ? (
                  <>
                    Box Range Barcode: <strong>{lastScannedResult.detectedInfo.rawCode}</strong> <br />
                    <span style={{ fontSize: '13px', color: '#166534' }}>
                      ({lastScannedResult.firstSerial} → {lastScannedResult.lastSerial})
                    </span>
                  </>
                ) : (
                  <>
                    Registered Serial: <strong>{lastScannedResult.firstSerial}</strong>
                    {lastScannedResult.wasSuffixed && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#047857' }}>
                        (Auto-indexed from duplicate test barcode: <code>{lastScannedResult.originalScanned}</code>)
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '440px' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary"
                  style={{
                    flex: '1 1 200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 20px',
                    fontWeight: '700',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  <Camera size={18} />
                  <span>Scan Next Card / Box</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/cards')}
                  className="btn btn-outline"
                  style={{
                    flex: '1 1 160px',
                    backgroundColor: '#FFFFFF',
                    borderColor: '#86EFAC',
                    color: '#15803D',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    padding: '13px 18px',
                  }}
                >
                  <span>View Stock Inventory</span>
                  <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: GLITCH / ERROR / RETRY STATE */}
          {!isScanning && !isProcessing && lastScannedResult?.status === 'ERROR' && (
            <div
              style={{
                width: '100%',
                minHeight: '360px',
                padding: '32px 20px',
                textAlign: 'center',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  border: '3px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  marginBottom: '14px',
                }}
              >
                <AlertTriangle size={36} />
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: '800', color: '#991B1B' }}>
                Scan Issue / Duplicate Found
              </h4>

              <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#B91C1C', maxWidth: '440px', lineHeight: 1.4 }}>
                {lastScannedResult.error}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#DC2626',
                    borderColor: '#DC2626',
                    padding: '12px 24px',
                    fontWeight: '700',
                    fontSize: '14px',
                  }}
                >
                  <RotateCcw size={17} />
                  <span>Retry Scan / Rescan</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: IDLE READY STATE */}
          {!isScanning && !isProcessing && !lastScannedResult && (
            <div style={{ padding: '44px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '18px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#38BDF8',
                }}
              >
                <Camera size={38} />
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
                Full-Box Camera Scanner Ready
              </h4>
              <p style={{ margin: '0 0 22px', fontSize: '13.5px', color: '#94A3B8', maxWidth: '420px', lineHeight: 1.5 }}>
                Tap below to open full-box camera scanner. Scans once and directly registers stock into Warehouse inventory.
              </p>

              <button
                type="button"
                onClick={startCamera}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: '700',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.45)',
                }}
              >
                <Camera size={20} />
                <span>Start Camera Scanner</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Permission or Init Error */}
        {cameraError && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{cameraError}</span>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="btn btn-sm"
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '5px 12px', fontSize: '12px', fontWeight: '700' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Alternative: Gun Scanner or Manual Input */}
        <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #E2E8F0' }}>
          <form onSubmit={handleManualSubmit}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
              Or Scan with Handheld Gun / Enter Serial & Box Code:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="Scan with gun or type e.g. VSB000101-VSB000200 or VS000101"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                disabled={isProcessing}
                style={{ flex: '1 1 260px', fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', padding: '12px 14px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!manualInput.trim() || isProcessing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px', flex: '1 1 140px', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}
              >
                {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={18} />}
                <span>Add to Stock</span>
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Supports box ranges: <code>VSB000101-VSB000200</code> (100 pcs) or individual barcodes.
            </p>
          </form>
        </div>
      </div>

      {/* SESSION INGESTION HISTORY LOG */}
      {sessionBatches.length > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={17} color="#16A34A" />
              <span>Stock Added in this Session ({sessionBatches.reduce((a, b) => a + b.count, 0)} Total Cards)</span>
            </h4>
            <Link to="/cards" style={{ fontSize: '13px', color: '#0284C7', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View Inventory</span>
              <ExternalLink size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionBatches.map((b, idx) => (
              <div
                key={`${b.batchId}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>
                    +{b.count} Cards
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12.5px' }}>
                    ({b.firstSerial}{b.count > 1 ? ` → ${b.lastSerial}` : ''})
                  </span>
                </div>

                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeStockIngestScanner;
