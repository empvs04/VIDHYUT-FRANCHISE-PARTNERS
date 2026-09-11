import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle2, MapPin, Building2, User } from 'lucide-react';
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
  });

  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();
  const navigate = useNavigate();

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

    const payload = {
      ...formData,
      mobileNumber: formData.mobileNumber.trim(),
      pinCode: formData.pinCode.trim(),
      authorizedDistricts: formData.franchiseType === 'STATE_FRANCHISE' && formData.authorizedDistrictsInput
        ? formData.authorizedDistrictsInput.split(',').map((d) => d.trim()).filter(Boolean)
        : [],
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
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Back button & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link to="/partners" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Partners</span>
        </Link>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Register New Franchise Partner
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Create an authorized State or District Franchise Partner profile
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Partner Identity */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <User size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>1. Partner Identity & Contact</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '16px' }}>
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
                Mobile Number (for OTP Login) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                className="input"
                placeholder="10-digit mobile number (e.g. 9820123456)"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                maxLength={10}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Email Address (Optional)
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

        {/* Section 2: Franchise Type & Authorized Territory */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Building2 size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>2. Franchise Type & Authorized Territory</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '16px' }}>
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
                Primary Authorized District <span style={{ color: '#dc2626' }}>*</span>
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
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Leave blank if authorized across the entire state.
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Registered Address */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <MapPin size={18} color="#0284c7" />
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>3. Registered Office / Operating Address</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '16px' }}>
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Address Line 1 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Shop/Office No., Building Name, Street"
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
              placeholder="Internal onboarding notes, agreement references..."
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
            style={{ padding: '12px 24px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? (
              <span>Registering Partner...</span>
            ) : (
              <>
                <CheckCircle2 size={18} />
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
