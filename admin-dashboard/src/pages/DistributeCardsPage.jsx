import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Building2,
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
  DollarSign,
  FileText,
  Tag,
  Info,
  Layers,
  ArrowRight,
  Camera,
} from 'lucide-react';
import api from '../services/api';
import { FranchiseTypeBadge } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import BarcodeCardScanner from '../components/cards/BarcodeCardScanner';

const DistributeCardsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { isSuperAdmin, partner: currentPartner } = useAuth();

  // Partner selection
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');

  // Available stock
  const [availableCards, setAvailableCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardSearch, setCardSearch] = useState('');

  // Selected cards
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState('RANGE'); // Default to RANGE as requested
  const [quickCount, setQuickCount] = useState('');
  const [rangeStartSerial, setRangeStartSerial] = useState('');
  const [rangeEndSerial, setRangeEndSerial] = useState('');
  const [rangeCount, setRangeCount] = useState('50');

  // Commercials & metadata
  const [transactionType, setTransactionType] = useState('SALE'); // 'SALE' | 'TRANSFER' | 'COMPLIMENTARY'
  const [pricePerCard, setPricePerCard] = useState(500);
  const [freeCount, setFreeCount] = useState('0');
  const [notes, setNotes] = useState('Stock allocation for franchise territory distribution');
  const [submitting, setSubmitting] = useState(false);

  // States & Districts lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Fetch initial data: Eligible Partners + Available Cards + States
  useEffect(() => {
    const fetchData = async () => {
      setLoadingPartners(true);
      setLoadingCards(true);
      try {
        const partnerParams = { limit: 200, accountStatus: 'ACTIVE' };
        if (isSuperAdmin) {
          partnerParams.franchiseType = 'FRANCHISE_ONLY';
        } else if (currentPartner?._id) {
          partnerParams.parentPartnerId = currentPartner._id;
        }

        const [partnersRes, cardsRes, statesRes] = await Promise.all([
          api.get('/partners', { params: partnerParams }),
          api.get('/transactions/my-available-cards'),
          api.get('/territories/states').catch(() => ({ data: { data: [] } })),
        ]);

        if (partnersRes.data?.data?.partners) {
          let list = partnersRes.data.data.partners;
          // If logged in as partner, filter out self
          if (!isSuperAdmin && currentPartner?._id) {
            list = list.filter(
              (p) => p._id.toString() !== currentPartner._id.toString()
            );
          }
          setPartners(list);
          if (list.length > 0 && !selectedPartnerId) {
            setSelectedPartnerId(list[0]._id);
          }
        }

        const rawCards = cardsRes.data?.data;
        const cards = Array.isArray(rawCards)
          ? rawCards
          : Array.isArray(rawCards?.cards)
          ? rawCards.cards
          : [];
        setAvailableCards(cards);

        // Default auto-allot next 50 cards from available stock if available
        if (cards.length > 0) {
          const initialCount = Math.min(50, cards.length);
          setSelectedCardIds(new Set(cards.slice(0, initialCount).map((c) => c._id)));
          setQuickCount(initialCount.toString());
          setRangeCount(initialCount.toString());
          setRangeStartSerial(cards[0].serialNumber);
          setRangeEndSerial(cards[initialCount - 1].serialNumber);
        }

        if (statesRes.data?.data && Array.isArray(statesRes.data.data)) {
          setStatesList(statesRes.data.data);
        }
      } catch (err) {
        showToast(err.response?.data?.message || 'Error loading distribution data', 'error');
      } finally {
        setLoadingPartners(false);
        setLoadingCards(false);
      }
    };
    fetchData();
  }, [isSuperAdmin, currentPartner]);

  // Load districts when selectedState changes
  useEffect(() => {
    if (!selectedState) {
      setDistrictsList([]);
      setSelectedDistrict('');
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await api.get(`/territories/districts`, { params: { state: selectedState } });
        if (res.data?.data) {
          setDistrictsList(res.data.data);
        }
      } catch {
        setDistrictsList([]);
      }
    };
    fetchDistricts();
  }, [selectedState]);

  // Filter partners based on state, district, search query & hierarchy
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (isSuperAdmin) {
        // Super Admin ONLY allocates to State & District Franchise Partners
        if (p.franchiseType === 'SUB_FRANCHISE') return false;
        if (selectedState && p.state?.toLowerCase() !== selectedState.toLowerCase()) {
          return false;
        }
        if (selectedDistrict && p.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      } else if (currentPartner?._id) {
        // Franchise Partner ONLY allocates to their downline Sub-Franchise partners
        if (p.franchiseType !== 'SUB_FRANCHISE') return false;
        const parentId = p.parentPartnerId?._id || p.parentPartnerId;
        if (parentId && parentId.toString() !== currentPartner._id.toString()) {
          return false;
        }
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
  }, [partners, selectedState, selectedDistrict, partnerSearch, isSuperAdmin, currentPartner]);

  const selectedPartner = useMemo(() => {
    return partners.find((p) => p._id === selectedPartnerId);
  }, [partners, selectedPartnerId]);

  // Filter available cards by search query
  const filteredAvailableCards = useMemo(() => {
    if (!cardSearch.trim()) return availableCards;
    const term = cardSearch.toLowerCase().trim();
    return availableCards.filter(
      (c) =>
        c.serialNumber?.toLowerCase().includes(term) ||
        c.cardBatchId?.toLowerCase().includes(term)
    );
  }, [availableCards, cardSearch]);

  // Selected cards array sorted according to stock order
  const selectedCardsList = useMemo(() => {
    if (selectedCardIds.size === 0) return [];
    return availableCards.filter((c) => selectedCardIds.has(c._id));
  }, [availableCards, selectedCardIds]);

  // Handle Quick Count selection
  const handleSelectCount = (count) => {
    const num = parseInt(count, 10);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid count of cards', 'warning');
      return;
    }
    if (num > availableCards.length) {
      showToast(`Only ${availableCards.length} cards available in stock`, 'warning');
      return;
    }
    const slice = availableCards.slice(0, num);
    setSelectedCardIds(new Set(slice.map((c) => c._id)));
    setQuickCount(num.toString());

    if (slice.length > 0) {
      const startCard = slice[0];
      const endCard = slice[slice.length - 1];
      setRangeStartSerial(startCard.serialNumber);
      setRangeEndSerial(endCard.serialNumber);
      setRangeCount(num.toString());
      showToast(
        `Auto-selected next ${num} cards: ${startCard.serialNumber} → ${endCard.serialNumber}`,
        'success'
      );
    }
  };

  // Handle Auto-Allot Next N Cards from Remaining Stock
  const handleAutoAllotNextN = (count) => {
    const num = Math.min(parseInt(count, 10) || 1, availableCards.length);
    if (availableCards.length === 0 || num <= 0) {
      showToast('No available cards in stock to allocate', 'warning');
      return;
    }

    const startCard = availableCards[0];
    const endCard = availableCards[num - 1];

    setRangeStartSerial(startCard.serialNumber);
    setRangeEndSerial(endCard.serialNumber);
    setRangeCount(num.toString());

    const slice = availableCards.slice(0, num);
    setSelectedCardIds(new Set(slice.map((c) => c._id)));
    setQuickCount(num.toString());
    showToast(`Auto-allotted next ${num} cards: ${startCard.serialNumber} → ${endCard.serialNumber}`, 'success');
  };

  // Handle Quantity (N) change in Range Tab -> Auto-calculates End Serial
  const handleRangeCountChange = (countVal) => {
    setRangeCount(countVal);
    const num = parseInt(countVal, 10);
    if (isNaN(num) || num <= 0 || availableCards.length === 0) return;

    let startIndex = 0;
    if (rangeStartSerial.trim()) {
      const idx = availableCards.findIndex(
        (c) => c.serialNumber.toUpperCase() === rangeStartSerial.trim().toUpperCase()
      );
      if (idx !== -1) startIndex = idx;
    } else {
      setRangeStartSerial(availableCards[0].serialNumber);
    }

    const endIndex = Math.min(startIndex + num - 1, availableCards.length - 1);
    const targetEndCard = availableCards[endIndex];
    if (targetEndCard) {
      setRangeEndSerial(targetEndCard.serialNumber);
      const slice = availableCards.slice(startIndex, endIndex + 1);
      setSelectedCardIds(new Set(slice.map((c) => c._id)));
    }
  };

  // Handle Start Serial change in Range Tab -> Auto-calculates End Serial
  const handleRangeStartChange = (startVal) => {
    setRangeStartSerial(startVal);
    if (!startVal.trim() || availableCards.length === 0) return;

    const idx = availableCards.findIndex(
      (c) => c.serialNumber.toUpperCase() === startVal.trim().toUpperCase()
    );
    if (idx !== -1) {
      const num = parseInt(rangeCount, 10) || 50;
      const endIndex = Math.min(idx + num - 1, availableCards.length - 1);
      const targetEndCard = availableCards[endIndex];
      if (targetEndCard) {
        setRangeEndSerial(targetEndCard.serialNumber);
        const slice = availableCards.slice(idx, endIndex + 1);
        setSelectedCardIds(new Set(slice.map((c) => c._id)));
      }
    }
  };

  // Handle End Serial change in Range Tab -> Auto-calculates Count
  const handleRangeEndChange = (endVal) => {
    setRangeEndSerial(endVal);
    if (!endVal.trim() || availableCards.length === 0) return;

    const startIdx = rangeStartSerial.trim()
      ? availableCards.findIndex((c) => c.serialNumber.toUpperCase() === rangeStartSerial.trim().toUpperCase())
      : 0;

    const endIdx = availableCards.findIndex(
      (c) => c.serialNumber.toUpperCase() === endVal.trim().toUpperCase()
    );

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      const count = endIdx - startIdx + 1;
      setRangeCount(count.toString());
      const slice = availableCards.slice(startIdx, endIdx + 1);
      setSelectedCardIds(new Set(slice.map((c) => c._id)));
    }
  };

  // Handle Manual Apply Serial Number Range
  const handleApplySerialRange = () => {
    if (!rangeStartSerial.trim() || !rangeEndSerial.trim()) {
      showToast('Please enter both Start and End Serial Numbers', 'warning');
      return;
    }
    const start = rangeStartSerial.trim().toUpperCase();
    const end = rangeEndSerial.trim().toUpperCase();

    const matching = availableCards.filter(
      (c) => c.serialNumber >= start && c.serialNumber <= end
    );

    if (matching.length === 0) {
      showToast(`No available cards found in stock between ${start} and ${end}`, 'error');
      return;
    }

    setSelectedCardIds(new Set(matching.map((c) => c._id)));
    setRangeCount(matching.length.toString());
    showToast(`Successfully selected ${matching.length} cards (${start} → ${end})`, 'success');
  };

  // Toggle individual card
  const toggleCard = (id) => {
    const next = new Set(selectedCardIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCardIds(next);
  };

  const handleSelectAll = () => {
    setSelectedCardIds(new Set(availableCards.map((c) => c._id)));
  };

  const handleClearSelection = () => {
    setSelectedCardIds(new Set());
    setQuickCount('');
  };

  // Barcode Scanner Handlers
  const handleAddScannedCard = (serial) => {
    const card = availableCards.find((c) => c.serialNumber?.toUpperCase() === serial.toUpperCase());
    if (!card) {
      showToast(`Card ${serial} is not in your available stock`, 'error');
      return false;
    }
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.add(card._id);
      return next;
    });
    return true;
  };

  const handleRemoveScannedCard = (serial) => {
    const card = availableCards.find((c) => c.serialNumber?.toUpperCase() === serial.toUpperCase());
    if (card) {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        next.delete(card._id);
        return next;
      });
    }
  };

  const handleClearAllScanned = () => {
    setSelectedCardIds(new Set());
  };

  const scannedSerialsList = useMemo(() => {
    return Array.from(selectedCardIds)
      .map((id) => {
        const card = availableCards.find((c) => c._id === id);
        return card?.serialNumber || '';
      })
      .filter(Boolean);
  }, [selectedCardIds, availableCards]);

  // Pricing & Free Cards calculations
  const totalCardsCount = selectedCardIds.size;
  const parsedFreeCount = Math.max(0, parseInt(freeCount, 10) || 0);
  const effectiveFreeCount = Math.min(parsedFreeCount, totalCardsCount);
  const effectivePaidCount = Math.max(0, totalCardsCount - effectiveFreeCount);
  const effectivePrice = Math.max(0, Number(pricePerCard) || 0);
  const totalAmount = effectivePaidCount * effectivePrice;
  const determinedTxnType =
    totalAmount === 0 || effectiveFreeCount === totalCardsCount
      ? 'COMPLIMENTARY'
      : effectivePrice > 0
      ? 'SALE'
      : 'TRANSFER';

  // Submit Distribution Transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      showToast('Please select a recipient Franchise Partner', 'error');
      return;
    }
    if (selectedCardIds.size === 0) {
      showToast('Please select at least 1 card to distribute', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        buyerPartnerId: selectedPartnerId,
        toPartnerId: selectedPartnerId,
        cardIds: Array.from(selectedCardIds),
        transactionType: determinedTxnType,
        pricePerCard: effectivePrice,
        freeQuantity: effectiveFreeCount,
        paidQuantity: effectivePaidCount,
        notes: notes.trim() || undefined,
      };

      const res = await api.post('/transactions', payload);
      const createdTxn = res.data?.data?.transaction || res.data?.data;

      showToast(
        `Successfully allocated ${selectedCardIds.size} cards (${effectivePaidCount} paid + ${effectiveFreeCount} free) to ${selectedPartner?.fullName || 'partner'}!`,
        'success'
      );
      navigate(`/transactions/${createdTxn?._id || ''}`);
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Failed to allocate cards to partner',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Top Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <button
            onClick={() => navigate(-1)}
            className="page-header-back-btn"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="page-header-text">
            <h1 className="page-title">
              Allocate Cards to Franchise Partner
            </h1>
            <p className="page-subtitle">
              Directly allocate cards to franchise partners with instant ownership transfer, commercial pricing, and audit ledger tracking.
            </p>
          </div>
        </div>

        {/* Stock Count Badge */}
        <div className="page-header-actions">
          <div
            style={{
              backgroundColor: '#0F172A',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                My Available Stock
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#38BDF8', lineHeight: 1.2 }}>
                {availableCards.length} Cards
              </div>
            </div>
            <CreditCard size={20} color="#38BDF8" style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ============================================================ */}
          {/* STEP 1: SELECT RECIPIENT PARTNER */}
          {/* ============================================================ */}
          <div className="card" style={{ padding: '20px', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  1
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                    Select Recipient Franchise Partner
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Choose the authorized partner who will receive and confirm this card shipment.
                  </p>
                </div>
              </div>

              {selectedPartner && (
                <div style={{ fontSize: '12.5px', color: '#15803D', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', padding: '5px 12px', borderRadius: '20px', border: '1px solid #BBF7D0', alignSelf: 'center' }}>
                  <CheckCircle2 size={15} /> Selected: {selectedPartner.fullName} ({selectedPartner.franchiseId})
                </div>
              )}
            </div>

            {/* Territory Network View for Franchise Partners vs Super Admin Filters */}
            {!isSuperAdmin ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  backgroundColor: '#F0F9FF',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #BAE6FD',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      YOUR AUTHORIZED TERRITORY NETWORK
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '1px' }}>
                      {currentPartner?.district ? `${currentPartner.district}, ${currentPartner.state}` : currentPartner?.state || 'Authorized Territory'}
                    </div>
                  </div>
                </div>

                <div style={{ flex: '1 1 240px', width: '100%', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search sub-franchise by name, ID, phone..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    style={{
                      paddingLeft: '38px',
                      fontSize: '13.5px',
                      fontWeight: '500',
                      height: '42px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #93C5FD',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Super Admin Nationwide Territory Filters */
              <div
                className="filter-selects-grid"
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  marginBottom: '16px',
                }}
              >
                <div className="filter-select-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '68px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', letterSpacing: '0.4px', marginBottom: '6px', textTransform: 'uppercase' }}>
                    FILTER BY STATE
                  </label>
                  <select
                    className="form-control select"
                    style={{
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      height: '38px',
                      padding: '6px 10px',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    <option value="">🌐 All States ({statesList.length})</option>
                    {statesList.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '68px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', letterSpacing: '0.4px', marginBottom: '6px', textTransform: 'uppercase' }}>
                    FILTER BY DISTRICT
                  </label>
                  <select
                    className="form-control select"
                    style={{
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      height: '38px',
                      padding: '6px 10px',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    disabled={!selectedState}
                  >
                    <option value="">{selectedState ? `🏙️ All in ${selectedState}` : '🔒 Select State'}</option>
                    {districtsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', letterSpacing: '0.4px', marginBottom: '6px', textTransform: 'uppercase' }}>
                    SEARCH PARTNER
                  </label>
                  <div className="search-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none', zIndex: 2 }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Name, ID, Mobile..."
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      style={{
                        paddingLeft: '38px',
                        paddingRight: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        height: '38px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '6px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Partner Selection Grid */}
            {loadingPartners ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', color: '#0284C7' }} />
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading eligible franchise partners...</div>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                <Building2 size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)' }}>No Matching Franchise Partners Found</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Try clearing your state/district filter or searching by another name.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {filteredPartners.map((p) => {
                  const isSelected = p._id === selectedPartnerId;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPartnerId(p._id)}
                      style={{
                        border: `2px solid ${isSelected ? '#0284C7' : '#E2E8F0'}`,
                        backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(2, 132, 199, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#0284C7',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? '#0284C7' : '#E2E8F0',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '15px',
                            flexShrink: 0,
                          }}
                        >
                          {p.fullName?.substring(0, 2).toUpperCase() || 'FP'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.fullName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#0284C7', fontWeight: '800', fontFamily: 'monospace' }}>
                              {p.franchiseId}
                            </span>
                            <FranchiseTypeBadge type={p.franchiseType} />
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={13} color="#0284C7" />
                            <span>{p.district ? `${p.district}, ${p.state}` : p.state}</span>
                          </div>
                          {p.mobileNumber && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Phone size={12} color="#16A34A" /> {p.mobileNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* STEP 2: SELECT CARDS FROM STOCK */}
          {/* ============================================================ */}
          <div className="card" style={{ padding: '20px', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  2
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                    Select Cards to Transfer
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Choose cards by quantity presets, serial number range, or manual picker.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
                <span
                  style={{
                    backgroundColor: selectedCardIds.size > 0 ? '#E0F2FE' : '#F1F5F9',
                    color: selectedCardIds.size > 0 ? '#0284C7' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: '800',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: selectedCardIds.size > 0 ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                  }}
                >
                  {selectedCardIds.size} Cards Selected
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
              {[
                { id: 'QUANTITY', label: '1. By Quantity' },
                { id: 'RANGE', label: '2. Serial Range' },
                { id: 'SCANNER', label: '3. Barcode Scanner 📸' },
                { id: 'GRID', label: '4. Card Picker' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectionMode(tab.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectionMode === tab.id ? '#0284C7' : '#F1F5F9',
                    color: selectionMode === tab.id ? '#FFFFFF' : '#334155',
                    boxShadow: selectionMode === tab.id ? '0 3px 10px rgba(2, 132, 199, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB A: Quantity Selector */}
            {selectionMode === 'QUANTITY' && (
              <div style={{ padding: '18px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', letterSpacing: '0.6px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  QUICK SELECT QUANTITY FROM AVAILABLE STOCK
                </label>
                
                {/* 1. Lucrative Preset Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  {[10, 25, 50, 100].map((preset) => {
                    const isAvailable = availableCards.length >= preset;
                    const isSelected = selectedCardIds.size === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectCount(preset)}
                        disabled={!isAvailable}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #0284C7' : '1.5px solid #CBD5E1',
                          backgroundColor: isSelected ? '#EFF6FF' : isAvailable ? '#FFFFFF' : '#F1F5F9',
                          color: isSelected ? '#0284C7' : isAvailable ? '#0F172A' : '#94A3B8',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.2)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{preset} Cards</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={availableCards.length === 0}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: selectedCardIds.size === availableCards.length && availableCards.length > 0 ? '2px solid #0284C7' : '1.5px solid #93C5FD',
                      backgroundColor: selectedCardIds.size === availableCards.length && availableCards.length > 0 ? '#0284C7' : '#F0F9FF',
                      color: selectedCardIds.size === availableCards.length && availableCards.length > 0 ? '#FFFFFF' : '#0284C7',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: availableCards.length > 0 ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>All ({availableCards.length})</span>
                  </button>
                </div>

                {/* 2. Sleek Custom Count Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Layers size={15} />
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#334155' }}>Custom Units:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 140px', maxWidth: '220px' }}>
                    <input
                      type="number"
                      min="1"
                      max={availableCards.length || 1}
                      placeholder="e.g. 50"
                      className="form-control"
                      value={quickCount}
                      onChange={(e) => {
                        setQuickCount(e.target.value);
                        if (e.target.value) handleSelectCount(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        fontSize: '14.5px',
                        fontWeight: '800',
                        height: '38px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '6px',
                        textAlign: 'center',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>Cards</span>
                  </div>
                </div>

                {/* 3. Auto-Allotted Serial Numbers Range & Cards List Preview */}
                {selectedCardIds.size > 0 && selectedCardsList.length > 0 && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #BAE6FD',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: '800', color: '#0369A1', backgroundColor: '#E0F2FE', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          <Sparkles size={13} color="#0284C7" />
                          <span>Sequence ({selectedCardsList.length} Cards)</span>
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                          <span style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '5px' }}>{selectedCardsList[0]?.serialNumber}</span>
                          <span style={{ color: '#0284C7', fontWeight: '900' }}>→</span>
                          <span style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '5px' }}>{selectedCardsList[selectedCardsList.length - 1]?.serialNumber}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#15803D', fontWeight: '800', backgroundColor: '#DCFCE7', padding: '3px 10px', borderRadius: '20px', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} strokeWidth={3} />
                        <span>{selectedCardsList.length} Serials Locked</span>
                      </div>
                    </div>

                    {/* Exact Serial Number Chips Grid */}
                    <div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        Exact {selectedCardsList.length} Card Serials Assigned from Available Stock:
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                          gap: '6px',
                          maxHeight: '130px',
                          overflowY: 'auto',
                          padding: '8px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {selectedCardsList.map((card, idx) => (
                          <div
                            key={card._id}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              backgroundColor: '#FFFFFF',
                              color: '#0369A1',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid #BAE6FD',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: '700' }}>#{idx + 1}</span>
                            <span style={{ color: '#0F172A' }}>{card.serialNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: Range Selector (Upgraded with Auto-Allot Next N Cards) */}
            {selectionMode === 'RANGE' && (
              <div
                style={{
                  padding: '18px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* 1. Live Available In-Hand Stock Summary Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #BAE6FD',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#E0F2FE',
                        color: '#0284C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        AVAILABLE STOCK IN CUSTODY
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginTop: '1px' }}>
                        {availableCards.length > 0 ? (
                          <>
                            {availableCards.length} Cards{' '}
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', fontFamily: 'monospace' }}>
                              ({availableCards[0]?.serialNumber} → {availableCards[availableCards.length - 1]?.serialNumber})
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#DC2626' }}>0 Cards (No stock)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: selectedCardIds.size > 0 ? '#DCFCE7' : '#F1F5F9',
                        color: selectedCardIds.size > 0 ? '#15803D' : '#64748B',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '800',
                        border: selectedCardIds.size > 0 ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                      }}
                    >
                      {selectedCardIds.size} Cards Locked
                    </span>
                  </div>
                </div>

                {/* 2. 1-Click "Auto-Allot Next N Cards" Quick Presets */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={13} color="#0284C7" />
                      <span>AUTO-ALLOT PRESETS</span>
                    </label>
                  </div>

                  <div className="preset-pills-bar" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[25, 50, 100, 200, 500].map((qty) => {
                      const isAvailable = availableCards.length >= qty;
                      const isCurrentlySelected = selectedCardIds.size === qty && rangeStartSerial === availableCards[0]?.serialNumber;

                      return (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => handleAutoAllotNextN(qty)}
                          disabled={!isAvailable}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: isCurrentlySelected ? '2px solid #0284C7' : '1.5px solid #CBD5E1',
                            backgroundColor: isCurrentlySelected ? '#0284C7' : isAvailable ? '#FFFFFF' : '#F1F5F9',
                            color: isCurrentlySelected ? '#FFFFFF' : isAvailable ? '#0F172A' : '#94A3B8',
                            fontSize: '12.5px',
                            fontWeight: '800',
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                          }}
                        >
                          <span>Next {qty}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleAutoAllotNextN(availableCards.length)}
                      disabled={availableCards.length === 0}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #0284C7',
                        backgroundColor: selectedCardIds.size === availableCards.length && availableCards.length > 0 ? '#0284C7' : '#F0F9FF',
                        color: selectedCardIds.size === availableCards.length && availableCards.length > 0 ? '#FFFFFF' : '#0284C7',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        cursor: availableCards.length > 0 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      All Left ({availableCards.length})
                    </button>
                  </div>
                </div>

                {/* 3. Linked Dynamic Inputs (Start Serial + Quantity N + End Serial) */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    CUSTOM SERIAL NUMBER RANGE & QUANTITY
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                        1. START SERIAL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VS000001"
                        className="form-control"
                        value={rangeStartSerial}
                        onChange={(e) => handleRangeStartChange(e.target.value.toUpperCase())}
                        style={{
                          fontSize: '13.5px',
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          height: '42px',
                          borderRadius: '8px',
                          border: '1.5px solid #93C5FD',
                          backgroundColor: '#F8FAFC',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#0284C7', marginBottom: '4px' }}>
                        2. COUNT (N)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={availableCards.length || 1}
                        placeholder="e.g. 50"
                        className="form-control"
                        value={rangeCount}
                        onChange={(e) => handleRangeCountChange(e.target.value)}
                        style={{
                          fontSize: '14.5px',
                          fontWeight: '800',
                          height: '42px',
                          borderRadius: '8px',
                          border: '2px solid #0284C7',
                          backgroundColor: '#F0F9FF',
                          color: '#0284C7',
                          textAlign: 'center',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                        3. END SERIAL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VS000050"
                        className="form-control"
                        value={rangeEndSerial}
                        onChange={(e) => handleRangeEndChange(e.target.value.toUpperCase())}
                        style={{
                          fontSize: '13.5px',
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          height: '42px',
                          borderRadius: '8px',
                          border: '1.5px solid #93C5FD',
                          backgroundColor: '#F8FAFC',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApplySerialRange}
                      style={{
                        padding: '10px 18px',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        borderRadius: '8px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Lock In</span>
                    </button>
                  </div>

                  {/* Range Calculation Breakdown */}
                  {selectedCardIds.size > 0 && rangeStartSerial && rangeEndSerial && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '8px',
                        border: '1px solid #BBF7D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#166534', fontWeight: '700' }}>
                        <Check size={15} color="#16A34A" strokeWidth={3} />
                        <span>
                          Range Validated:{' '}
                          <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{rangeStartSerial}</strong> →{' '}
                          <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{rangeEndSerial}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#15803D', fontWeight: '800' }}>
                        {selectedCardIds.size} Units • Left: {Math.max(0, availableCards.length - selectedCardIds.size)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Barcode / QR Camera Scanner */}
            {selectionMode === 'SCANNER' && (
              <BarcodeCardScanner
                scannedCards={scannedSerialsList}
                onAddCard={handleAddScannedCard}
                onRemoveCard={handleRemoveScannedCard}
                onClearAll={handleClearAllScanned}
                availableCards={availableCards}
                warehouseAvailable={availableCards.length}
              />
            )}

            {/* TAB C: Interactive Grid */}
            {selectionMode === 'GRID' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px', width: '100%' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search serial numbers..."
                      value={cardSearch}
                      onChange={(e) => setCardSearch(e.target.value)}
                      style={{ paddingLeft: '38px', fontSize: '13px', height: '40px', borderRadius: '8px', border: '1.5px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '220px' }}>
                    <button type="button" className="btn btn-outline" onClick={handleSelectAll} style={{ flex: 1, fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '6px', justifyContent: 'center' }}>
                      All ({availableCards.length})
                    </button>
                    <button type="button" className="btn btn-outline" onClick={handleClearSelection} style={{ flex: 1, fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '6px', color: '#DC2626', justifyContent: 'center' }}>
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1.5px solid #E2E8F0', borderRadius: '8px', padding: '10px', backgroundColor: '#FFFFFF' }}>
                  {filteredAvailableCards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No available cards match your search.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                      {filteredAvailableCards.map((c) => {
                        const isPicked = selectedCardIds.has(c._id);
                        return (
                          <div
                            key={c._id}
                            onClick={() => toggleCard(c._id)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: isPicked ? '2px solid #0284C7' : '1.5px solid #E2E8F0',
                              backgroundColor: isPicked ? '#E0F2FE' : '#FFFFFF',
                              color: isPicked ? '#0369A1' : 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '12.5px',
                              fontWeight: '800',
                              fontFamily: 'monospace',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.1s ease',
                            }}
                          >
                            <span>{c.serialNumber}</span>
                            {isPicked && <Check size={14} strokeWidth={3} style={{ color: '#0284C7' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* STEP 3: CARD PRICING & COMMERCIAL BILLING */}
          {/* ============================================================ */}
          <div className="card" style={{ padding: '20px', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  Card Pricing & Billing
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Set the rate per card and optional notes. Total amount is calculated automatically.
                </p>
              </div>
            </div>

            {/* Quick Commercial Allocation Mode Selector */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '16px',
                backgroundColor: '#F8FAFC',
                padding: '8px',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setFreeCount('0');
                  if (pricePerCard === 0) setPricePerCard(500);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: effectiveFreeCount === 0 && effectivePrice > 0 ? '#0284C7' : '#FFFFFF',
                  color: effectiveFreeCount === 0 && effectivePrice > 0 ? '#FFFFFF' : '#334155',
                  boxShadow: effectiveFreeCount === 0 && effectivePrice > 0 ? '0 2px 6px rgba(2, 132, 199, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                💳 Standard Paid Sale
              </button>

              <button
                type="button"
                onClick={() => {
                  setFreeCount(totalCardsCount.toString());
                  setPricePerCard(0);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: effectiveFreeCount === totalCardsCount && totalCardsCount > 0 ? '#16A34A' : '#FFFFFF',
                  color: effectiveFreeCount === totalCardsCount && totalCardsCount > 0 ? '#FFFFFF' : '#334155',
                  boxShadow: effectiveFreeCount === totalCardsCount && totalCardsCount > 0 ? '0 2px 6px rgba(22, 163, 74, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                🎁 100% Free / Complimentary Allotment (₹0)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pricePerCard === 0) setPricePerCard(500);
                  const suggestedFree = Math.min(5, Math.floor(totalCardsCount * 0.1) || 1);
                  setFreeCount(suggestedFree.toString());
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: effectiveFreeCount > 0 && effectiveFreeCount < totalCardsCount ? '#7E22CE' : '#FFFFFF',
                  color: effectiveFreeCount > 0 && effectiveFreeCount < totalCardsCount ? '#FFFFFF' : '#334155',
                  boxShadow: effectiveFreeCount > 0 && effectiveFreeCount < totalCardsCount ? '0 2px 6px rgba(126, 34, 206, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                🎯 Mixed Allocation (Paid + Free Bonus Cards)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {/* 1. Total Cards to Consign */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  TOTAL CARDS SELECTED
                </label>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284C7' }}>
                  {totalCardsCount} Cards
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                  Selected from Step 2
                </div>
              </div>

              {/* 2. Rate Per Card */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  RATE PER CARD (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', fontSize: '16px', color: '#0284C7' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    placeholder="Rate per card (e.g. 500)"
                    value={pricePerCard}
                    onChange={(e) => setPricePerCard(e.target.value)}
                    style={{
                      paddingLeft: '30px',
                      fontSize: '16px',
                      fontWeight: '800',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                  {effectivePrice === 0 ? 'Free / ₹0 allocation' : 'Commercial billing rate'}
                </div>
              </div>

              {/* 3. Free Cards Option */}
              <div style={{ backgroundColor: '#FDF4FF', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #F0ABFC' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#86198F', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🎁 FREE / BONUS CARDS
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max={totalCardsCount}
                    step="1"
                    className="form-control"
                    placeholder="e.g. 10 free cards"
                    value={freeCount}
                    onChange={(e) => setFreeCount(e.target.value)}
                    style={{
                      fontSize: '16px',
                      fontWeight: '800',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1.5px solid #E879F9',
                      backgroundColor: '#FFFFFF',
                      color: '#86198F',
                    }}
                  />
                </div>
                {/* Quick Free Card Preset Chips */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFreeCount('0')}
                    style={{ border: 'none', background: '#F5D0FE', color: '#701A75', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    0 Free
                  </button>
                  {totalCardsCount >= 5 && (
                    <button
                      type="button"
                      onClick={() => setFreeCount('5')}
                      style={{ border: 'none', background: '#F5D0FE', color: '#701A75', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      5 Free
                    </button>
                  )}
                  {totalCardsCount >= 10 && (
                    <button
                      type="button"
                      onClick={() => setFreeCount('10')}
                      style={{ border: 'none', background: '#F5D0FE', color: '#701A75', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      10 Free
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFreeCount(totalCardsCount.toString())}
                    style={{ border: 'none', background: '#E879F9', color: '#FFFFFF', fontSize: '10.5px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    All Free
                  </button>
                </div>
              </div>

              {/* 4. Total Calculation Box */}
              <div style={{ backgroundColor: '#ECFDF5', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #A7F3D0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#047857', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  TOTAL PAYABLE VALUE
                </label>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#047857' }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px', fontWeight: '700' }}>
                  {effectivePaidCount} Paid @ ₹{effectivePrice} + {effectiveFreeCount} Free (₹0)
                </div>
              </div>
            </div>

            {/* Consignment Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                CONSIGNMENT REMARKS / NOTES (OPTIONAL)
              </label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="e.g. Stock allocation for franchise territory distribution..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  fontSize: '13.5px',
                  lineHeight: '1.4',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* FINAL ORDER SUMMARY & INITIATE ACTION */}
          {/* ============================================================ */}
          <div
            className="card"
            style={{
              padding: '22px 24px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: 'white',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: '1 1 240px' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  CONSIGNMENT ORDER SUMMARY
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginTop: '4px' }}>
                  {selectedPartner ? `Recipient: ${selectedPartner.fullName}` : 'No Recipient Selected'}
                </div>
                {selectedPartner && (
                  <div style={{ fontSize: '12.5px', color: '#38BDF8', marginTop: '3px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{selectedPartner.franchiseId}</span>
                    <span>•</span>
                    <span>{[selectedPartner.district, selectedPartner.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUANTITY</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#38BDF8', marginTop: '2px' }}>
                    {totalCardsCount} Units
                  </div>
                  {effectiveFreeCount > 0 && (
                    <div style={{ fontSize: '11px', color: '#E879F9', fontWeight: '700' }}>
                      ({effectivePaidCount} Paid + {effectiveFreeCount} Free)
                    </div>
                  )}
                </div>

                <div style={{ borderLeft: '1.5px solid rgba(255,255,255,0.15)', paddingLeft: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL AMOUNT</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#4ADE80', marginTop: '2px' }}>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedPartnerId || selectedCardIds.size === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '15px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                cursor: submitting || !selectedPartnerId || selectedCardIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || !selectedPartnerId || selectedCardIds.size === 0 ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="spin" size={20} />
                  <span>Allocating Cards to Partner...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Confirm & Allocate {selectedCardIds.size} Cards (₹{totalAmount.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DistributeCardsPage;
