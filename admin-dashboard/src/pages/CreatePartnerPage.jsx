import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Building2,
  User,
  ShieldCheck,
  UploadCloud,
  FileText,
  ScanLine,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

const CreatePartnerPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    franchiseType: 'DISTRICT_FRANCHISE',
    state: 'Maharashtra',
    district: '',
    authorizedDistrictsInput: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    pinCode: '',
    notes: '',
    // Gov ID Fields
    govIdType: 'AADHAAR',
    govIdNumber: '',
    govIdDocumentUrl: '',
    // Additional Documents
    hasGST: false,
    gstNumber: '',
  });

  const [previewFranchiseId, setPreviewFranchiseId] = useState('VS-MH-MUM-1001');
  const [copied, setCopied] = useState(false);
  const [docScanStatus, setDocScanStatus] = useState(null);
  const [uploadedDocScan, setUploadedDocScan] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [uploadedDocPreview, setUploadedDocPreview] = useState(null);
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Update auto-generated Franchise ID preview (Simple & clean: e.g. VS-MH-MUM-1001)
  useEffect(() => {
    const stateCode = (formData.state || 'MH').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
    const districtCode = (formData.district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);

    if (formData.franchiseType === 'STATE_FRANCHISE') {
      setPreviewFranchiseId(`VS-${stateCode}-ST-${randomDigits}`);
    } else {
      setPreviewFranchiseId(`VS-${stateCode}-${districtCode}-${randomDigits}`);
    }
  }, [formData.franchiseType, formData.state, formData.district]);

  // Copy Franchise ID to clipboard
  const handleCopyFranchiseId = () => {
    navigator.clipboard.writeText(previewFranchiseId);
    setCopied(true);
    showToast(`Franchise ID "${previewFranchiseId}" copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Live Government ID Format Validator (Number Checksum & Structure)
  const handleVerifyGovIdLive = async (idType, idNumber) => {
    if (!idNumber || idNumber.trim().length < 4) {
      setDocScanStatus(null);
      return;
    }

    setDocScanStatus({ isScanning: true });

    try {
      const res = await api.post('/partners/verify-gov-id', {
        idType,
        idNumber: idNumber.trim(),
      });

      if (res.data?.data) {
        setDocScanStatus({
          isScanning: false,
          isValid: res.data.data.isValid,
          message: res.data.data.message,
          maskedId: res.data.data.masked,
          entityType: res.data.data.entityType,
        });
      }
    } catch {
      setDocScanStatus({
        isScanning: false,
        isValid: false,
        message: 'Could not verify document format.',
      });
    }
  };

  const handleGovIdNumberChange = (val) => {
    setFormData((prev) => ({ ...prev, govIdNumber: val }));
    handleVerifyGovIdLive(formData.govIdType, val);
  };

  const resetFileUpload = () => {
    setUploadedDocScan(null);
    setUploadedDocName('');
    setUploadedDocPreview(null);
    setFormData((prev) => ({ ...prev, govIdDocumentUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleIdTypeChange = (val) => {
    setFormData((prev) => ({ ...prev, govIdType: val }));
    if (formData.govIdNumber) {
      handleVerifyGovIdLive(val, formData.govIdNumber);
    }
    resetFileUpload();
  };

  // REAL Client-Side OCR & Deep Authenticity Inspection
  const handleFileUploadAndScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedDocName(file.name);
    setUploadedDocScan({ isScanning: true });
    setScanProgress(10);

    // Show image preview thumbnail
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedDocPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedDocPreview(null);
    }

    try {
      let extractedOcrText = '';

      // Run actual OCR on the image
      if (file.type.startsWith('image/')) {
        const ocrResult = await Tesseract.recognize(file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text' && m.progress) {
              setScanProgress(Math.round(m.progress * 85));
            }
          },
        });
        extractedOcrText = ocrResult.data.text || '';
      }

      setScanProgress(95);

      // Send the REAL OCR extracted text to backend scanner
      const res = await api.post('/partners/scan-document', {
        docType: formData.govIdType,
        extractedText: extractedOcrText,
        fileMeta: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });

      const scanData = res.data?.data;
      setScanProgress(100);

      if (scanData?.isAuthentic) {
        setUploadedDocScan({
          isScanning: false,
          isAuthentic: true,
          confidence: scanData.confidence,
          detectedType: scanData.detectedType,
          matchedMarkers: scanData.matchedMarkers,
          extractedSnippet: scanData.extractedSnippet,
          message: scanData.message,
        });

        // Auto-fill ID number if detected by OCR and box is empty
        if (scanData.extractedIdNumbers?.length > 0 && !formData.govIdNumber) {
          const detectedNum = scanData.extractedIdNumbers[0];
          setFormData((prev) => ({ ...prev, govIdNumber: detectedNum }));
          handleVerifyGovIdLive(formData.govIdType, detectedNum);
        }

        setFormData((prev) => ({
          ...prev,
          govIdDocumentUrl: `https://storage.vidhyutsaathi.com/docs/${Date.now()}_${file.name}`,
        }));

        showToast(`Document scan passed: Authentic ${scanData.detectedType} verified!`, 'success');
      } else {
        // Document REJECTED
        setUploadedDocScan({
          isScanning: false,
          isAuthentic: false,
          confidence: 0,
          extractedSnippet: scanData.extractedSnippet,
          message: scanData.message || 'Authenticity check failed. Non-Government image detected.',
        });

        // Invalidate document URL so form cannot be submitted with fake image
        setFormData((prev) => ({ ...prev, govIdDocumentUrl: '' }));
        showToast(`Upload Rejected: Invalid / Non-Government Document. Please choose your authentic ${formData.govIdType} card.`, 'error');
      }
    } catch (err) {
      setUploadedDocScan({
        isScanning: false,
        isAuthentic: false,
        message: 'Could not process image OCR. Please ensure the image is clear and not corrupt.',
      });
      setFormData((prev) => ({ ...prev, govIdDocumentUrl: '' }));
      showToast('OCR scan failed on this image.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.mobileNumber.trim() || !formData.district.trim() || !formData.pinCode.trim()) {
      showToast('Please fill in all mandatory fields.', 'error');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    if (!/^\d{6}$/.test(formData.pinCode.trim())) {
      showToast('PIN code must be a 6-digit number.', 'error');
      return;
    }

    // Check Government ID number verification
    if (formData.govIdNumber && docScanStatus && !docScanStatus.isValid) {
      showToast(`Invalid ${formData.govIdType} format: ${docScanStatus.message}`, 'error');
      return;
    }

    // Check Uploaded Document Authenticity
    if (uploadedDocName && uploadedDocScan && !uploadedDocScan.isAuthentic) {
      showToast(`Cannot proceed: The uploaded file failed ${formData.govIdType} authenticity scanning. Please upload a real government ID photo.`, 'error');
      return;
    }

    const payload = {
      ...formData,
      mobileNumber: formData.mobileNumber.trim(),
      pinCode: formData.pinCode.trim(),
      authorizedDistricts: formData.franchiseType === 'STATE_FRANCHISE' && formData.authorizedDistrictsInput
        ? formData.authorizedDistrictsInput.split(',').map((d) => d.trim()).filter(Boolean)
        : [],
      otherDocuments: [
        ...(formData.govIdDocumentUrl ? [{
          name: `${formData.govIdType} Verified Document Proof`,
          docType: 'ADDRESS_PROOF',
          fileUrl: formData.govIdDocumentUrl,
        }] : []),
        ...(formData.gstNumber ? [{
          name: `GST Certificate (${formData.gstNumber})`,
          docType: 'GST_CERTIFICATE',
          fileUrl: `https://storage.vidhyutsaathi.com/docs/gst_${formData.gstNumber}.pdf`,
        }] : []),
      ],
    };

    try {
      setLoading(true);
      const res = await api.post('/partners', payload);
      showToast(`Franchise Partner registered! Franchise ID: ${res.data?.data?.franchiseId}`, 'success');
      navigate(`/partners/${res.data?.data?._id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register franchise partner.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto' }}>
      {/* Header & Locked Franchise ID Badge with One-Click Copy Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/partners" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
            <span>Back to Directory</span>
          </Link>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Add Franchise Partner
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Register & verify new State or District Franchise Partner with optical document verification
            </p>
          </div>
        </div>

        {/* Auto-Generated Franchise ID Box with Copy Button */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.8px' }}>
              AUTO-GENERATED FRANCHISE ID
            </div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#38BDF8', letterSpacing: '1px' }}>
              {previewFranchiseId}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyFranchiseId}
              title="Copy Franchise ID to clipboard"
              style={{
                background: copied ? '#16A34A' : 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 10px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Locked Icon */}
            <div
              title="Auto-generated by system based on territory. Non-editable placeholder."
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
              }}
            >
              <Lock size={15} />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Partner Identity & Login Information */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <User size={18} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>1. Partner Identity & Login Information</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Partner can use Mobile Number, Email, or Franchise ID to log into the mobile app & web portal.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Abhishek Deshmukh"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Registered Mobile Number (OTP Login) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                className="input"
                placeholder="10-digit mobile (e.g. 9820123456)"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                maxLength={10}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Email Address (Optional Login ID)
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. partner@vidhyutsaathi.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Franchise Level & Territory */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Building2 size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>2. Franchise Level & Authorized Territory</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Franchise Level <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="select"
                value={formData.franchiseType}
                onChange={(e) => setFormData({ ...formData, franchiseType: e.target.value })}
              >
                <option value="DISTRICT_FRANCHISE">District Franchise Partner</option>
                <option value="STATE_FRANCHISE">State Franchise Partner</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Authorized State <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="select"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Authorized District <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mumbai, Pune, Nagpur"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.franchiseType === 'STATE_FRANCHISE' && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Additional Authorized Districts (Comma Separated)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mumbai, Thane, Pune, Nashik"
                value={formData.authorizedDistrictsInput}
                onChange={(e) => setFormData({ ...formData, authorizedDistrictsInput: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Section 3: Government ID Proof & Real-Time OCR Authenticity Scanner */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#0284c7" />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700' }}>3. Government ID Proof & Authenticity Verification</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Optical character recognition (OCR) scans the image for genuine UIDAI / Income Tax authority text.
                </p>
              </div>
            </div>

            {uploadedDocScan && !uploadedDocScan.isScanning && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: uploadedDocScan.isAuthentic ? '#DCFCE7' : '#FEE2E2',
                  color: uploadedDocScan.isAuthentic ? '#15803D' : '#B91C1C',
                }}
              >
                {uploadedDocScan.isAuthentic ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                <span>{uploadedDocScan.isAuthentic ? 'Authentic Document Passed' : 'Fake / Invalid File Rejected'}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Select Government ID Type
              </label>
              <select
                className="select"
                value={formData.govIdType}
                onChange={(e) => handleIdTypeChange(e.target.value)}
              >
                <option value="AADHAAR">Aadhaar Card (12 Digits - UIDAI)</option>
                <option value="PAN">PAN Card (10 Alphanumeric - Income Tax Dept)</option>
                <option value="VOTER_ID">Voter ID (EPIC - Election Commission)</option>
                <option value="DRIVING_LICENSE">Driving License (State Transport)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                {formData.govIdType === 'AADHAAR' ? 'Aadhaar Number (12 Digits)' : formData.govIdType === 'PAN' ? 'PAN Number (e.g. ABCDE1234F)' : 'Government ID Number'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  placeholder={
                    formData.govIdType === 'AADHAAR'
                      ? 'e.g. 5489 1234 5678'
                      : formData.govIdType === 'PAN'
                      ? 'e.g. ABCDE1234F'
                      : 'Enter ID Number'
                  }
                  value={formData.govIdNumber}
                  onChange={(e) => handleGovIdNumberChange(e.target.value)}
                />
                <ScanLine
                  size={18}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>
          </div>

          {/* Number Checksum / Format Feedback */}
          {docScanStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: docScanStatus.isValid ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${docScanStatus.isValid ? '#BBF7D0' : '#FECACA'}`,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: docScanStatus.isValid ? '#166534' : '#991B1B',
              }}
            >
              {docScanStatus.isValid ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertCircle size={16} color="#DC2626" />}
              <span>{docScanStatus.message}</span>
            </div>
          )}

          {/* Document File Upload & Real OCR Scanner */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Upload Government ID Document (Photo / Scan / PDF) <span style={{ color: '#dc2626' }}>*</span>
            </label>

            <div
              style={{
                border: uploadedDocScan
                  ? uploadedDocScan.isAuthentic
                    ? '2px solid #86EFAC'
                    : '2px solid #F87171'
                  : '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: uploadedDocScan
                  ? uploadedDocScan.isAuthentic
                    ? '#F0FDF4'
                    : '#FEF2F2'
                  : '#F8FAFC',
                transition: 'all 0.2s ease',
              }}
            >
              {uploadedDocScan?.isScanning ? (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <RefreshCw size={34} color="#0284c7" className="animate-spin" />
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0369A1' }}>
                    Reading & scanning image text ({scanProgress}%)...
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Performing OCR recognition to verify official UIDAI / Income Tax department text inside this file
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud size={32} color={uploadedDocScan ? (uploadedDocScan.isAuthentic ? '#16A34A' : '#DC2626') : '#0284C7'} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {uploadedDocName ? `Selected File: ${uploadedDocName}` : `Choose ${formData.govIdType} File to Scan`}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    The system reads the text inside the image. Posters, memes, and non-ID images will be strictly rejected.
                  </p>

                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUploadAndScan}
                      style={{ fontSize: '12.5px' }}
                    />

                    {uploadedDocName && (
                      <button
                        type="button"
                        onClick={resetFileUpload}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px' }}
                      >
                        <RotateCcw size={13} />
                        <span>Re-upload</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Scan Authenticity Banner */}
              {uploadedDocScan && !uploadedDocScan.isScanning && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: uploadedDocScan.isAuthentic ? '#DCFCE7' : '#FEE2E2',
                    border: `1.5px solid ${uploadedDocScan.isAuthentic ? '#86EFAC' : '#FCA5A5'}`,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  {uploadedDocScan.isAuthentic ? (
                    <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <XCircle size={22} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: uploadedDocScan.isAuthentic ? '#166534' : '#991B1B' }}>
                      {uploadedDocScan.isAuthentic
                        ? `Government ID Verified (${uploadedDocScan.confidence}% Authenticity Confidence)`
                        : 'Upload Rejected: Invalid Document / Non-Government File'}
                    </div>
                    <div style={{ fontSize: '12px', color: uploadedDocScan.isAuthentic ? '#15803D' : '#B91C1C', marginTop: '4px', lineHeight: 1.4 }}>
                      {uploadedDocScan.message}
                    </div>

                    {!uploadedDocScan.isAuthentic && (
                      <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #FECACA' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#991B1B' }}>Action Required:</span>
                        <span style={{ fontSize: '11.5px', color: '#B91C1C', marginLeft: '4px' }}>
                          Please click "Choose File" above to select and upload your genuine {formData.govIdType} card.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Thumbnail Preview */}
              {uploadedDocPreview && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <img
                    src={uploadedDocPreview}
                    alt="Document Preview"
                    style={{
                      maxHeight: '150px',
                      maxWidth: '240px',
                      borderRadius: '8px',
                      border: uploadedDocScan?.isAuthentic ? '2px solid #86EFAC' : '2px solid #FCA5A5',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Operating Address & Other Documents */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <MapPin size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>4. Operating Address & Business Proofs</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                City / Town <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Andheri East"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                PIN Code <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="6-digit PIN code (e.g. 400069)"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                maxLength={6}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                GST Number (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Address Line 1 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Shop/Office No., Building Name, Commercial Street"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              className="input"
              placeholder="Landmark, Area, Sector"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Administrative Notes
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Onboarding agreement reference, deposit details, notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
          <Link to="/partners" className="btn btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '15px' }}
            disabled={loading || (uploadedDocScan && !uploadedDocScan.isAuthentic)}
          >
            {loading ? (
              <span>Registering & Verifying...</span>
            ) : (
              <>
                <FileCheck2 size={18} />
                <span>Create & Authorize Partner</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePartnerPage;
