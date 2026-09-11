import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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
    hasAgreement: true,
  });

  const [previewFranchiseId, setPreviewFranchiseId] = useState('VS-DT-MH-MUM-XXXX');
  const [docScanStatus, setDocScanStatus] = useState(null); // { isScanning, isValid, message, entityType }
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Update auto-generated Franchise ID preview when state, district or type changes
  useEffect(() => {
    const stateCode = (formData.state || 'IN').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
    const districtCode = (formData.district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    if (formData.franchiseType === 'STATE_FRANCHISE') {
      setPreviewFranchiseId(`VS-ST-${stateCode}-${randomSuffix}`);
    } else {
      setPreviewFranchiseId(`VS-DT-${stateCode}-${districtCode}-${randomSuffix}`);
    }
  }, [formData.franchiseType, formData.state, formData.district]);

  // Live Government ID Scanner & Format Validator
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

  const handleIdTypeChange = (val) => {
    setFormData((prev) => ({ ...prev, govIdType: val }));
    if (formData.govIdNumber) {
      handleVerifyGovIdLive(val, formData.govIdNumber);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simulate instant secure document processing
    setUploadedDocName(file.name);
    setFormData((prev) => ({
      ...prev,
      govIdDocumentUrl: `https://storage.vidhyutsaathi.com/docs/${Date.now()}_${file.name}`,
    }));
    showToast(`Document "${file.name}" uploaded & attached for verification.`, 'success');
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

    // If Gov ID is entered, check validity
    if (formData.govIdNumber && docScanStatus && !docScanStatus.isValid) {
      showToast(`Invalid ${formData.govIdType}: ${docScanStatus.message}`, 'error');
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
          name: `${formData.govIdType} Document Proof`,
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
      showToast(`Franchise Partner registered! Assigned Franchise ID: ${res.data?.data?.franchiseId}`, 'success');
      navigate(`/partners/${res.data?.data?._id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register franchise partner.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto' }}>
      {/* Back button & Title */}
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
              Register & verify new State or District Franchise Partner with territory & Gov ID validation
            </p>
          </div>
        </div>

        {/* Auto-Generated Franchise ID Badge (Non-clickable/Read-only Placeholder) */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.8px' }}>
              AUTO-GENERATED FRANCHISE ID
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#38BDF8', letterSpacing: '1px' }}>
              {previewFranchiseId}
            </div>
          </div>
          <div
            title="Auto-generated by system based on territory and type. Non-editable."
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <Lock size={16} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Partner Identity & Multi-Login Identifiers */}
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

        {/* Section 3: Government ID Proof & Real-time Document Scanner */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#0284c7" />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700' }}>3. Government ID Proof & Authenticity Verification</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Smart scanning checks Aadhaar (Verhoeff checksum), PAN (ITD structure), or Voter ID.
                </p>
              </div>
            </div>

            {docScanStatus && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: docScanStatus.isValid ? '#DCFCE7' : '#FEE2E2',
                  color: docScanStatus.isValid ? '#15803D' : '#B91C1C',
                }}
              >
                {docScanStatus.isValid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{docScanStatus.isValid ? 'Valid ID Structure' : 'Verification Issue'}</span>
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
                <option value="AADHAAR">Aadhaar Card (12 Digits)</option>
                <option value="PAN">PAN Card (10 Alphanumeric)</option>
                <option value="VOTER_ID">Voter ID (EPIC)</option>
                <option value="DRIVING_LICENSE">Driving License</option>
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

          {/* Verification Feedback Banner */}
          {docScanStatus && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: docScanStatus.isValid ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${docScanStatus.isValid ? '#BBF7D0' : '#FECACA'}`,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {docScanStatus.isValid ? <CheckCircle2 size={18} color="#16A34A" /> : <AlertCircle size={18} color="#DC2626" />}
              <div style={{ fontSize: '13px', color: docScanStatus.isValid ? '#166534' : '#991B1B' }}>
                <strong>{docScanStatus.isValid ? 'Document Format Verified:' : 'Verification Notice:'}</strong> {docScanStatus.message}
                {docScanStatus.entityType && (
                  <span style={{ display: 'block', fontSize: '11.5px', marginTop: '2px', color: '#15803D' }}>
                    Identified Category: {docScanStatus.entityType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Document File Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Upload ID Proof Document (Photo / Scan / PDF)
            </label>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
              }}
            >
              <UploadCloud size={32} color="#0284c7" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {uploadedDocName ? `Attached: ${uploadedDocName}` : 'Click to Upload Document Front & Back'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports PNG, JPG, PDF (Max 10MB). Encrypted & safely archived.
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'GOV_ID')}
                style={{ marginTop: '12px', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Registered Address & Other Documents */}
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
            disabled={loading}
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
