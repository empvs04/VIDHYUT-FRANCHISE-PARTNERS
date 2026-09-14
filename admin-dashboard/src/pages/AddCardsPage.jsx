import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Layers,
  ListPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  Building2,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const AddCardsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState('BATCH'); // 'BATCH' or 'MANUAL'
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Batch Range Form States
  const [prefix, setPrefix] = useState('VS');
  const [startNumber, setStartNumber] = useState(201);
  const [endNumber, setEndNumber] = useState(300);
  const [paddingLength, setPaddingLength] = useState(6);
  const [batchNotes, setBatchNotes] = useState('Warehouse stock addition');

  // Preview data and error state
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  // Manual List Form States
  const [manualText, setManualText] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Auto-fetch next available serial range
  const fetchNextAvailableRange = async (currentPrefix = prefix, count = 100, silent = false) => {
    try {
      const res = await api.get('/cards/next-serial', {
        params: { prefix: currentPrefix, paddingLength, count },
      });
      if (res.data?.data) {
        setStartNumber(res.data.data.nextStartNumber);
        setEndNumber(res.data.data.nextEndNumber);
        if (!silent) {
          showToast(
            `Loaded next available serial range: ${res.data.data.firstSerial} to ${res.data.data.lastSerial}`,
            'success'
          );
        }
      }
    } catch {}
  };

  // Initial mount: load next available conflict-free range from database
  useEffect(() => {
    fetchNextAvailableRange('VS', 100, true);
  }, []);

  // Quick Preset Helper
  const handleSetQuickCount = (count) => {
    const start = parseInt(startNumber, 10) || 1;
    setEndNumber(start + count - 1);
  };

  // 1. Calculate and Pre-Check Batch Range on Change
  useEffect(() => {
    if (activeTab !== 'BATCH') return;

    const start = parseInt(startNumber, 10);
    const end = parseInt(endNumber, 10);

    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    const count = end - start + 1;
    const clientFirstSerial = `${prefix}${String(start).padStart(paddingLength, '0')}`;
    const clientLastSerial = `${prefix}${String(end).padStart(paddingLength, '0')}`;

    // Set immediate client-side preview
    setPreviewData({
      totalCount: count,
      firstSerial: clientFirstSerial,
      lastSerial: clientLastSerial,
      duplicateCount: 0,
      duplicates: [],
      isValid: true,
    });
    setPreviewError(null);

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await api.post('/cards/preview-batch', {
          prefix,
          startNumber: start,
          endNumber: end,
          paddingLength,
        });
        if (res.data?.data) {
          setPreviewData(res.data.data);
          setPreviewError(null);
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message;
        if (errorMsg) {
          setPreviewError(errorMsg);
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [prefix, startNumber, endNumber, paddingLength, activeTab]);


  // 2. Handle Batch Stock Submission
  const handleBatchSubmit = async (e) => {
    e.preventDefault();

    const start = parseInt(startNumber, 10);
    const end = parseInt(endNumber, 10);

    if (isNaN(start) || isNaN(end) || start <= 0 || start > end) {
      showToast('Please enter a valid starting and ending serial number range.', 'error');
      return;
    }

    if (previewData && !previewData.isValid) {
      showToast(
        `Cannot proceed: ${previewData.duplicateCount} serial numbers in this range already exist!`,
        'error'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/cards/batch', {
        prefix,
        startNumber: start,
        endNumber: end,
        paddingLength,
        notes: batchNotes,
      });

      showToast(
        `Success! ${res.data?.data?.totalCreated} cards generated in Batch ${res.data?.data?.batchId}`,
        'success'
      );
      navigate('/cards');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create card batch.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Manual List Submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();

    const rawList = manualText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawList.length === 0) {
      showToast('Please enter at least one serial number.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/cards/manual', {
        serialNumbers: rawList,
        notes: manualNotes,
      });

      showToast(`Success! Added ${res.data?.data?.totalCreated} physical cards.`, 'success');
      navigate('/cards');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add manual cards.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatedTotal =
    !isNaN(parseInt(startNumber, 10)) && !isNaN(parseInt(endNumber, 10)) && parseInt(endNumber, 10) >= parseInt(startNumber, 10)
      ? parseInt(endNumber, 10) - parseInt(startNumber, 10) + 1
      : 0;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <Link to="/cards" className="page-header-back-btn" title="Back to Inventory">
            <ArrowLeft size={18} />
          </Link>
          <div className="page-header-text">
            <h1 className="page-title">
              Add Cards Stock Entry
            </h1>
            <p className="page-subtitle">
              Digitally register new Vidhyut Saathi physical cards with automated uniqueness validation
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('BATCH')}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: activeTab === 'BATCH' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'BATCH' ? '#0284C7' : '#64748B',
            fontWeight: activeTab === 'BATCH' ? '700' : '500',
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: activeTab === 'BATCH' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={16} />
          <span>Batch Serial Range (Continuous Series)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MANUAL')}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: activeTab === 'MANUAL' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'MANUAL' ? '#0284C7' : '#64748B',
            fontWeight: activeTab === 'MANUAL' ? '700' : '500',
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: activeTab === 'MANUAL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <ListPlus size={16} />
          <span>Manual Serial List (Individual Entries)</span>
        </button>
      </div>

      {/* TAB 1: BATCH RANGE GENERATION */}
      {activeTab === 'BATCH' && (
        <form onSubmit={handleBatchSubmit}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
                1. Serial Number Range Parameters
              </h2>
              <button
                type="button"
                onClick={() => fetchNextAvailableRange(prefix, 100, false)}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', fontWeight: 600 }}
              >
                <Sparkles size={14} color="#0284c7" />
                <span>Auto-Suggest Next Range (100 Cards)</span>
              </button>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Define the serial prefix and starting/ending serial indices to create a continuous block of cards (up to 20,000 cards per batch).
            </p>

            {/* Quick Batch Size Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                QUICK BATCH SIZES:
              </span>
              {[100, 500, 1000, 2500, 5000, 10000].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuickCount(qty)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #BAE6FD',
                    backgroundColor: calculatedTotal === qty ? '#0284C7' : '#F0F9FF',
                    color: calculatedTotal === qty ? '#FFFFFF' : '#0284C7',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  +{qty.toLocaleString()} Cards
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Serial Prefix <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. VS"
                  maxLength={6}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Zero-Padding Digits
                </label>
                <select
                  className="select"
                  value={paddingLength}
                  onChange={(e) => setPaddingLength(parseInt(e.target.value, 10))}
                >
                  <option value={4}>4 Digits (e.g. VS0001)</option>
                  <option value={6}>6 Digits (e.g. VS000001 - Standard)</option>
                  <option value={8}>8 Digits (e.g. VS00000001)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Starting Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  min={1}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Ending Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={endNumber}
                  onChange={(e) => setEndNumber(e.target.value)}
                  min={startNumber || 1}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Batch Notes / Packaging Reference
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Factory Batch Oct-2026 Box 1"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Real-time Calculation & Pre-validation Preview Box */}
          <div
            className="card"
            style={{
              marginBottom: '24px',
              backgroundColor: previewData?.isValid ? '#F0FDF4' : previewData ? '#FEF2F2' : '#F8FAFC',
              border: `1px solid ${
                previewData?.isValid ? '#BBF7D0' : previewData ? '#FECACA' : 'var(--border-color)'
              }`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {previewLoading ? (
                  <RefreshCw size={18} className="animate-spin" color="#0284c7" />
                ) : previewData?.isValid ? (
                  <CheckCircle2 size={18} color="#16A34A" />
                ) : (
                  <AlertCircle size={18} color="#DC2626" />
                )}
                <span style={{ fontSize: '14px', fontWeight: '700' }}>
                  Batch Validation & Inventory Preview
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                }}
              >
                {calculatedTotal} Cards
              </div>
            </div>

            {previewError ? (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: '6px',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="#DC2626" />
                <span>{previewError}</span>
              </div>
            ) : previewData ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>First Serial: </span>
                    <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{previewData.firstSerial}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Last Serial: </span>
                    <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{previewData.lastSerial}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Initial Ownership: </span>
                    <strong>Vidhyut Saathi HQ</strong>
                  </div>
                </div>

                {previewData.isValid ? (
                  <div style={{ fontSize: '12.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={15} /> All {previewData.totalCount} serial numbers are unique and available to create.
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#DC2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} /> Conflict: {previewData.duplicateCount} cards in this range ALREADY EXIST in MongoDB!
                    </div>
                    <div style={{ fontSize: '12px', color: '#991B1B', fontFamily: 'monospace', marginBottom: '12px' }}>
                      Duplicates: {previewData.duplicates.slice(0, 10).join(', ')}
                      {previewData.duplicates.length > 10 && ` (+${previewData.duplicates.length - 10} more)`}
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchNextAvailableRange(prefix, calculatedTotal > 0 ? calculatedTotal : 100, false)}
                      className="btn btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: '#DC2626',
                        borderColor: '#DC2626',
                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                      }}
                    >
                      <Sparkles size={15} />
                      <span>Auto-Fix: Jump to Next Conflict-Free Serial Range</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Enter valid starting and ending indices above to calculate preview.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link to="/cards" className="btn btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !previewData?.isValid || calculatedTotal <= 0}
            >
              {loading ? (
                <span>Generating {calculatedTotal} Cards...</span>
              ) : (
                <span>Confirm & Create {calculatedTotal} Cards</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MANUAL SERIAL LIST ENTRY */}
      {activeTab === 'MANUAL' && (
        <form onSubmit={handleManualSubmit}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
              Manual Serial Numbers List
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Enter or paste individual serial numbers separated by new lines or commas (e.g. VS000101, VS000105, VS000109).
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Serial Numbers (One per line or comma-separated) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="input"
                style={{
                  minHeight: '180px',
                  fontFamily: 'monospace',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  padding: '12px',
                }}
                placeholder="VS000101&#10;VS000102&#10;VS000105"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Notes / Reference
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Manual replacement stock"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link to="/cards" className="btn btn-outline">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading || !manualText.trim()}>
              {loading ? <span>Adding Cards...</span> : <span>Add Cards to Stock</span>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddCardsPage;
