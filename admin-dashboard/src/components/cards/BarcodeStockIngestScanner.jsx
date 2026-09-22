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
  ListOrdered,
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
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Stock Ingestion Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState(null); 
  // lastScannedResult structure:
  // { status: 'SUCCESS' | 'ERROR', count: 100, serials: [...], boxRange: {...}, message: '', error: '' }

  // History of recently added batches during current session
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
  }, []);

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
      const notesPayload = `[BARCODE STOCK] ${boxNotes?.trim() || 'Physical Barcode Stock Ingestion'}${
        detectedInfo?.isRange ? ` (Box ${detectedInfo.rawCode})` : ''
      }`;

      const res = await api.post('/cards/manual', {
        serialNumbers: serialsToAdd,
        notes: notesPayload,
      });

      const totalCreated = res.data?.data?.totalCreated || serialsToAdd.length;
      const batchId = res.data?.data?.batchId || 'BATCH-' + Date.now();

      if (soundEnabled) playSuccessChime();

      const successRecord = {
        status: 'SUCCESS',
        batchId,
        count: totalCreated,
        serials: serialsToAdd,
        detectedInfo,
        firstSerial: serialsToAdd[0],
        lastSerial: serialsToAdd[serialsToAdd.length - 1],
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
    [soundEnabled, stopCamera, boxNotes]
  );

  // Start Camera in Full Box View
  const startCamera = useCallback(async () => {
    setCameraError('');
    setLastScannedResult(null);
    isScanLockedRef.current = false;
    await stopCamera();

    try {
      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.9),
              height: Math.floor(minEdge * 0.65),
            };
          },
          aspectRatio: 1.4,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(
        'Unable to access camera. Please check camera permissions in your browser or type serials below.'
      );
      setIsScanning(false);
    }
  }, [selectedCameraId, handleScanSuccess, stopCamera]);

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
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <ScanLine size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#FFFFFF' }}>
                  Barcode & Card Box Instant Stock Ingestion
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
                  LIVE INGESTION
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
                Scan single card or box range barcode (e.g. <code>VSB000101-VSB000200</code>) — system registers stock instantly in 1 step!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              style={{
                background: soundEnabled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: soundEnabled ? '#38BDF8' : '#94A3B8',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600',
              }}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lot Notes Input */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box size={15} color="#0284C7" />
            <span>Packaging / Box Lot Reference (Optional):</span>
          </label>
        </div>
        <input
          type="text"
          className="input"
          placeholder="e.g. Barcode Box #1 - 100 Pcs (Lot OCT26)"
          value={boxNotes}
          onChange={(e) => setBoxNotes && setBoxNotes(e.target.value)}
          style={{ fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* MAIN SCANNER FULL-BOX CONTAINER */}
      <div
        className="card"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          borderRadius: '14px',
        }}
      >
        {/* Header inside scanner container */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={18} color="#0284c7" />
              <span>Camera Barcode Scanner</span>
            </h4>
            {isScanning && (
              <span
                style={{
                  fontSize: '11.5px',
                  color: '#16A34A',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#DCFCE7',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                Scanning Live (Single Scan)
              </span>
            )}
          </div>

          {availableCameras.length > 1 && !isScanning && (
            <select
              className="select"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px', width: 'auto', maxWidth: '200px' }}
            >
              {availableCameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* FULL BOX SCANNER VIEWPORT / STATES */}
        <div
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: isScanning ? '2px solid #38BDF8' : '2px dashed #334155',
            boxShadow: isScanning ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Viewfinder Target for html5-qrcode */}
          <div
            id={scannerId}
            style={{
              width: '100%',
              minHeight: isScanning ? '320px' : '0px',
              display: isScanning ? 'block' : 'none',
            }}
          />

          {/* STATE 1: CAMERA ACTIVE OVERLAY */}
          {isScanning && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <CameraOff size={14} color="#EF4444" />
                <span>Stop Scanner</span>
              </button>
            </div>
          )}

          {/* STATE 2: PROCESSING / INGESTING LOADER */}
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
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
              <RefreshCw size={44} color="#38BDF8" className="animate-spin" style={{ marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700' }}>Adding Stock to Warehouse...</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
                Validating barcode uniqueness and registering cards into system inventory
              </p>
            </div>
          )}

          {/* STATE 3: SUCCESS RESULT (STOCK ADDED MESSAGE) */}
          {!isScanning && !isProcessing && lastScannedResult?.status === 'SUCCESS' && (
            <div
              style={{
                width: '100%',
                padding: '28px 20px',
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
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  border: '2px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  marginBottom: '14px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                }}
              >
                STOCK ADDED SUCCESSFULLY!
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#14532D' }}>
                +{lastScannedResult.count} Cards Added to Inventory
              </h3>

              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#15803D' }}>
                {lastScannedResult.detectedInfo?.isRange ? (
                  <>
                    Box Range: <strong>{lastScannedResult.detectedInfo.rawCode}</strong> ({lastScannedResult.firstSerial} → {lastScannedResult.lastSerial})
                  </>
                ) : (
                  <>
                    Card Serial: <strong>{lastScannedResult.firstSerial}</strong>
                  </>
                )}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '420px' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary"
                  style={{
                    flex: '1 1 180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 18px',
                    fontWeight: '700',
                    fontSize: '13.5px',
                  }}
                >
                  <Camera size={17} />
                  <span>Scan Next Card / Box</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/cards')}
                  className="btn btn-outline"
                  style={{
                    flex: '1 1 140px',
                    backgroundColor: '#FFFFFF',
                    borderColor: '#86EFAC',
                    color: '#15803D',
                    fontWeight: '700',
                    fontSize: '13px',
                  }}
                >
                  <span>View Stock Inventory</span>
                  <ArrowRight size={15} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: GLITCH / ERROR / RETRY STATE */}
          {!isScanning && !isProcessing && lastScannedResult?.status === 'ERROR' && (
            <div
              style={{
                width: '100%',
                padding: '28px 20px',
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
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  border: '2px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  marginBottom: '12px',
                }}
              >
                <AlertTriangle size={32} />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#991B1B' }}>
                Scan Failed / Duplicate Found
              </h4>

              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#B91C1C', maxWidth: '440px', lineHeight: 1.4 }}>
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
                    gap: '6px',
                    backgroundColor: '#DC2626',
                    borderColor: '#DC2626',
                    padding: '11px 20px',
                    fontWeight: '700',
                    fontSize: '13.5px',
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Retry Scan / Rescan</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: IDLE READY STATE */}
          {!isScanning && !isProcessing && !lastScannedResult && (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#38BDF8',
                }}
              >
                <Camera size={34} />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#F8FAFC' }}>
                Full-Box Camera Scanner Ready
              </h4>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                Tap below to open high-resolution scanner. Scans once and immediately registers stock in real-time.
              </p>

              <button
                type="button"
                onClick={startCamera}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                }}
              >
                <Camera size={18} />
                <span>Start Camera Scanner</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Permission or Init Error */}
        {cameraError && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{cameraError}</span>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="btn btn-sm"
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '4px 10px', fontSize: '11.5px' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Alternative: Gun Scanner or Manual Input */}
        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
          <form onSubmit={handleManualSubmit}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#0F172A' }}>
              Or Scan with Handheld Gun / Enter Serial & Box Code:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="Scan with gun or type e.g. VSB000101-VSB000200 or VS000101"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                disabled={isProcessing}
                style={{ flex: '1 1 240px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!manualInput.trim() || isProcessing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 18px', flex: '1 1 120px', justifyContent: 'center' }}
              >
                {isProcessing ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={16} />}
                <span>Add to Stock</span>
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Supports box ranges: <code>VSB000101-VSB000200</code> (100 pcs) or individual barcodes.
            </p>
          </form>
        </div>
      </div>

      {/* SESSION INGESTION HISTORY LOG */}
      {sessionBatches.length > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#16A34A" />
              <span>Stock Added in this Session ({sessionBatches.reduce((a, b) => a + b.count, 0)} Total Cards)</span>
            </h4>
            <Link to="/cards" style={{ fontSize: '12.5px', color: '#0284C7', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View Inventory</span>
              <ExternalLink size={13} />
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
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#16A34A" />
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>
                    +{b.count} Cards
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                    ({b.firstSerial}{b.count > 1 ? ` → ${b.lastSerial}` : ''})
                  </span>
                </div>

                <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
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
