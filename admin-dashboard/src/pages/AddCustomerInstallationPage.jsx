import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Zap,
  Home,
  Building,
  Factory,
  Camera,
  Upload,
  Phone,
  ShieldCheck,
  FileText,
  MapPin,
  Check,
  RefreshCw,
  Info,
  DollarSign,
  Send,
  Eye,
  Lock,
  Search,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const STEPS = [
  { id: 1, title: 'Customer Info', subtitle: 'Basic Profile' },
  { id: 2, title: 'Address & GPS', subtitle: 'Location & Territory Verification' },
  { id: 3, title: 'Electricity Specs', subtitle: 'Connected Load & Phase' },
  { id: 4, title: 'Card Selection', subtitle: 'Serial Number Linking' },
  { id: 5, title: 'Commercials', subtitle: 'Pricing & Billing' },
  { id: 6, title: 'Photo Uploads', subtitle: 'MCB, Bill & Card Photos' },
  { id: 7, title: 'Customer OTP', subtitle: 'Mobile OTP Verification' },
  { id: 8, title: 'Review & Submit', subtitle: 'Final Authorization' },
];

const AddCustomerInstallationPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Territory Options
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Eligible Cards
  const [eligibleCards, setEligibleCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');

  // Live Village/Taluka Search & Suggestions
  const [villageSearchLoading, setVillageSearchLoading] = useState(false);
  const [villageSuggestions, setVillageSuggestions] = useState([]);
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const [postOfficesList, setPostOfficesList] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Customer Profile
    customerType: 'RESIDENTIAL',
    fullName: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    email: '',

    // Step 2: Installation Address
    houseOrShopNumber: '',
    street: '',
    locality: '',
    city: '',
    district: partner?.district || '',
    state: partner?.state || 'Maharashtra',
    pinCode: '',
    landmark: '',

    // Step 3: Electricity Specs
    connectedLoadKw: '',
    monthlyElectricityBill: '',
    highestElectricityBill12Months: '',
    electricityBoard: '',
    consumerAccountNumber: '',
    meterNumber: '',
    sanctionedLoad: '',
    phase: 'SINGLE_PHASE',

    // Step 4: Cards Selection
    selectedCards: [],

    // Step 5: Commercials
    pricePerCard: '2500',
    notes: '',

    // Step 6: Photo Uploads
    mcbPhoto: '',
    billPhoto: '',
    installedCardPhoto: '',

    // GPS Location Metadata
    locationVerificationId: '',
  });

  // Step 2 GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [locationVerification, setLocationVerification] = useState(null);
  const [showOversmartAlert, setShowOversmartAlert] = useState(false);
  const [breachData, setBreachData] = useState(null);

  // Step 7 OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Initial Sync from partner context
  useEffect(() => {
    if (partner) {
      setFormData((prev) => ({
        ...prev,
        state: prev.state || partner.state || 'Maharashtra',
        district: prev.district || partner.district || '',
      }));
    }
  }, [partner]);

  // Two-way PIN Code auto lookup
  useEffect(() => {
    const pin = (formData.pinCode || '').trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPostOfficesList([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPincodeLoading(true);
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice)) {
          const offices = data[0].PostOffice;
          setPostOfficesList(offices);
          const primary = offices[0];
          const autoCity = primary.Block !== 'NA' && primary.Block ? primary.Block : primary.Name;
          
          setFormData((prev) => ({
            ...prev,
            city: prev.city || autoCity,
            locality: prev.locality || primary.Name,
            ...(isSuperAdmin
              ? {
                  state: primary.State || prev.state,
                  district: primary.District || prev.district,
                }
              : {}),
          }));
        } else {
          setPostOfficesList([]);
        }
      } catch (err) {
        console.error('Pincode fetch error:', err);
      } finally {
        setPincodeLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.pinCode, isSuperAdmin]);

  // Smart Village / Taluka Search & Auto PIN Fill
  const handleVillageSearch = async (val) => {
    handleInputChange('city', val);
    if (!val || val.trim().length < 2) {
      setVillageSuggestions([]);
      setShowVillageDropdown(false);
      return;
    }

    // 1. Sanitize query: strip common administrative suffixes (Taluka, Tehsil, Mandal, etc.)
    const raw = val.trim();
    const cleaned = raw.replace(/\b(taluka|taluk|tehsil|mandal|dist|district|village|town|city|gaon|gram)\b/gi, '').trim();
    const queryTerm = cleaned.length >= 3 ? cleaned : raw;

    // 2. Instant Local Quick Index for high-frequency Talukas & Localities
    const QUICK_INDEX = [
      { name: 'Kurla', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400070', block: 'Kurla' },
      { name: 'Kurla West', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400070', block: 'Kurla' },
      { name: 'Kurla East', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400024', block: 'Kurla' },
      { name: 'Andheri', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400069', block: 'Andheri' },
      { name: 'Andheri East', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400069', block: 'Andheri' },
      { name: 'Andheri West', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400058', block: 'Andheri' },
      { name: 'Borivali', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400066', block: 'Borivali' },
      { name: 'Bandra', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400050', block: 'Bandra' },
      { name: 'Ghatkopar', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400086', block: 'Kurla' },
      { name: 'Mulund', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400080', block: 'Kurla' },
      { name: 'Chembur', district: 'Mumbai Suburban', state: 'Maharashtra', pin: '400071', block: 'Kurla' },
      { name: 'Dadar', district: 'Mumbai City', state: 'Maharashtra', pin: '400014', block: 'Mumbai' },
      { name: 'Thane', district: 'Thane', state: 'Maharashtra', pin: '400601', block: 'Thane' },
      { name: 'Kalyan', district: 'Thane', state: 'Maharashtra', pin: '421301', block: 'Kalyan' },
      { name: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra', pin: '400703', block: 'Thane' },
      { name: 'Panvel', district: 'Raigad', state: 'Maharashtra', pin: '410206', block: 'Panvel' },
      { name: 'Pune City', district: 'Pune', state: 'Maharashtra', pin: '411001', block: 'Haveli' },
      { name: 'Haveli', district: 'Pune', state: 'Maharashtra', pin: '411028', block: 'Haveli' },
      { name: 'Nashik', district: 'Nashik', state: 'Maharashtra', pin: '422001', block: 'Nashik' },
      { name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', pin: '440001', block: 'Nagpur' },
      { name: 'Aurangabad', district: 'Aurangabad', state: 'Maharashtra', pin: '431001', block: 'Aurangabad' },
    ];

    const localMatches = QUICK_INDEX.filter((item) => {
      const target = `${item.name} ${item.block || ''}`.toLowerCase();
      return target.includes(queryTerm.toLowerCase()) || target.includes(raw.toLowerCase());
    }).map((item) => ({
      Name: item.name,
      District: item.district,
      State: item.state,
      Pincode: item.pin,
      Block: item.block,
    }));

    if (localMatches.length > 0) {
      setVillageSuggestions(localMatches);
      setShowVillageDropdown(true);

      // Auto-set PIN Code if exact root match (e.g. 'Kurla' or 'Kurla Taluka')
      if (!formData.pinCode || formData.pinCode.length !== 6) {
        setFormData((prev) => ({
          ...prev,
          pinCode: localMatches[0].Pincode,
          locality: prev.locality || localMatches[0].Name,
        }));
      }
    }

    if (queryTerm.length < 3) return;

    try {
      setVillageSearchLoading(true);
      const res = await fetch(
        `https://api.postalpincode.in/postoffice/${encodeURIComponent(queryTerm)}`
      );
      const data = await res.json();
      if (data && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice)) {
        let list = data[0].PostOffice;
        
        // Filter by partner's state
        if (!isSuperAdmin && partner?.state) {
          const pState = partner.state.toLowerCase();
          const stateMatches = list.filter((o) => o.State?.toLowerCase() === pState);
          if (stateMatches.length > 0) list = stateMatches;
        }

        // Filter by partner's district if possible
        if (!isSuperAdmin && partner?.district) {
          const pDist = partner.district.toLowerCase();
          const distMatches = list.filter((o) =>
            o.District?.toLowerCase().includes(pDist) || pDist.includes(o.District?.toLowerCase())
          );
          if (distMatches.length > 0) list = distMatches;
        }

        const combined = [...localMatches, ...list].filter(
          (v, i, a) => a.findIndex((t) => t.Name === v.Name && t.Pincode === v.Pincode) === i
        );

        setVillageSuggestions(combined.slice(0, 10));
        setShowVillageDropdown(true);

        // Auto-fill PIN code from first relevant match if not already set
        if (combined.length > 0 && (!formData.pinCode || formData.pinCode.length !== 6)) {
          setFormData((prev) => ({
            ...prev,
            pinCode: combined[0].Pincode,
            locality: prev.locality || combined[0].Name,
          }));
        }
      }
    } catch {
      // Keep local matches if API fails
    } finally {
      setVillageSearchLoading(false);
    }
  };

  const selectPostOffice = (po) => {
    const townName = po.Block !== 'NA' && po.Block ? po.Block : po.Name;
    setFormData((prev) => ({
      ...prev,
      city: `${po.Name}`,
      locality: po.Name,
      pinCode: po.Pincode || prev.pinCode,
      ...(isSuperAdmin
        ? {
            state: po.State || prev.state,
            district: po.District || prev.district,
          }
        : {}),
    }));
    setShowVillageDropdown(false);
  };

  // Fetch States on Mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get('/territories/states');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setStatesList(res.data.data);
        }
      } catch {
        setStatesList(['Maharashtra', 'Gujarat', 'Karnataka', 'Madhya Pradesh', 'Delhi', 'Rajasthan']);
      }
    };
    fetchStates();
  }, []);

  // Fetch Districts when State changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!formData.state) return;
      try {
        setLoadingDistricts(true);
        const res = await api.get('/territories/districts', { params: { state: formData.state } });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
          if (!formData.district || !res.data.data.includes(formData.district)) {
            setFormData((prev) => ({ ...prev, district: partner?.district || res.data.data[0] || '' }));
          }
        }
      } catch {
        // Continue with current
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, [formData.state, partner]);

  // Fetch Eligible Cards for Logged-in Partner
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoadingCards(true);
        const res = await api.get('/installations/eligible-cards');
        if (res.data?.data) {
          setEligibleCards(res.data.data || []);
        }
      } catch (err) {
        showToast('Could not load inventory cards eligible for installation.', 'error');
      } finally {
        setLoadingCards(false);
      }
    };
    fetchCards();
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Multi-factor Smart Card Recommendation Calculation:
  // 1. Connected Load: 1 card per 6 kW
  // 2. Average Monthly Bill: 1 card per ₹5,000
  // 3. 12-Month Peak Bill: 1 card per ₹6,000
  // 4. Electrical Phase: +1 Extra Card for 3-Phase balanced setup
  const connectedLoadNum = parseFloat(formData.connectedLoadKw) || 0;
  const avgMonthlyBillNum = parseFloat(formData.monthlyElectricityBill) || 0;
  const highestBillNum = parseFloat(formData.highestElectricityBill12Months) || 0;
  const isThreePhase = formData.phase === 'THREE_PHASE';

  const cardsByLoad = connectedLoadNum > 0 ? Math.ceil(connectedLoadNum / 6) : 0;
  const cardsByAvgBill = avgMonthlyBillNum > 0 ? Math.ceil(avgMonthlyBillNum / 5000) : 0;
  const cardsByHighestBill = highestBillNum > 0 ? Math.ceil(highestBillNum / 6000) : 0;
  const baseRecommendedCards = Math.max(cardsByLoad, cardsByAvgBill, cardsByHighestBill);
  const extraPhaseCard = (isThreePhase && baseRecommendedCards > 0) ? 1 : 0;

  const recommendedCardCount = baseRecommendedCards + extraPhaseCard;
  const selectedCount = formData.selectedCards.length;
  const isQuantityMismatch = recommendedCardCount > 0 && selectedCount > 0 && selectedCount !== recommendedCardCount;

  // Total amount calculation
  const priceNum = parseFloat(formData.pricePerCard) || 0;
  const totalAmount = selectedCount * priceNum;

  // Toggle Card Selection
  const toggleCardSelection = (serial) => {
    setFormData((prev) => {
      const exists = prev.selectedCards.includes(serial);
      if (exists) {
        return { ...prev, selectedCards: prev.selectedCards.filter((s) => s !== serial) };
      } else {
        return { ...prev, selectedCards: [...prev.selectedCards, serial] };
      }
    });
  };

  // Select all recommended cards helper
  const handleAutoSelectRecommended = () => {
    if (eligibleCards.length === 0) {
      showToast('No eligible cards available in your stock.', 'error');
      return;
    }
    const targetCount = recommendedCardCount || 1;
    const cardsToSelect = eligibleCards.slice(0, targetCount).map((c) => c.serialNumber);
    setFormData((prev) => ({ ...prev, selectedCards: cardsToSelect }));
    showToast(`Auto-selected ${cardsToSelect.length} card(s) matching smart recommendation (${recommendedCardCount} cards).`, 'success');
  };

  // Handle Photo Upload (Convert to Data URL + Secure media validation)
  const handlePhotoUpload = async (e, photoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      showToast('Please upload a valid image file (JPEG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setFormData((prev) => ({ ...prev, [photoType]: base64Data }));
      showToast(`${photoType === 'mcbPhoto' ? 'MCB panel' : photoType === 'billPhoto' ? 'Electricity bill' : 'Installed card'} photo uploaded successfully!`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Step 2: Live GPS Geolocation Capture & Territory Verification
  const handleResetGPS = () => {
    setLocationVerification(null);
    setGpsError('');
    setFormData((prev) => ({ ...prev, locationVerificationId: '' }));
  };

  const handleCaptureGPS = (resetFirst = false) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    if (resetFirst) {
      setLocationVerification(null);
      setFormData((prev) => ({ ...prev, locationVerificationId: '' }));
    }

    setGpsLoading(true);
    setGpsError('');

    let hasResponded = false;

    const performVerification = async (pos) => {
      if (hasResponded) return;
      hasResponded = true;
      try {
        const { latitude, longitude, accuracy } = pos.coords;
        const gpsPayload = {
          latitude,
          longitude,
          accuracy,
          gpsCapturedAt: new Date(pos.timestamp || Date.now()),
          customerEnteredState: formData.state,
          customerEnteredDistrict: formData.district,
        };

        const res = await api.post('/location-verifications/verify', gpsPayload);
        if (res.data?.data) {
          const locData = res.data.data;
          setLocationVerification(locData);
          setFormData((prev) => ({ ...prev, locationVerificationId: locData.locationVerificationId }));

          if (locData.verificationStatus === 'VERIFIED') {
            showToast(`📍 GPS captured & verified in authorized territory (${locData.district || 'Territory'}).`, 'success');
          } else if (locData.verificationStatus === 'TERRITORY_MISMATCH' || locData.territoryMatch === false) {
            setBreachData({
              detectedDistrict: locData.district,
              detectedState: locData.state,
              authorizedDistrict: locData.authorizedDistrict || partner?.district || formData.district,
              authorizedState: locData.authorizedState || partner?.state || formData.state,
              latitude,
              longitude,
              accuracy,
              locationVerificationId: locData.locationVerificationId,
              parentName: partner?.parentPartnerId?.fullName || partner?.parentPartner?.fullName || null,
              partnerName: partner?.fullName,
              franchiseId: partner?.franchiseId,
            });
            setShowOversmartAlert(true);
            showToast(`⛔ Territory Mismatch: GPS is in ${locData.district || 'Different District'}. You cannot proceed outside authorized territory.`, 'error');
          } else if (locData.accuracyStatus === 'POOR') {
            showToast(`⚠️ GPS Accuracy is ±${accuracy.toFixed(0)}m (Low). Move to an open area if possible.`, 'warning');
          } else {
            showToast('GPS coordinates recorded successfully.', 'success');
          }
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to verify GPS location with server.';
        setGpsError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setGpsLoading(false);
      }
    };

    const handleGpsError = (err) => {
      if (hasResponded) return;
      
      // Fast fallback to standard accuracy
      navigator.geolocation.getCurrentPosition(
        performVerification,
        (fallbackErr) => {
          if (hasResponded) return;
          hasResponded = true;
          setGpsLoading(false);
          let msg = 'Failed to retrieve GPS location.';
          if (fallbackErr.code === 1) {
            msg = 'Location permission denied. Please enable GPS/Location in your browser settings.';
          } else if (fallbackErr.code === 2) {
            msg = 'Location unavailable. Please ensure your device GPS is turned on.';
          } else {
            msg = 'GPS request timed out. Please ensure location is enabled and click Re-try.';
          }
          setGpsError(msg);
          showToast(msg, 'error');
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 10000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      performVerification,
      handleGpsError,
      {
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: 5000,
      }
    );
  };

  // Step 7: Send Customer OTP
  const handleSendOTP = async () => {
    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      showToast('Please enter a valid 10-digit Indian mobile number in Step 1.', 'error');
      return;
    }

    try {
      setOtpSending(true);
      const res = await api.post('/customers/send-otp', { mobileNumber: formData.mobileNumber.trim() });
      setOtpSent(true);
      setOtpCountdown(60);
      if (res.data?.data?.devCode) {
        setDevOtpHint(res.data.data.devCode);
        setOtpCode(res.data.data.devCode);
      }
      showToast('Verification OTP sent to customer mobile number.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to dispatch OTP.', 'error');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 7: Verify Customer OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      showToast('Please enter the 6-digit OTP received by customer.', 'error');
      return;
    }

    try {
      setOtpVerifying(true);
      await api.post('/customers/verify-otp', {
        mobileNumber: formData.mobileNumber.trim(),
        otp: otpCode.trim(),
      });
      setOtpVerified(true);
      showToast('Customer OTP verified successfully! Ready for final submission.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid or expired OTP.', 'error');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step Validations
  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.fullName.trim()) {
        showToast('Please enter customer full name.', 'error');
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
        showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
        return false;
      }
      if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        showToast('Please enter a valid email address or leave blank.', 'error');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.city.trim() || !formData.district.trim() || !formData.state.trim() || !formData.pinCode.trim()) {
        showToast('City, District, State, and PIN code are mandatory.', 'error');
        return false;
      }
      if (!/^\d{6}$/.test(formData.pinCode.trim())) {
        showToast('PIN code must be a 6-digit number.', 'error');
        return false;
      }

      // Territory and Live GPS check for Partner
      if (!isSuperAdmin && partner) {
        if (!locationVerification) {
          showToast('Live GPS Location capture is required to verify authorized territory.', 'error');
          return false;
        }

        if (partner.franchiseType !== 'STATE_FRANCHISE') {
          if (!locationVerification.territoryMatch) {
            setBreachData({
              detectedDistrict: locationVerification.district,
              detectedState: locationVerification.state,
              authorizedDistrict: locationVerification.authorizedDistrict || partner?.district || formData.district,
              authorizedState: locationVerification.authorizedState || partner?.state || formData.state,
              latitude: locationVerification.latitude,
              longitude: locationVerification.longitude,
              accuracy: locationVerification.accuracyMeters,
              locationVerificationId: locationVerification.locationVerificationId,
              parentName: partner?.parentPartnerId?.fullName || partner?.parentPartner?.fullName || null,
              partnerName: partner?.fullName,
              franchiseId: partner?.franchiseId,
            });
            setShowOversmartAlert(true);
            showToast(`⛔ Territory Restriction: Detected GPS location (${locationVerification.district || 'Different District'}, ${locationVerification.state}) is outside your authorized area (${partner.district}, ${partner.state}). You cannot proceed with this customer onboarding.`, 'error');
            return false;
          }
        }
      }
    }

    if (currentStep === 3) {
      if (!formData.connectedLoadKw || parseFloat(formData.connectedLoadKw) <= 0) {
        showToast('Connected load must be greater than 0 kW.', 'error');
        return false;
      }
    }

    if (currentStep === 4) {
      if (formData.selectedCards.length === 0) {
        showToast('Please select at least one Vidhyut Saathi card for installation.', 'error');
        return false;
      }
    }

    if (currentStep === 5) {
      if (!formData.pricePerCard || parseFloat(formData.pricePerCard) < 0) {
        showToast('Please specify a valid price per card.', 'error');
        return false;
      }
    }

    if (currentStep === 6) {
      if (!formData.mcbPhoto) {
        showToast('Please upload the MCB / ELCB distribution panel photo.', 'error');
        return false;
      }
      if (!formData.billPhoto) {
        showToast('Please upload the electricity bill photo.', 'error');
        return false;
      }
      if (!formData.installedCardPhoto) {
        showToast('Please upload the photo of the installed Vidhyut Saathi card.', 'error');
        return false;
      }
    }

    if (currentStep === 7) {
      if (!otpVerified) {
        showToast('Customer confirmation via OTP is required before final submission.', 'error');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Atomic Submission
  const handleSubmitInstallation = async () => {
    if (!validateCurrentStep()) return;

    try {
      setSubmitting(true);

      const payload = {
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        alternateMobileNumber: formData.alternateMobileNumber.trim(),
        email: formData.email.trim(),
        customerType: formData.customerType,
        address: {
          houseOrShopNumber: formData.houseOrShopNumber.trim(),
          street: formData.street.trim(),
          locality: formData.locality.trim(),
          city: formData.city.trim(),
          district: formData.district.trim(),
          state: formData.state.trim(),
          pinCode: formData.pinCode.trim(),
          landmark: formData.landmark.trim(),
          fullAddress: `${formData.houseOrShopNumber || ''} ${formData.street || ''} ${formData.locality || ''}, ${formData.city}, ${formData.district}, ${formData.state} - ${formData.pinCode}`.trim(),
        },
        electricityDetails: {
          connectedLoadKw: parseFloat(formData.connectedLoadKw),
          monthlyElectricityBill: parseFloat(formData.monthlyElectricityBill) || 0,
          highestElectricityBill12Months: parseFloat(formData.highestElectricityBill12Months) || 0,
          electricityBoard: formData.electricityBoard.trim(),
          consumerAccountNumber: formData.consumerAccountNumber.trim(),
          meterNumber: formData.meterNumber.trim(),
          sanctionedLoad: formData.sanctionedLoad.trim(),
          phase: formData.phase,
        },
        cardSerialNumbers: formData.selectedCards,
        pricePerCard: parseFloat(formData.pricePerCard),
        mcbPhoto: formData.mcbPhoto,
        billPhoto: formData.billPhoto,
        installedCardPhoto: formData.installedCardPhoto,
        customerOtp: otpCode.trim(),
        skipOtpVerification: otpVerified, // Already verified in step 8
        locationVerificationId: locationVerification?.locationVerificationId || formData.locationVerificationId,
        notes: formData.notes.trim(),
      };

      const res = await api.post('/installations', payload);

      if (res.data?.data) {
        const { installation, customer } = res.data.data;
        showToast(`🎉 Installation recorded successfully! ID: ${installation.installationId}`, 'success');
        navigate(`/customers/${customer._id || installation.customerId}`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete card installation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Cards for Step 4
  const filteredCards = eligibleCards.filter((c) =>
    c.serialNumber.toLowerCase().includes(cardSearchQuery.toLowerCase())
  );

  return (
    <div className="page-body" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="page-header-back-btn"
            title="Back to Customers"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="page-header-text">
            <h1 className="page-title">
              Add Customer & Card Installation
            </h1>
            <p className="page-subtitle">
              Multi-step installation workflow optimized for mobile & desktop operations.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Header & Stepper Card */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        {/* Top Progress Bar & Percentage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
              Step {currentStep} of {STEPS.length}
            </span>
            <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {STEPS[currentStep - 1]?.title}
            </span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              ({STEPS[currentStep - 1]?.subtitle})
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: currentStep === STEPS.length ? '#10b981' : '#0284c7', marginLeft: 'auto' }}>
            {Math.round((currentStep / STEPS.length) * 100)}% Completed
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', marginBottom: '14px' }}>
          <div
            style={{
              height: '100%',
              width: `${(currentStep / STEPS.length) * 100}%`,
              background: currentStep === STEPS.length ? '#10b981' : 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Step Tabs Grid / Scrollable Row */}
        <div className="stepper-scroll-wrap">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (isCompleted) setCurrentStep(step.id);
                }}
                style={{
                  flex: '1 1 0',
                  minWidth: '120px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: isCurrent
                    ? '2px solid #0284c7'
                    : isCompleted
                    ? '1.5px solid #bbf7d0'
                    : '1px solid var(--border-color)',
                  background: isCurrent ? '#f0f9ff' : isCompleted ? '#f0fdf4' : '#ffffff',
                  cursor: isCompleted ? 'pointer' : isCurrent ? 'default' : 'not-allowed',
                  opacity: isCurrent || isCompleted ? 1 : 0.55,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isCompleted ? '#10b981' : isCurrent ? '#0284c7' : '#e2e8f0',
                    color: isCompleted || isCurrent ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? <Check size={14} /> : step.id}
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: isCurrent ? 700 : 600,
                      color: isCurrent ? '#0284c7' : isCompleted ? '#15803d' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                    title={step.title}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: isCurrent ? '#0369a1' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Step {step.id}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Step Content Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        {/* ===================================================
            STEP 1: CUSTOMER INFORMATION
            =================================================== */}
        {currentStep === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 1: Customer Type & Profile</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select customer category and enter primary contact details.</p>
              </div>
            </div>

            {/* Customer Type Selection */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Customer Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '6px' }}>
                {[
                  { type: 'RESIDENTIAL', label: 'Residential', desc: 'Homes, Apartments, Villas', icon: <Home size={20} /> },
                  { type: 'COMMERCIAL', label: 'Commercial', desc: 'Shops, Offices, Showrooms', icon: <Building size={20} /> },
                  { type: 'INDUSTRIAL', label: 'Industrial', desc: 'Factories, Workshops, Plants', icon: <Factory size={20} /> },
                ].map((item) => (
                  <div
                    key={item.type}
                    onClick={() => handleInputChange('customerType', item.type)}
                    style={{
                      border: formData.customerType === item.type ? '2px solid #0284c7' : '1px solid var(--border-color)',
                      background: formData.customerType === item.type ? '#f0f9ff' : 'var(--bg-card)',
                      padding: '16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ color: formData.customerType === item.type ? '#0284c7' : '#64748b', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      {item.icon}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Customer Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rajesh Kumar Sharma"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>OTP confirmation will be sent to this number.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Alternate Contact Number (Optional)</label>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. 9123456789"
                  value={formData.alternateMobileNumber}
                  onChange={(e) => handleInputChange('alternateMobileNumber', e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. customer@gmail.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 2: INSTALLATION ADDRESS & TERRITORY
            =================================================== */}
        {currentStep === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 2: Installation Address & Territory</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Provide the physical location where Vidhyut Saathi cards are being installed.</p>
              </div>
            </div>

            {!isSuperAdmin && partner && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={18} color="#0284c7" />
                <div style={{ fontSize: '13px', color: '#0369a1' }}>
                  <strong>Authorized Partner Territory:</strong> {partner.district}, {partner.state}. Customers must be located within your authorized area.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">House / Shop / Factory Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shop No. 12 / Flat 304"
                  value={formData.houseOrShopNumber}
                  onChange={(e) => handleInputChange('houseOrShopNumber', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street / Building Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MG Road, Galaxy Complex"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Locality / Area</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shivaji Nagar"
                  value={formData.locality}
                  onChange={(e) => handleInputChange('locality', e.target.value)}
                />
              </div>

              {/* Village / Town / City with live search and auto PIN sync */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Village / Town / City *</span>
                  {villageSearchLoading && (
                    <span style={{ fontSize: '11px', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" /> Searching...
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Andheri East, Panvel, Vashi (Type to auto-fetch PIN)"
                    value={formData.city}
                    onChange={(e) => handleVillageSearch(e.target.value)}
                    onFocus={() => {
                      if (villageSuggestions.length > 0) setShowVillageDropdown(true);
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
                </div>

                {/* Village / Post Office Suggestions Dropdown */}
                {showVillageDropdown && villageSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1.5px solid #0284c7',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 50,
                      marginTop: '4px',
                    }}
                  >
                    <div style={{ padding: '6px 12px', background: '#f8fafc', fontSize: '11px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      Select Village / Post Office to Auto-fill PIN Code:
                    </div>
                    {villageSuggestions.map((po, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectPostOffice(po)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{po.Name}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {po.District}, {po.State} {po.Block !== 'NA' && po.Block ? `• ${po.Block}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                          PIN: {po.Pincode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* State Field: Locked for Franchise and Sub-Franchise */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!isSuperAdmin && <Lock size={13} color="#0284c7" />}
                  <span>State {!isSuperAdmin ? '(Authorized Territory)' : ''} *</span>
                </label>
                {!isSuperAdmin ? (
                  <>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.state}
                      disabled
                      style={{ backgroundColor: '#f8fafc', fontWeight: 600, color: '#0f172a', border: '1.5px solid #cbd5e1', cursor: 'not-allowed' }}
                    />
                    <small style={{ color: '#0369a1', fontSize: '11.5px', marginTop: '3px', display: 'block', fontWeight: 500 }}>
                      🔒 Locked to your assigned state ({partner?.state || formData.state})
                    </small>
                  </>
                ) : (
                  <select
                    className="form-control"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  >
                    {statesList.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* District Field: Locked for Franchise and Sub-Franchise */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!isSuperAdmin && <Lock size={13} color="#0284c7" />}
                  <span>District {!isSuperAdmin ? '(Authorized Territory)' : ''} *</span>
                </label>
                {!isSuperAdmin ? (
                  <>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.district}
                      disabled
                      style={{ backgroundColor: '#f8fafc', fontWeight: 600, color: '#0f172a', border: '1.5px solid #cbd5e1', cursor: 'not-allowed' }}
                    />
                    <small style={{ color: '#0369a1', fontSize: '11.5px', marginTop: '3px', display: 'block', fontWeight: 500 }}>
                      🔒 Locked to your assigned district ({partner?.district || formData.district})
                    </small>
                  </>
                ) : (
                  <select
                    className="form-control"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    disabled={loadingDistricts}
                  >
                    {districtsList.map((dst) => (
                      <option key={dst} value={dst}>{dst}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* PIN Code Field with Auto-Lookup */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>PIN Code (6 Digits) *</span>
                  {pincodeLoading && (
                    <span style={{ fontSize: '11px', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" /> Fetching location...
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="form-control"
                  placeholder="e.g. 400001 (Auto-fetches Village / City)"
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, ''))}
                  style={{ fontWeight: 600, letterSpacing: '0.5px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Landmark (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Near City Bank ATM"
                  value={formData.landmark}
                  onChange={(e) => handleInputChange('landmark', e.target.value)}
                />
              </div>
            </div>

            {/* Step 2 Embedded Live GPS Geolocation & Territory Verification */}
            <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Live GPS Geolocation & Territory Verification *
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Verify on-site installation coordinates against authorized franchise territory.
                  </p>
                </div>
              </div>

              {!locationVerification ? (
                <div style={{ textAlign: 'center', padding: '20px 16px', background: '#f8fafc', border: '2px dashed #0284c7', borderRadius: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <MapPin size={24} />
                  </div>

                  <h5 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Capture Live Field GPS Coordinates
                  </h5>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
                    Click below to capture real-time GPS telemetry from this device. {!isSuperAdmin && partner ? `Your location must be in ${partner.district}, ${partner.state}.` : ''}
                  </p>

                  <button
                    type="button"
                    disabled={gpsLoading}
                    onClick={handleCaptureGPS}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    {gpsLoading ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} />}
                    <span>{gpsLoading ? 'Acquiring GPS Fix & Geocoding...' : '📍 Capture Live GPS Location'}</span>
                  </button>

                  {gpsError && (
                    <div style={{ marginTop: '14px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>{gpsError}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Verification Status Banner */}
                  {locationVerification.territoryMatch ? (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <CheckCircle2 size={22} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h5 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#15803d' }}>
                          ✅ Territory Verified: Within Authorized Franchise Boundary
                        </h5>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#166534' }}>
                          {locationVerification.verificationReason || `GPS location matches your authorized franchise area (${partner?.district || formData.district}). You are cleared to proceed.`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <AlertTriangle size={26} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#b91c1c' }}>
                          ⛔ Territory Out of Bounds: Next Step Blocked
                        </h5>
                        <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                          Detected GPS location is in <strong>{locationVerification.district || 'Different District'}, {locationVerification.state}</strong>, which does <strong>NOT</strong> match your assigned franchise territory <strong>({partner?.district || formData.district}, {partner?.state || formData.state})</strong>.
                          Customer onboarding outside your authorized territory is strictly prohibited.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={gpsLoading}
                            onClick={() => handleCaptureGPS(true)}
                            className="btn btn-primary"
                            style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff', fontSize: '13px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <RefreshCw size={14} className={gpsLoading ? 'animate-spin' : ''} />
                            <span>{gpsLoading ? 'Re-checking Live GPS...' : '🔄 Re-try / Re-check GPS Location'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={gpsLoading}
                            onClick={handleResetGPS}
                            className="btn btn-secondary"
                            style={{ fontSize: '12.5px', padding: '8px 14px' }}
                          >
                            Reset Location
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Telemetry Detail Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>GPS Coordinates</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                        {locationVerification.latitude.toFixed(6)}, {locationVerification.longitude.toFixed(6)}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy Telemetry</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', color: locationVerification.accuracyStatus === 'POOR' ? '#b91c1c' : locationVerification.accuracyStatus === 'ACCEPTABLE' ? '#b45309' : '#15803d' }}>
                        ±{locationVerification.accuracyMeters?.toFixed(1)}m ({locationVerification.accuracyStatus || 'GOOD'})
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Detected District & State</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: locationVerification.territoryMatch ? '#0369a1' : '#b91c1c', marginTop: '2px' }}>
                        {locationVerification.district || 'Detected District'}, {locationVerification.state || 'State'}
                      </div>
                    </div>
                  </div>

                  {/* Reverse Geocoded Full Address */}
                  {locationVerification.formattedAddress && (
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Detected Reverse-Geocoded Address:</strong> {locationVerification.formattedAddress}
                    </div>
                  )}

                  {/* Re-capture Link if verified */}
                  {locationVerification.territoryMatch && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={gpsLoading}
                        onClick={() => handleCaptureGPS(false)}
                        className="btn btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                      >
                        <RefreshCw size={12} className={gpsLoading ? 'animate-spin' : ''} />
                        <span>{gpsLoading ? 'Re-checking...' : 'Re-check GPS Location'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={gpsLoading}
                        onClick={handleResetGPS}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 3: ELECTRICITY DETAILS & LOAD RECOMMENDATION
            =================================================== */}
        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 3: Electricity Details & Connected Load</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enter electrical meter specifications and calculate recommended energy saver cards.</p>
              </div>
            </div>

            {/* Smart Card Recommendation Calculation Box */}
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: 'white', padding: '18px 22px', borderRadius: '12px', marginBottom: '20px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.6px', opacity: 0.9, fontWeight: 700 }}>
                    ⚡ Smart Card Recommendation Formula (Load + Bills + Phase)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
                    {recommendedCardCount > 0 ? `${recommendedCardCount} Card${recommendedCardCount > 1 ? 's' : ''} Recommended` : 'Enter load or bill to calculate cards'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px 18px', borderRadius: '8px', backdropFilter: 'blur(4px)', fontSize: '14px', fontWeight: 800 }}>
                  Total: {recommendedCardCount} Card{recommendedCardCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Dynamic Factors Breakdown Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ background: 'rgba(0,0,0,0.18)', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡ <strong>Load ({connectedLoadNum} kW):</strong> {cardsByLoad} card{cardsByLoad !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.18)', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>💵 <strong>Avg Bill (₹{avgMonthlyBillNum.toLocaleString()}):</strong> {cardsByAvgBill} card{cardsByAvgBill !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.18)', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>📈 <strong>12M Peak Bill (₹{highestBillNum.toLocaleString()}):</strong> {cardsByHighestBill} card{cardsByHighestBill !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ background: isThreePhase ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0,0,0,0.18)', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: isThreePhase ? '1px solid rgba(110, 231, 183, 0.6)' : 'none' }}>
                  <span>🔌 <strong>Phase:</strong> {isThreePhase ? '+1 Extra (3-Phase)' : '+0 (Single Phase)'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Current Connected Load (kW) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="form-control"
                  placeholder="e.g. 6, 12, 18"
                  value={formData.connectedLoadKw}
                  onChange={(e) => handleInputChange('connectedLoadKw', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Electrical Phase *</label>
                <select
                  className="form-control"
                  value={formData.phase}
                  onChange={(e) => handleInputChange('phase', e.target.value)}
                >
                  <option value="SINGLE_PHASE">Single Phase (1-Phase)</option>
                  <option value="THREE_PHASE">Three Phase (3-Phase) (+1 Extra Card)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Electricity Board / DISCOM</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MSEDCL, Adani Electricity, Tata Power, BESCOM"
                  value={formData.electricityBoard}
                  onChange={(e) => handleInputChange('electricityBoard', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consumer / CA / Account Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 012345678901"
                  value={formData.consumerAccountNumber}
                  onChange={(e) => handleInputChange('consumerAccountNumber', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Electricity Meter Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MTR-456789"
                  value={formData.meterNumber}
                  onChange={(e) => handleInputChange('meterNumber', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Average Monthly Bill (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 4500"
                  value={formData.monthlyElectricityBill}
                  onChange={(e) => handleInputChange('monthlyElectricityBill', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Highest Bill in Last 12 Months (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 7800"
                  value={formData.highestElectricityBill12Months}
                  onChange={(e) => handleInputChange('highestElectricityBill12Months', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sanctioned Load (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 8 HP / 10 kVA"
                  value={formData.sanctionedLoad}
                  onChange={(e) => handleInputChange('sanctionedLoad', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 4: CARD SELECTION & VERIFICATION
            =================================================== */}
        {currentStep === 4 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 4: Card Serial Number Selection</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select verified cards currently in your inventory to allocate to this customer.</p>
              </div>
            </div>

            {/* Quantity Comparison & Mismatch Alert */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: '1 1 200px', background: '#f8fafc', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommended Quantity</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7' }}>{recommendedCardCount} Card{recommendedCardCount > 1 ? 's' : ''}</div>
              </div>

              <div style={{ flex: '1 1 200px', background: '#f8fafc', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cards Selected</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: selectedCount === recommendedCardCount ? '#15803d' : '#b45309' }}>
                  {selectedCount} Card{selectedCount > 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleAutoSelectRecommended}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Zap size={15} color="#0284c7" />
                  <span>Auto-Select {recommendedCardCount} Cards</span>
                </button>
              </div>
            </div>

            {isQuantityMismatch && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#b45309" />
                <div style={{ fontSize: '13px', color: '#92400e' }}>
                  <strong>Quantity Notice:</strong> Selected card quantity ({selectedCount}) differs from the recommended quantity ({recommendedCardCount}) calculated from connected load ({connectedLoadNum} kW), bills (Avg: ₹{avgMonthlyBillNum.toLocaleString()}, 12M Peak: ₹{highestBillNum.toLocaleString()}), and {isThreePhase ? '3-Phase (+1 card)' : 'Single Phase'}.
                </div>
              </div>
            )}

            {/* Search Cards Input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search available card serial numbers in your inventory..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
              />
            </div>

            {/* Cards Grid */}
            {loadingCards ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <RefreshCw size={24} className="animate-spin" color="#0284c7" />
                <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Loading inventory cards...</div>
              </div>
            ) : filteredCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <AlertTriangle size={32} color="#b45309" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No Eligible Cards Found</div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  You currently have 0 cards in your assigned inventory available for customer installation.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
                {filteredCards.map((card) => {
                  const isSelected = formData.selectedCards.includes(card.serialNumber);
                  return (
                    <div
                      key={card._id}
                      onClick={() => toggleCardSelection(card.serialNumber)}
                      style={{
                        border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-color)',
                        background: isSelected ? '#f0f9ff' : 'var(--bg-card)',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{card.serialNumber}</div>
                        <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>AVAILABLE</div>
                      </div>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: isSelected ? 'none' : '1.5px solid #cbd5e1', background: isSelected ? '#0284c7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================
            STEP 5: COMMERCIALS & PRICING
            =================================================== */}
        {currentStep === 5 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 5: Commercials & Customer Billing</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Set price charged per card and review the automatically calculated total.</p>
              </div>
            </div>

            {/* Total Billing Banner */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cards Selected</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCount} Cards</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Price Per Card</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7' }}>₹{priceNum.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Amount Charged</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>₹{totalAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Price Per Card Charged to Customer (₹) *</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 2500"
                  value={formData.pricePerCard}
                  onChange={(e) => handleInputChange('pricePerCard', e.target.value)}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Standard retail price is ₹2,500 per card.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Installation Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Installed in main distribution box near entrance"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 6: PHOTO UPLOADS & EVIDENCE
            =================================================== */}
        {currentStep === 6 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 6: Required Photo Verification</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Upload photos of the MCB distribution panel, electricity bill, and installed cards.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Photo 1: MCB Panel */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>1. MCB / ELCB Distribution Panel Photo *</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Capture main circuit breaker / panel board.</p>

                {formData.mcbPhoto ? (
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <img src={formData.mcbPhoto} alt="MCB" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
                    <button
                      type="button"
                      onClick={() => handleInputChange('mcbPhoto', '')}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                    <Camera size={26} color="#0284c7" />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '6px' }}>Take Photo / Upload</span>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(e, 'mcbPhoto')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Photo 2: Electricity Bill */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>2. Electricity Bill Photo (Last 12M) *</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Clear photo of highest electricity bill.</p>

                {formData.billPhoto ? (
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <img src={formData.billPhoto} alt="Bill" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
                    <button
                      type="button"
                      onClick={() => handleInputChange('billPhoto', '')}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                    <FileText size={26} color="#0284c7" />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '6px' }}>Upload Bill Photo</span>
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'billPhoto')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Photo 3: Installed Card */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>3. Installed Vidhyut Saathi Card Photo *</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Photo showing card installed at the location.</p>

                {formData.installedCardPhoto ? (
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <img src={formData.installedCardPhoto} alt="Installed Card" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
                    <button
                      type="button"
                      onClick={() => handleInputChange('installedCardPhoto', '')}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer', background: 'white' }}>
                    <CreditCard size={26} color="#0284c7" />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '6px' }}>Capture Installed Card</span>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(e, 'installedCardPhoto')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 7: CUSTOMER CONFIRMATION OTP
            =================================================== */}
        {currentStep === 7 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 7: Customer OTP Confirmation</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Customer verifies installation authorization via secure mobile OTP.</p>
              </div>
            </div>

            <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Phone size={28} />
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Verify Customer Mobile Number
              </h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                An authentication code will be sent to <strong>+91 {formData.mobileNumber}</strong> ({formData.fullName}).
              </p>

              {otpVerified ? (
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '10px', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <CheckCircle2 size={24} />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Customer OTP Confirmed Successfully!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {!otpSent ? (
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={handleSendOTP}
                      className="btn btn-primary"
                      style={{ padding: '12px 24px', fontSize: '14.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {otpSending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                      <span>{otpSending ? 'Sending OTP...' : 'Send Confirmation OTP'}</span>
                    </button>
                  ) : (
                    <>
                      {devOtpHint && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', padding: '8px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}>
                          [DEV MODE] Auto-Filled OTP Code: {devOtpHint}
                        </div>
                      )}

                      <div className="form-group">
                        <input
                          type="text"
                          maxLength={6}
                          className="form-control"
                          placeholder="Enter 6-Digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 700 }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={otpVerifying}
                        onClick={handleVerifyOTP}
                        className="btn btn-primary"
                        style={{ padding: '12px 24px', fontSize: '14.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {otpVerifying ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        <span>{otpVerifying ? 'Verifying...' : 'Confirm Installation OTP'}</span>
                      </button>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        {otpCountdown > 0 ? (
                          <span>Resend OTP available in {otpCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            STEP 8: REVIEW & SUBMIT
            =================================================== */}
        {currentStep === 8 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Step 8: Final Review & Confirmation</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Review all customer details, linked card serials, pricing, and verified GPS evidence before atomic creation.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Summary 1: Customer & Address */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                  👤 Customer Profile
                </div>
                <div style={{ fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Name:</strong> {formData.fullName}</div>
                  <div><strong>Mobile:</strong> {formData.mobileNumber}</div>
                  <div><strong>Type:</strong> {formData.customerType}</div>
                  <div><strong>Address:</strong> {formData.houseOrShopNumber} {formData.street} {formData.locality}, {formData.city}, {formData.district}, {formData.state} - {formData.pinCode}</div>
                </div>
              </div>

              {/* Summary 2: Electricity Specs */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                  ⚡ Electricity Specifications
                </div>
                <div style={{ fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Connected Load:</strong> {formData.connectedLoadKw} kW</div>
                  <div><strong>Phase:</strong> {formData.phase === 'THREE_PHASE' ? 'Three Phase' : 'Single Phase'}</div>
                  <div><strong>Board / DISCOM:</strong> {formData.electricityBoard || 'N/A'}</div>
                  <div><strong>Consumer No:</strong> {formData.consumerAccountNumber || 'N/A'}</div>
                  <div><strong>Meter No:</strong> {formData.meterNumber || 'N/A'}</div>
                </div>
              </div>

              {/* Summary 3: Cards & Commercials */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                  💳 Cards & Billing Summary
                </div>
                <div style={{ fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Installed Cards:</strong> {selectedCount} Cards</div>
                  <div><strong>Card Serials:</strong> {formData.selectedCards.join(', ')}</div>
                  <div><strong>Price Per Card:</strong> ₹{priceNum.toLocaleString()}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
                    Total Bill: ₹{totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Summary 4: GPS Location & Territory Evidence */}
              <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                  📍 GPS Location Evidence
                </div>
                {locationVerification ? (
                  <div style={{ fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Coordinates:</strong> {locationVerification.latitude.toFixed(5)}, {locationVerification.longitude.toFixed(5)}</div>
                    <div><strong>Accuracy:</strong> ±{locationVerification.accuracyMeters?.toFixed(1)}m ({locationVerification.accuracyStatus})</div>
                    <div><strong>Detected Territory:</strong> {locationVerification.district}, {locationVerification.state}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: locationVerification.territoryMatch ? '#dcfce7' : '#fee2e2', color: locationVerification.territoryMatch ? '#15803d' : '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                        {locationVerification.territoryMatch ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {locationVerification.territoryMatch ? 'TERRITORY MATCH' : 'TERRITORY MISMATCH (FLAGGED)'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#b91c1c', fontSize: '13px' }}>GPS location not recorded</div>
                )}
              </div>
            </div>

            {/* Photo Previews */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '8px' }}>Uploaded Verification Photos:</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {formData.mcbPhoto && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={formData.mcbPhoto} alt="MCB" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>MCB Panel</div>
                  </div>
                )}
                {formData.billPhoto && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={formData.billPhoto} alt="Bill" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Bill Photo</div>
                  </div>
                )}
                {formData.installedCardPhoto && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={formData.installedCardPhoto} alt="Card" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Installed Card</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} color="#15803d" />
              <div style={{ fontSize: '13px', color: '#166534' }}>
                Customer confirmation verified via OTP on {new Date().toLocaleDateString()}. Submission will atomically update inventory cards to <strong>INSTALLED</strong> and link GPS audit verification.
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Controls (Footer) */}
        <div className="wizard-footer-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '18px', flexWrap: 'wrap', gap: '12px' }}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px' }}
            >
              <ArrowLeft size={16} />
              <span>Back: {STEPS[currentStep - 2]?.title}</span>
            </button>
          ) : <div />}

          {currentStep < STEPS.length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentStep === 2 && !isSuperAdmin && partner?.franchiseType !== 'STATE_FRANCHISE' && locationVerification && !locationVerification.territoryMatch && (
                <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                  ⛔ Outside Authorized Territory ({partner?.district || formData.district})
                </span>
              )}
              {!(currentStep === 2 && !isSuperAdmin && partner?.franchiseType !== 'STATE_FRANCHISE' && locationVerification && !locationVerification.territoryMatch) ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 24px', minHeight: '44px' }}
                >
                  <span>Next: {STEPS[currentStep]?.title}</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitInstallation}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 28px', fontSize: '15px', background: '#10b981', borderColor: '#10b981', minHeight: '46px' }}
            >
              {submitting ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={20} />}
              <span>{submitting ? 'Recording Installation...' : 'Finalize & Record Installation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* DON'T BE OVERSMART / GEOFENCE BREACH WARNING POPUP MODAL */}
      {showOversmartAlert && breachData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35), 0 0 0 2px #ef4444',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Top Red Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#ffffff',
                padding: '26px 22px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  border: '2px solid rgba(255, 255, 255, 0.45)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
                }}
              >
                <AlertTriangle size={38} color="#ffffff" />
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: '#fecaca',
                  marginBottom: '6px',
                }}
              >
                🚨 GEOFENCE SECURITY VIOLATION
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '23px',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  color: '#ffffff',
                  textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                ⚠️ DON'T TRY TO BE OVER-SMART!
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#fee2e2', fontWeight: 500 }}>
                Unauthorized cross-border card installation attempt blocked by GPS Tracker.
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 22px' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '13.5px', color: '#991b1b', lineHeight: '1.5', fontWeight: 600 }}>
                  Aap apni authorized territory boundary se bahar card install karne ki koshish kar rahe hain!
                </div>
              </div>

              {/* Side-by-Side Location Contrast */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div
                  style={{
                    background: '#fee2e2',
                    border: '1.5px solid #f87171',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    ❌ DETECTED LIVE GPS
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#7f1d1d' }}>
                    {breachData.detectedDistrict || 'Unknown'}, {breachData.detectedState}
                  </div>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '3px', fontFamily: 'monospace' }}>
                    {breachData.latitude ? `${breachData.latitude.toFixed(5)}, ${breachData.longitude.toFixed(5)}` : 'Captured'}
                  </div>
                </div>

                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    ✅ YOUR AUTHORIZED AREA
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                    {breachData.authorizedDistrict || 'Assigned'}, {breachData.authorizedState}
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '3px', fontWeight: 600 }}>
                    Franchise: {breachData.franchiseId || partner?.franchiseId}
                  </div>
                </div>
              </div>

              {/* Real-time Security Notice */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <ShieldAlert size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.45' }}>
                    <strong>🛡️ Real-Time Audit Recorded:</strong> Ye breach incident exact GPS coordinates aur timestamp ke sath <strong>Super Admin</strong> {breachData.parentName ? `aur aapke Parent Franchise Partner (${breachData.parentName})` : ''} ke portal par live notify ho chuka hai.
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowOversmartAlert(false)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '46px',
                  background: '#dc2626',
                  borderColor: '#b91c1c',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <span>Dismiss & Return to Authorized Territory</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCustomerInstallationPage;
