import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Building2,
  Layers,
  ListPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  User,
  MapPin,
  Check,
  Search,
  Filter,
  Phone,
  Package,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { FranchiseTypeBadge } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const AssignCardsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { isSuperAdmin, partner: authPartner } = useAuth();

  // Partners data
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  // Partner filter states
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');

  // States & Districts lists from API
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Warehouse available stock stats
  const [warehouseAvailable, setWarehouseAvailable] = useState(0);
  const [availableCards, setAvailableCards] = useState([]);
  const [availableRange, setAvailableRange] = useState(null);

  // Stock selection state
  const [activeTab, setActiveTab] = useState('RANGE'); // 'RANGE' or 'MANUAL'
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Range Form (Empty by default to prevent false conflict triggers)
  const [prefix, setPrefix] = useState('VS');
  const [startNumber, setStartNumber] = useState('');
  const [endNumber, setEndNumber] = useState('');
  const [cardCount, setCardCount] = useState('100');
  const [paddingLength, setPaddingLength] = useState(6);

  // Manual Form
  const [manualText, setManualText] = useState('');

  const [notes, setNotes] = useState('Initial stock allocation for territory distribution');
  const [previewData, setPreviewData] = useState(null);

  // 1. Fetch Indian States, Warehouse Stats, and Available Stock Range
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statesRes, statsRes, cardsRes] = await Promise.all([
          api.get('/territories/states'),
          api.get('/cards/stats'),
          api.get('/transactions/my-available-cards').catch(() => ({ data: { data: [] } })),
        ]);

        if (statesRes.data?.data && Array.isArray(statesRes.data.data)) {
          setStatesList(statesRes.data.data);
        }
        if (statsRes.data?.data) {
          setWarehouseAvailable(statsRes.data.data.available || 0);
        }
        
        const rawCards = cardsRes.data?.data;
        const cards = Array.isArray(rawCards)
          ? rawCards
          : Array.isArray(rawCards?.cards)
          ? rawCards.cards
          : [];

        setAvailableCards(cards);

        if (cards.length > 0) {
          setWarehouseAvailable(cards.length);
          const firstSerial = cards[0].serialNumber;
          const lastSerial = cards[cards.length - 1].serialNumber;
          setAvailableRange({
            first: firstSerial,
            last: lastSerial,
            total: cards.length,
          });

          // Extract prefix & starting number from the very first available card
          const match = firstSerial.match(/^([A-Za-z]+)(\d+)$/);
          if (match) {
            setPrefix(match[1]);
            setPaddingLength(match[2].length);
            const firstNum = parseInt(match[2], 10);
            const defaultN = Math.min(100, cards.length);
            setStartNumber(firstNum.toString());
            setEndNumber((firstNum + defaultN - 1).toString());
            setCardCount(defaultN.toString());
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchInitialData();
  }, []);

  // 2. Fetch Districts when State changes
  useEffect(() => {
    if (!selectedState) {
      setDistrictsList([]);
      setSelectedDistrict('');
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await api.get('/territories/districts', {
          params: { state: selectedState },
        });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setDistrictsList(res.data.data);
        }
      } catch {
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [selectedState]);

  // 3. Fetch Active Eligible Franchise Partners based on Role Hierarchy
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoadingPartners(true);
        const params = {
          accountStatus: 'ACTIVE',
          limit: 200,
        };

        if (isSuperAdmin) {
          // Super Admin distributes ONLY to State & District Franchise Partners
          params.franchiseType = 'FRANCHISE_ONLY';
        } else if (authPartner?._id) {
          // Franchise Partner distributes ONLY to their own Sub-Franchises
          params.parentPartnerId = authPartner._id;
        }

        const res = await api.get('/partners', { params });
        if (res.data?.data?.partners) {
          setPartners(res.data.data.partners);
          if (res.data.data.partners.length > 0 && !selectedPartnerId) {
            setSelectedPartnerId(res.data.data.partners[0]._id);
          }
        }
      } catch {
        showToast('Failed to load active franchise partners list.', 'error');
      } finally {
        setLoadingPartners(false);
      }
    };
    fetchPartners();
  }, [isSuperAdmin, authPartner, showToast]);

  // Filter partners based on hierarchy (Super Admin -> State & District only | Franchise Partner -> their own Sub-Franchises only)
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (isSuperAdmin) {
        // Hierarchy Rule 1: Super Admin ONLY allocates cards to State & District Franchise partners
        if (p.franchiseType === 'SUB_FRANCHISE') {
          return false;
        }
      } else if (authPartner?._id) {
        // Hierarchy Rule 2: Franchise Partner ONLY allocates cards to their direct Sub-Franchise partners
        if (p.franchiseType !== 'SUB_FRANCHISE') {
          return false;
        }
        const parentId = p.parentPartnerId?._id || p.parentPartnerId;
        if (parentId && parentId.toString() !== authPartner._id.toString()) {
          return false;
        }
      }

      if (selectedState && p.state?.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
      if (selectedDistrict && p.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (partnerSearch.trim()) {
        const q = partnerSearch.trim().toLowerCase();
        const matchName = p.fullName?.toLowerCase().includes(q);
        const matchId = p.franchiseId?.toLowerCase().includes(q);
        const matchMobile = p.mobileNumber?.includes(q);
        const matchDistrict = p.district?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchMobile && !matchDistrict) return false;
      }
      return true;
    });
  }, [partners, selectedState, selectedDistrict, partnerSearch, isSuperAdmin, authPartner]);


  // Auto-select first partner if current selection filtered out
  useEffect(() => {
    if (filteredPartners.length > 0) {
      const isSelectedInFiltered = filteredPartners.some((p) => p._id === selectedPartnerId);
      if (!isSelectedInFiltered) {
        setSelectedPartnerId(filteredPartners[0]._id);
      }
    }
  }, [filteredPartners, selectedPartnerId]);

  // 4. Pre-check / Preview Stock Availability
  useEffect(() => {
    if (!selectedPartnerId) {
      setPreviewData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        let payload = { partnerId: selectedPartnerId };

        if (activeTab === 'RANGE') {
          const start = parseInt(startNumber, 10);
          const end = parseInt(endNumber, 10);
          if (isNaN(start) || isNaN(end) || start <= 0 || start > end) {
            setPreviewData(null);
            return;
          }
          payload = { ...payload, prefix, startNumber: start, endNumber: end, paddingLength };
        } else {
          const rawList = manualText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (rawList.length === 0) {
            setPreviewData(null);
            return;
          }
          payload = { ...payload, serialNumbers: rawList };
        }

        const res = await api.post('/cards/preview-assign', payload);
        if (res.data?.data) {
          setPreviewData(res.data.data);
        }
      } catch {
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedPartnerId, activeTab, prefix, startNumber, endNumber, paddingLength, manualText]);

  // Auto-allot next N cards from remaining warehouse stock
  const handleAutoAllotNextN = (count) => {
    if (availableCards.length === 0) {
      showToast('No available cards in warehouse stock to allocate', 'warning');
      return;
    }
    const num = Math.min(parseInt(count, 10) || 1, availableCards.length);
    const firstCard = availableCards[0];
    const match = firstCard.serialNumber.match(/^([A-Za-z]+)(\d+)$/);
    if (match) {
      const pfx = match[1];
      const padLen = match[2].length;
      const startNum = parseInt(match[2], 10);
      const endNum = startNum + num - 1;

      setPrefix(pfx);
      setPaddingLength(padLen);
      setStartNumber(startNum.toString());
      setEndNumber(endNum.toString());
      setCardCount(num.toString());
      showToast(
        `Auto-selected next ${num} cards: ${pfx}${String(startNum).padStart(padLen, '0')} → ${pfx}${String(endNum).padStart(padLen, '0')}`,
        'success'
      );
    }
  };

  // Handle Quantity (N) change -> Auto-calculates End Number
  const handleCountChange = (val) => {
    setCardCount(val);
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) return;

    let start = parseInt(startNumber, 10);
    if (isNaN(start) || start <= 0) {
      if (availableCards.length > 0) {
        const match = availableCards[0].serialNumber.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
          start = parseInt(match[2], 10);
          setPrefix(match[1]);
          setPaddingLength(match[2].length);
          setStartNumber(start.toString());
        } else {
          start = 1;
          setStartNumber('1');
        }
      } else {
        start = 1;
        setStartNumber('1');
      }
    }
    const end = start + num - 1;
    setEndNumber(end.toString());
  };

  // Handle Start Number change -> Auto-calculates End Number
  const handleStartNumberChange = (val) => {
    setStartNumber(val);
    const start = parseInt(val, 10);
    const num = parseInt(cardCount, 10);
    if (!isNaN(start) && !isNaN(num) && num > 0) {
      setEndNumber((start + num - 1).toString());
    }
  };

  // Handle End Number change -> Auto-calculates Quantity (N)
  const handleEndNumberChange = (val) => {
    setEndNumber(val);
    const end = parseInt(val, 10);
    const start = parseInt(startNumber, 10);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      setCardCount((end - start + 1).toString());
    }
  };

  // 5. Submit Card Allocation
  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPartnerId) {
      showToast('Please select a recipient Franchise Partner.', 'error');
      return;
    }

    if (previewData && !previewData.isValid) {
      showToast(
        `Cannot assign: ${previewData.unavailableCount} cards are not available in warehouse stock!`,
        'error'
      );
      return;
    }

    try {
      setLoading(true);
      let payload = { partnerId: selectedPartnerId, notes };

      if (activeTab === 'RANGE') {
        payload = {
          ...payload,
          prefix,
          startNumber: parseInt(startNumber, 10),
          endNumber: parseInt(endNumber, 10),
          paddingLength,
        };
      } else {
        const rawList = manualText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        payload = { ...payload, serialNumbers: rawList };
      }

      const res = await api.post('/cards/assign', payload);
      showToast(
        `Successfully allocated ${res.data?.data?.assignedCount} cards to ${res.data?.data?.partner?.fullName}!`,
        'success'
      );
      navigate('/cards');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to allocate cards.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedPartner = partners.find((p) => p._id === selectedPartnerId);
  const calculatedCount =
    activeTab === 'RANGE'
      ? !isNaN(parseInt(startNumber, 10)) && !isNaN(parseInt(endNumber, 10)) && parseInt(endNumber, 10) >= parseInt(startNumber, 10)
        ? parseInt(endNumber, 10) - parseInt(startNumber, 10) + 1
        : 0
      : manualText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="page-header-wrap">
        <div className="page-header-left">
          <Link to="/cards" className="page-header-back-btn" title="Back to Inventory">
            <ArrowLeft size={18} />
          </Link>
          <div className="page-header-text">
            <h1 className="page-title">
              Assign Cards to Franchise Partner
            </h1>
            <p className="page-subtitle">
              Filter partners state/district wise and transfer physical cards from Central Warehouse HQ
            </p>
          </div>
        </div>

        {/* Warehouse Available Stock Badge */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.8px' }}>
              WAREHOUSE STOCK
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#38BDF8' }}>
              {warehouseAvailable} Available
            </div>
          </div>
          <CreditCard size={20} color="#38BDF8" />
        </div>
      </div>

      {/* Hierarchy Policy Alert Banner */}
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <ShieldCheck size={20} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.4' }}>
          <strong>Stock Distribution Hierarchy Policy:</strong> Super Admin allocates inventory directly from Headquarters to State and District Franchise Partners. Sub-Franchise partners receive their inventory distributed directly by their parent Franchise Partner.
        </div>
      </div>

      <form onSubmit={handleAssignSubmit}>
        {/* ============================================================ */}
        {/* STEP 1: STATE & DISTRICT WISE PARTNER SELECTION */}
        {/* ============================================================ */}
        <div className="card" style={{ marginBottom: '22px', padding: '20px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                }}
              >
                1
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {isSuperAdmin
                    ? 'Select Recipient Franchise Partner (State & District Partners)'
                    : 'Select Recipient Sub-Franchise Partner'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isSuperAdmin
                    ? 'Super Admin directly allocates HQ central warehouse stock to State and District Franchise partners'
                    : 'Allocate card stock to your authorized downline Sub-Franchise partners'}
                </p>
              </div>
            </div>

            {selectedPartner && (
              <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} color="#16a34a" /> Selected: {selectedPartner.fullName} ({selectedPartner.franchiseId})
              </div>
            )}
          </div>

          {/* Territory Filter & Search Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            {/* State Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                FILTER BY STATE
              </label>
              <select
                className="select"
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px', padding: '8px 10px' }}
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">All States ({statesList.length})</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                FILTER BY DISTRICT
              </label>
              <select
                className="select"
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px', padding: '8px 10px' }}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedState}
              >
                <option value="">{selectedState ? `All Districts in ${selectedState}` : 'Select State First'}</option>
                {districtsList.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Search Partner
              </label>
              <div className="search-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    height: '38px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Search Name, ID, Mobile..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Partner Cards Selection Grid */}
          {loadingPartners ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0284c7' }} />
              <div style={{ fontSize: '13px' }}>Loading active franchise partners...</div>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <Building2 size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>No Matching Franchise Partners Found</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Try clearing your state/district filter or searching for another partner name.
              </div>
              {(selectedState || selectedDistrict || partnerSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedState('');
                    setSelectedDistrict('');
                    setPartnerSearch('');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                gap: '12px',
                maxHeight: '280px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {filteredPartners.map((p) => {
                const isSelected = p._id === selectedPartnerId;

                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedPartnerId(p._id)}
                    style={{
                      border: `2px solid ${isSelected ? '#0284C7' : 'var(--border-color)'}`,
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.12)' : 'none',
                      position: 'relative',
                    }}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#0284C7',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={13} />
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Avatar Initials */}
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? '#0284C7' : '#E2E8F0',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {p.fullName?.substring(0, 2).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.fullName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: '700', fontFamily: 'monospace', marginTop: '1px' }}>
                          {p.franchiseId}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#64748B" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.district}, {p.state}
                          </span>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <FranchiseTypeBadge type={p.franchiseType} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* STEP 2: SPECIFY CARDS STOCK TO ALLOCATE */}
        {/* ============================================================ */}
        <div className="card" style={{ marginBottom: '22px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '13px',
                }}
              >
                2
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Specify Warehouse Cards to Transfer
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Enter serial range (e.g. VS000021 - VS000050) or individual serial numbers
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F1F5F9',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#334155',
              }}
            >
              Transfer Units: <strong>{calculatedCount} Cards</strong>
            </div>
          </div>

          {/* Warehouse Stock Alert / Range Hint */}
          {warehouseAvailable === 0 ? (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#991B1B' }}>
                    Warehouse Stock is Empty (0 Available Cards)
                  </div>
                  <div style={{ fontSize: '12px', color: '#B91C1C' }}>
                    There are no cards in the warehouse to allocate. Please generate cards first.
                  </div>
                </div>
              </div>
              <Link to="/cards/new" className="btn btn-primary btn-sm">
                + Add Cards Stock
              </Link>
            </div>
          ) : (
            availableRange && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#16A34A" />
                  <span>
                    <strong>Available Warehouse Stock:</strong> {availableRange.total} Cards (Range: <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{availableRange.first}</span> to <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{availableRange.last}</span>)
                  </span>
                </div>
              </div>
            )
          )}

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('RANGE')}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'RANGE' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'RANGE' ? '#0284C7' : '#64748B',
                fontWeight: activeTab === 'RANGE' ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: activeTab === 'RANGE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={15} />
              <span>Continuous Serial Range</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'MANUAL' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'MANUAL' ? '#0284C7' : '#64748B',
                fontWeight: activeTab === 'MANUAL' ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: activeTab === 'MANUAL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ListPlus size={15} />
              <span>Specific Serial Numbers</span>
            </button>
          </div>

          {activeTab === 'RANGE' ? (
            <div>
              {/* Quick Auto-Allot Preset Buttons */}
              <div style={{ marginBottom: '16px', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#0284C7" />
                    <span>⚡ Quick Auto-Allot from Warehouse:</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                    Click preset to auto-calculate serials
                  </div>
                </div>

                <div
                  className="preset-pills-bar"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                  }}
                >
                  {[
                    { label: 'Next 25', count: 25 },
                    { label: 'Next 50', count: 50 },
                    { label: 'Next 100', count: 100 },
                    { label: 'Next 200', count: 200 },
                    { label: 'Next 500', count: 500 },
                    { label: 'Next 1,000', count: 1000 },
                    { label: 'All Stock', count: warehouseAvailable },
                  ].map((preset) => {
                    const isSelected = calculatedCount === preset.count && calculatedCount > 0;
                    const isDisabled = warehouseAvailable === 0 || preset.count > warehouseAvailable;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleAutoAllotNextN(preset.count)}
                        disabled={isDisabled}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          border: isSelected ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                          backgroundColor: isSelected ? '#E0F2FE' : isDisabled ? '#F1F5F9' : '#FFFFFF',
                          color: isSelected ? '#0369A1' : isDisabled ? '#94A3B8' : '#334155',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: isSelected ? '0 1px 3px rgba(2,132,199,0.2)' : 'none',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSelected && <Check size={12} color="#0284C7" />}
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4-Input Synchronized Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                    Prefix
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '12px', fontWeight: '800', color: '#0369A1', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                    <span>Quantity</span>
                    <span style={{ fontSize: '9.5px', background: '#E0F2FE', color: '#0284C7', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>Auto-Sync</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    style={{ borderColor: '#38BDF8', fontWeight: '800', color: '#0369A1', backgroundColor: '#F0F9FF' }}
                    placeholder="e.g. 100"
                    value={cardCount}
                    onChange={(e) => handleCountChange(e.target.value)}
                    min={1}
                  />
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap' }}>
                    Auto-calculates End
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                    Start Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 1"
                    value={startNumber}
                    onChange={(e) => handleStartNumberChange(e.target.value)}
                    min={1}
                  />
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '3px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {startNumber ? `${prefix}${String(startNumber).padStart(paddingLength, '0')}` : 'Enter start'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                    End Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 100"
                    value={endNumber}
                    onChange={(e) => handleEndNumberChange(e.target.value)}
                    min={startNumber || 1}
                  />
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '3px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {endNumber ? `${prefix}${String(endNumber).padStart(paddingLength, '0')}` : 'Enter end'}
                  </div>
                </div>
              </div>

              {/* Range & Stock Summary Strip */}
              {calculatedCount > 0 && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Layers size={14} color="#0284C7" />
                    <span>
                      <strong>Sequence:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0F172A' }}>
                        {prefix}{String(startNumber).padStart(paddingLength, '0')}
                      </span>{' '}
                      ➔{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0F172A' }}>
                        {prefix}{String(endNumber).padStart(paddingLength, '0')}
                      </span>{' '}
                      (<strong style={{ color: '#0284C7' }}>{calculatedCount} Cards</strong>)
                    </span>
                  </div>

                  <div style={{ color: '#64748B', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    Remaining Stock: <strong>{Math.max(0, warehouseAvailable - calculatedCount)}</strong> / {warehouseAvailable} Cards
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Serial Numbers (One per line or comma-separated) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="input"
                style={{ minHeight: '110px', fontFamily: 'monospace', fontSize: '13px' }}
                placeholder="VS000001&#10;VS000002&#10;VS000003"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
              Assignment Notes / Reference
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Q4 District Quota Allocation"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 3: LIVE AVAILABILITY CHECK & CONFIRMATION BOX */}
        {/* ============================================================ */}
        <div
          className="card"
          style={{
            marginBottom: '24px',
            backgroundColor: previewData?.isValid ? '#F0FDF4' : previewData ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${
              previewData?.isValid ? '#BBF7D0' : previewData ? '#FECACA' : 'var(--border-color)'
            }`,
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {previewLoading ? (
                <RefreshCw size={18} className="animate-spin" color="#0284c7" />
              ) : previewData?.isValid ? (
                <CheckCircle2 size={20} color="#16A34A" />
              ) : previewData ? (
                <AlertCircle size={20} color="#DC2626" />
              ) : (
                <Package size={20} color="#64748B" />
              )}
              <span style={{ fontSize: '14.5px', fontWeight: '800' }}>
                Warehouse Stock Verification
              </span>
            </div>

            {previewData && (
              <div
                style={{
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                }}
              >
                {previewData.requestedCount} Units Target
              </div>
            )}
          </div>

          {previewData ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>First Serial: </span>
                  <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{previewData.firstSerial}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Last Serial: </span>
                  <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{previewData.lastSerial}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Partner: </span>
                  <strong>{previewData.partner?.fullName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Available in HQ Stock: </span>
                  <strong style={{ color: '#16A34A' }}>{previewData.availableCount}</strong>
                </div>
              </div>

              {previewData.isValid ? (
                <div style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <Check size={16} /> All {previewData.availableCount} cards are in AVAILABLE status and ready for allocation to {selectedPartner?.fullName}.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#DC2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> Conflict: {previewData.unavailableCount} cards cannot be allocated!
                  </div>
                  <div style={{ fontSize: '12px', color: '#991B1B' }}>
                    {previewData.unavailableSerials.slice(0, 5).map((u) => (
                      <div key={u.serialNumber}>
                        • <strong>{u.serialNumber}</strong>: {u.reason}
                      </div>
                    ))}
                    {previewData.unavailableSerials.length > 5 && (
                      <div>+ {previewData.unavailableSerials.length - 5} more conflicts</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#0284c7" />
              <span>
                {warehouseAvailable === 0
                  ? 'Warehouse stock has 0 cards. Please generate stock first.'
                  : 'Enter starting and ending serial numbers above to check warehouse stock availability.'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-actions-responsive" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Link to="/cards" className="btn btn-outline">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !previewData?.isValid || !selectedPartnerId}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
          >
            <Send size={15} />
            {loading ? (
              <span>Assigning Stock...</span>
            ) : (
              <span>Confirm & Transfer {previewData?.availableCount || 0} Cards to {selectedPartner?.fullName || 'Partner'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignCardsPage;
