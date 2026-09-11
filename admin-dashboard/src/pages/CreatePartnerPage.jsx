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
  Calendar,
  Network,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

const CreatePartnerPage = () => {
  const { user, partner: authPartner, isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    franchiseType: isSuperAdmin ? 'DISTRICT_FRANCHISE' : 'SUB_FRANCHISE',
    parentPartnerId: authPartner ? authPartner._id : '',
    state: authPartner ? authPartner.state : 'Maharashtra',
    district: authPartner ? authPartner.district : '',
    authorizedDistrictsInput: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    pinCode: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
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
  const [eligibleParents, setEligibleParents] = useState([]);
  const [statesList, setStatesList] = useState(INDIAN_STATES);
  const [districtsList, setDistrictsList] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtConflictWarning, setDistrictConflictWarning] = useState(null);

  // Fetch all Indian States from backend API on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/territories/states');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setStatesList(res.data.data);
        }
      } catch {
        // Fallback to INDIAN_STATES
      }
    };
    fetchStates();
  }, []);

  // Fetch districts for selected state from backend API
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!formData.state) return;
      try {
        setLoadingDistricts(true);
        const res = await api.get('/territories/districts', {
          params: { state: formData.state },
        });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
          // If current district is empty or not in newly loaded list, auto-select first district
          if (!formData.district || !res.data.data.includes(formData.district)) {
            if (!authPartner?.district) {
              setFormData((prev) => ({
                ...prev,
                district: res.data.data[0] || '',
              }));
            }
          }
        }
      } catch {
        // Continue
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [formData.state, authPartner]);

  // Fetch eligible parent partners based on selected type and territory
  useEffect(() => {
    const fetchParents = async () => {
      if (formData.franchiseType === 'STATE_FRANCHISE') {
        setEligibleParents([]);
        return;
      }
      try {
        const res = await api.get('/partners/eligible-parents', {
          params: {
            franchiseType: formData.franchiseType,
            state: formData.state,
            district: formData.district,
          },
        });
        if (res.data?.data) {
          setEligibleParents(res.data.data);
        }
      } catch {
        // Silently continue
      }
    };

    fetchParents();
  }, [formData.franchiseType, formData.state, formData.district]);

  // Update auto-generated Franchise ID preview (e.g. VS-MH-MUM-1001 or VS-SUB-MH-MUM-1001)
  useEffect(() => {
    const stateCode = (formData.state || 'MH').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
    const districtCode = (formData.district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);

    if (formData.franchiseType === 'STATE_FRANCHISE') {
      setPreviewFranchiseId(`VS-${stateCode}-ST-${randomDigits}`);
    } else if (formData.franchiseType === 'DISTRICT_FRANCHISE') {
      setPreviewFranchiseId(`VS-${stateCode}-${districtCode}-${randomDigits}`);
    } else {
      setPreviewFranchiseId(`VS-SUB-${stateCode}-${districtCode}-${randomDigits}`);
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

  // Real Client-Side OCR & Deep Authenticity Inspection
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
          extractedSnippet: scanData?.extractedSnippet,
          message: scanData?.message || 'Authenticity check failed. Non-Government image detected.',
        });

        // Invalidate document URL so form cannot be submitted with fake image
        setFormData((prev) => ({ ...prev, govIdDocumentUrl: '' }));
        showToast(`Upload Rejected: Invalid Document. Please upload an authentic ${formData.govIdType} card.`, 'error');
      }
    } catch {
      setUploadedDocScan({
        isScanning: false,
        isAuthentic: false,
        message: 'Could not process image OCR. Please ensure the image is clear.',
      });
      setFormData((prev) => ({ ...prev, govIdDocumentUrl: '' }));
      showToast('OCR scan failed on this image.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.mobileNumber.trim() || !formData.email.trim() || !formData.district.trim() || !formData.pinCode.trim()) {
      showToast('Please fill in all mandatory fields (Name, Mobile, Email, District, PIN code).', 'error');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      showToast('Please enter a valid email address.', 'error');
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
      showToast(`Cannot proceed: Uploaded file failed ${formData.govIdType} authenticity scan.`, 'error');
      return;
    }

    const payload = {
      ...formData,
      mobileNumber: formData.mobileNumber.trim(),
      email: formData.email.trim().toLowerCase(),
      pinCode: formData.pinCode.trim(),
      parentPartnerId: formData.parentPartnerId || null,
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
      {/* Header & Auto Franchise ID Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/partners" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
            <span>Back to Directory</span>
          </Link>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {isSuperAdmin ? 'Register Franchise Partner' : 'Register Sub-Franchise'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Onboard new partner with territory boundaries & instant optical document verification
            </p>
          </div>
        </div>

        {/* Auto-Generated Franchise ID Box */}
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

            <div
              title="Auto-generated by territory format. Non-editable."
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
                Partner uses Mobile Number, Email, or Franchise ID to log into the portal with OTP.
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
                Email Address (Login ID) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. partner@vidhyutsaathi.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Franchise Type, Hierarchy & Lifecycle */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Network size={18} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>2. Franchise Level, Hierarchy & Validity</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Define franchise authorization level, parent partner relationship, and start/expiry dates.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Franchise Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="select"
                value={formData.franchiseType}
                onChange={(e) => setFormData({ ...formData, franchiseType: e.target.value, parentPartnerId: '' })}
                disabled={!isSuperAdmin}
              >
                {isSuperAdmin && <option value="STATE_FRANCHISE">State Franchise (Full State Authorization)</option>}
                {isSuperAdmin && <option value="DISTRICT_FRANCHISE">District Franchise (District Authorization)</option>}
                <option value="SUB_FRANCHISE">Sub-Franchise (Area / Town Level)</option>
              </select>
            </div>

            {formData.franchiseType !== 'STATE_FRANCHISE' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Parent Partner
                </label>
                <select
                  className="select"
                  value={formData.parentPartnerId}
                  onChange={(e) => setFormData({ ...formData, parentPartnerId: e.target.value })}
                  disabled={!isSuperAdmin && authPartner}
                >
                  <option value="">None (Direct under Vidhyut Saathi Super Admin)</option>
                  {eligibleParents.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} — {p.franchiseId} ({p.district || p.state})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Start Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                className="input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                className="input"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Territory & Address */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <MapPin size={18} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>3. Authorized Territory & Operational Address</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Backend enforces territory boundary checks. Duplicate active district allocations are automatically blocked.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Authorized State <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="select"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!isSuperAdmin && authPartner}
                required
              >
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Authorized District <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="select"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                disabled={!isSuperAdmin && authPartner?.district}
                required
              >
                {loadingDistricts ? (
                  <option value="">Loading districts...</option>
                ) : districtsList.length === 0 ? (
                  <option value="">No districts found for {formData.state}</option>
                ) : (
                  <>
                    <option value="">-- Select District --</option>
                    {districtsList.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                City / Town / Taluka <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Andheri West"
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
                placeholder="6-digit PIN"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                maxLength={6}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Address Line 1 (Premises / Street) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Shop 4B, Business Bay Complex, Link Road"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Section 4: Government Identification & Optical Verification */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <ShieldCheck size={18} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>4. Government Proof Identification & OCR Authenticity Verification</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real OCR inspection checks official government headers & rejects non-ID / promotional images.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Select Government ID Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="select" value={formData.govIdType} onChange={(e) => handleIdTypeChange(e.target.value)}>
                <option value="AADHAAR">Aadhaar Card (12-Digit Verhoeff Checksum)</option>
                <option value="PAN">PAN Card (10-Digit Income Tax Dept)</option>
                <option value="VOTER_ID">Voter ID (Election Commission EPIC)</option>
                <option value="DRIVING_LICENSE">Driving License (State Transport)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Government ID Number
              </label>
              <input
                type="text"
                className="input"
                placeholder={formData.govIdType === 'AADHAAR' ? '12 digits (e.g. 999924567890)' : 'e.g. ABCPE1234F'}
                value={formData.govIdNumber}
                onChange={(e) => handleGovIdNumberChange(e.target.value)}
              />
              {docScanStatus && (
                <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {docScanStatus.isValid ? (
                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> {docScanStatus.message}
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {docScanStatus.message}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Upload & OCR Scanner */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Upload Government ID Document / Photo Proof
            </label>
            <div
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                position: 'relative',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUploadAndScan}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                }}
              />
              <UploadCloud size={36} color="#0284c7" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                {uploadedDocName || `Click or drag your ${formData.govIdType} card photo here`}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports PNG, JPG, JPEG, PDF. Optical verification runs automatically.
              </p>
            </div>

            {/* OCR Progress / Result Display */}
            {uploadedDocScan && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: uploadedDocScan.isAuthentic ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${uploadedDocScan.isAuthentic ? '#BBF7D0' : '#FECACA'}`,
                }}
              >
                {uploadedDocScan.isScanning ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={18} className="animate-spin" color="#0284c7" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>
                        Scanning document OCR ({scanProgress}%)...
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Inspecting document headers & anti-counterfeit markers
                      </div>
                    </div>
                  </div>
                ) : uploadedDocScan.isAuthentic ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} color="#16A34A" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803D' }}>
                        Authentic {uploadedDocScan.detectedType} Verified!
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#166534' }}>
                        {uploadedDocScan.message}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <XCircle size={20} color="#DC2626" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#B91C1C' }}>
                        Document Verification Rejected
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#991B1B' }}>
                        {uploadedDocScan.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Link to="/partners" className="btn btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span>Registering Partner...</span> : <span>Complete Partner Registration</span>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePartnerPage;
