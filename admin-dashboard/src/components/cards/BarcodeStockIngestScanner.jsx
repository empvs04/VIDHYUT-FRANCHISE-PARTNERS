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
  Package,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  ScanLine,
  Box,
  CornerDownLeft,
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
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
};

// Helper: Parse potential Box Barcode Range (e.g. "VSB0001-VSB0100" or "BC000101..BC000200")
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

      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum - startNum <= 2000) {
        const serials = [];
        for (let i = startNum; i <= endNum; i++) {
          serials.push(`${prefix1}${String(i).padStart(padding, '0')}`);
        }
        return {
          isRange: true,
          prefix: prefix1,
          startNum,
          endNum,
          count: serials.length,
          serials,
        };
      }
    }
  }

  return null;
};

const BarcodeStockIngestScanner = ({
  scannedSerials = [],
  setScannedSerials,
  boxNotes = '',
  setBoxNotes,
  onSubmitStock,
  submitting = false,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Status message for scan feedback
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warn' | 'info', title: '', message: '' }
  const [validatingDb, setValidatingDb] = useState(false);

  const scannerRef = useRef(null);
  const scannerId = 'barcode-stock-ingest-viewfinder';
  const isScanLockedRef = useRef(false);

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

  // Add individual serial to queue
  const addSingleSerial = useCallback(
    async (rawSerial) => {
      const serial = cleanBarcodeText(rawSerial);
      if (!serial) {
        setFeedback({
          type: 'warn',
          title: 'Invalid Barcode Format',
          message: 'Scanned text contains no valid alphanumeric serial characters.',
        });
        if (soundEnabled) playWarningSound();
        return false;
      }

      if (scannedSerials.includes(serial)) {
        setFeedback({
          type: 'warn',
          title: 'Already in Scan Queue',
          message: `Serial "${serial}" is already added in the current batch.`,
        });
        if (soundEnabled) playWarningSound();
        return false;
      }

      // Check against DB
      try {
        setValidatingDb(true);
        const res = await api.get('/cards', { params: { search: serial, limit: 1 } });
        const existingCards = res.data?.data?.cards || [];
        const exactMatch = existingCards.some((c) => c.serialNumber?.toUpperCase() === serial);

        if (exactMatch) {
          setFeedback({
            type: 'warn',
            title: 'Card Already Exists in Database!',
            message: `Serial "${serial}" already exists in system inventory. Cannot re-add duplicate.`,
          });
          if (soundEnabled) playWarningSound();
          return false;
        }

        // Add to state
        setScannedSerials((prev) => [serial, ...prev]);
        setFeedback({
          type: 'success',
          title: 'Barcode Card Added',
          message: `Card serial "${serial}" verified and added to batch!`,
        });
        if (soundEnabled) playBeepSound();
        return true;
      } catch (e) {
        // If search fails, still append
        setScannedSerials((prev) => [serial, ...prev]);
        setFeedback({
          type: 'success',
          title: 'Barcode Card Added',
          message: `Card serial "${serial}" queued for stock entry.`,
        });
        if (soundEnabled) playBeepSound();
        return true;
      } finally {
        setValidatingDb(false);
      }
    },
    [scannedSerials, setScannedSerials, soundEnabled]
  );

  // Handle detected scan (Single or Box Range)
  const handleScanSuccess = useCallback(
    async (decodedText) => {
      if (isScanLockedRef.current) return;
      isScanLockedRef.current = true;

      if (!decodedText || typeof decodedText !== 'string') {
        isScanLockedRef.current = false;
        return;
      }

      // 1. Check if scanned text is a Box Range Barcode (e.g. VSB000101-VSB000200)
      const boxRange = parseBarcodeBoxRange(decodedText);
      if (boxRange && boxRange.count > 1) {
        if (soundEnabled) playBeepSound();
        // Filter out any serials that are already in scannedSerials
        const existingSet = new Set(scannedSerials);
        const newSerials = boxRange.serials.filter((s) => !existingSet.has(s));

        if (newSerials.length === 0) {
          setFeedback({
            type: 'warn',
            title: 'Box Already Scanned',
            message: `All ${boxRange.count} cards from box (${boxRange.prefix}${boxRange.startNum} - ${boxRange.prefix}${boxRange.endNum}) are already in queue.`,
          });
        } else {
          setScannedSerials((prev) => [...newSerials, ...prev]);
          setFeedback({
            type: 'success',
            title: `📦 Card Box Scanned (${newSerials.length} Cards)`,
            message: `Successfully loaded box range ${boxRange.prefix}${boxRange.startNum} to ${boxRange.prefix}${boxRange.endNum} into queue!`,
          });
        }

        setTimeout(() => {
          isScanLockedRef.current = false;
        }, 1500);
        return;
      }

      // 2. Individual card scan
      await addSingleSerial(decodedText);

      setTimeout(() => {
        isScanLockedRef.current = false;
      }, 1000);
    },
    [scannedSerials, setScannedSerials, soundEnabled, addSingleSerial]
  );

  // Handle Manual/Gun Scanner Submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const raw = manualInput.trim();
    const boxRange = parseBarcodeBoxRange(raw);

    if (boxRange && boxRange.count > 1) {
      const existingSet = new Set(scannedSerials);
      const newSerials = boxRange.serials.filter((s) => !existingSet.has(s));
      setScannedSerials((prev) => [...newSerials, ...prev]);
      setFeedback({
        type: 'success',
        title: `📦 Card Box Added (${newSerials.length} Cards)`,
        message: `Loaded range ${boxRange.prefix}${boxRange.startNum} - ${boxRange.prefix}${boxRange.endNum}`,
      });
      if (soundEnabled) playBeepSound();
      setManualInput('');
      return;
    }

    const added = await addSingleSerial(raw);
    if (added) {
      setManualInput('');
    }
  };

  // Enumerate cameras
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
  }, []);

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
    isScanLockedRef.current = false;
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError('');
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
        : { facingMode: facingMode };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.55),
            };
          },
          aspectRatio: 1.6,
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
        'Unable to access camera. Please verify camera permissions or enter serial numbers manually.'
      );
      setIsScanning(false);
    }
  }, [selectedCameraId, facingMode, handleScanSuccess, stopCamera]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, []);

  // Remove single card
  const handleRemove = (serialToRemove) => {
    setScannedSerials((prev) => prev.filter((s) => s !== serialToRemove));
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm(`Are you sure you want to clear all ${scannedSerials.length} scanned cards?`)) {
      setScannedSerials([]);
      setFeedback(null);
    }
  };

  return (
    <div>
      {/* Top Instruction Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#F8FAFC',
          marginBottom: '20px',
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
                  Barcode & Card Box Stock Ingestion
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
                  PHYSICAL STOCK
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
                Scan individual card barcodes or a <strong>Card Box Range Barcode</strong> (e.g. <code>VSB000101-VSB000200</code>) to instantly add stock.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px', width: '100%' }}>
        {/* Left Side: Camera Scanner & Manual Gun Input */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} color="#0284c7" />
              <span>Camera Barcode Scanner</span>
            </h4>
            {isScanning && (
              <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                Camera Live
              </span>
            )}
          </div>

          {/* Viewfinder Container */}
          <div
            style={{
              position: 'relative',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#0F172A',
              minHeight: '230px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #334155',
              marginBottom: '12px',
            }}
          >
            <div id={scannerId} style={{ width: '100%', minHeight: isScanning ? '230px' : '0px' }} />

            {!isScanning && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                <Camera size={38} style={{ margin: '0 auto 8px', opacity: 0.5, color: '#38BDF8' }} />
                <p style={{ margin: '0 0 12px', fontSize: '13px' }}>
                  Camera is turned off. Start camera to scan physical barcodes or boxes.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: '700',
                  }}
                >
                  <Camera size={15} />
                  <span>Start Camera Scanner</span>
                </button>
              </div>
            )}

            {isScanning && (
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CameraOff size={13} />
                <span>Stop</span>
              </button>
            )}
          </div>

          {cameraError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#FEF2F2',
                borderRadius: '6px',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '12.5px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Quick Scanner Gun Input */}
          <form onSubmit={handleManualSubmit} style={{ marginTop: '8px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Scan with Gun or Type Serial / Box Range:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input"
                placeholder="Scan card or range e.g. VSB000101-VSB000200"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!manualInput.trim() || validatingDb}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 14px' }}
              >
                {validatingDb ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={16} />}
                <span>Add</span>
              </button>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Supports box formats: <code>VSB000101-VSB000200</code> or individual barcodes.
            </p>
          </form>

          {/* Live Scan Notification / Feedback Box */}
          {feedback && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                color: feedback.type === 'success' ? '#166534' : '#991B1B',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={16} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <div>
                <strong style={{ display: 'block', fontSize: '13px' }}>{feedback.title}</strong>
                <span>{feedback.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Scanned Cards Queue & Submission */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                Scanned Barcode Stock Queue
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Cards ready to be registered in Warehouse stock
              </p>
            </div>

            <div
              style={{
                backgroundColor: scannedSerials.length > 0 ? '#10B981' : '#E2E8F0',
                color: scannedSerials.length > 0 ? '#FFFFFF' : '#475569',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {scannedSerials.length} Cards
            </div>
          </div>

          {/* Packaging / Box Notes Input */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
              Packaging / Box Lot Reference:
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Barcode Box #1 - 100 Pcs (Lot OCT26)"
              value={boxNotes}
              onChange={(e) => setBoxNotes(e.target.value)}
              style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Scanned Serial Numbers List */}
          <div
            style={{
              flex: 1,
              minHeight: '160px',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              padding: '10px',
              marginBottom: '14px',
              boxSizing: 'border-box',
            }}
          >
            {scannedSerials.length === 0 ? (
              <div style={{ height: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                <Box size={30} style={{ opacity: 0.4, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#64748B' }}>No Barcodes Scanned Yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#94A3B8' }}>Scan card barcodes with camera or enter serials above.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: '6px' }}>
                {scannedSerials.map((serial, idx) => (
                  <div
                    key={`${serial}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFFFFF',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: '#0F172A',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serial}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(serial)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: '4px',
                        flexShrink: 0,
                      }}
                      title="Remove from batch"
                    >
                      <X size={13} color="#EF4444" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
            {scannedSerials.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="btn btn-outline btn-sm"
                style={{ color: '#EF4444', borderColor: '#FECACA', flex: '1 1 100px', minWidth: '90px', justifyContent: 'center' }}
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSubmitStock}
              disabled={submitting || scannedSerials.length === 0}
              className="btn btn-success"
              style={{
                flex: scannedSerials.length > 0 ? '2 1 180px' : '1 1 100%',
                width: '100%',
                minWidth: '160px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '700',
                padding: '11px 16px',
                borderRadius: '8px',
                boxShadow: scannedSerials.length > 0 ? '0 3px 8px rgba(16, 185, 129, 0.3)' : 'none',
                cursor: scannedSerials.length > 0 ? 'pointer' : 'not-allowed',
                opacity: scannedSerials.length > 0 ? 1 : 0.6,
                boxSizing: 'border-box',
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Adding {scannedSerials.length} Cards...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Ingest {scannedSerials.length} Cards to Stock</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeStockIngestScanner;
