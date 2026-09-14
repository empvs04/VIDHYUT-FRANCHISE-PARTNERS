/**
 * Vidhyut Saathi Business Rules Configuration
 * Centralized, non-hardcoded rules for installation, load-to-card ratio, and pricing defaults.
 */

export const BUSINESS_RULES = {
  // Connected load required per 1 Vidhyut Saathi Energy Saver Card (kW)
  LOAD_PER_CARD_KW: parseFloat(process.env.LOAD_PER_CARD_KW || '6'),

  // Default standard price per card charged to customer in INR (can be adjusted during installation)
  DEFAULT_CUSTOMER_PRICE_PER_CARD: parseFloat(process.env.DEFAULT_CUSTOMER_PRICE_PER_CARD || '2500'),

  // Maximum allowed cards in a single installation flow
  MAX_CARDS_PER_INSTALLATION: parseInt(process.env.MAX_CARDS_PER_INSTALLATION || '50', 10),

  // Minimum required connected load (kW)
  MIN_CONNECTED_LOAD_KW: 0.1,

  // GPS Accuracy Thresholds (in meters)
  GPS_ACCURACY_GOOD_METERS: parseFloat(process.env.GPS_ACCURACY_GOOD_METERS || '50'),
  GPS_ACCURACY_ACCEPTABLE_METERS: parseFloat(process.env.GPS_ACCURACY_ACCEPTABLE_METERS || '100'),

  // Maximum allowed age of client GPS timestamp (ms) - 30 minutes
  GPS_TIMESTAMP_MAX_AGE_MS: 30 * 60 * 1000,
};

/**
 * Evaluates GPS accuracy level.
 * <= 50m -> GOOD
 * 51m - 100m -> ACCEPTABLE
 * > 100m -> POOR
 */
export const evaluateGpsAccuracy = (accuracyMeters) => {
  const acc = parseFloat(accuracyMeters);
  if (isNaN(acc) || acc < 0) return 'POOR';
  if (acc <= BUSINESS_RULES.GPS_ACCURACY_GOOD_METERS) return 'GOOD';
  if (acc <= BUSINESS_RULES.GPS_ACCURACY_ACCEPTABLE_METERS) return 'ACCEPTABLE';
  return 'POOR';
};

/**
 * Calculates recommended card count given connected load, average monthly bill,
 * highest 12-month bill, and electrical phase.
 *
 * Rules:
 * 1. Connected Load: 1 card per 6 kW (Math.ceil(load / 6))
 * 2. Average Monthly Bill: 1 card per ₹5,000 monthly bill (Math.ceil(bill / 5000))
 * 3. 12-Month Peak Bill: 1 card per ₹6,000 peak bill (Math.ceil(peakBill / 6000))
 * 4. Base Recommendation: Max of (Load Cards, Avg Bill Cards, Peak Bill Cards)
 * 5. Electrical Phase: +1 Extra Card for Three Phase (3-Phase) installations
 */
export const calculateRecommendedCards = (param, maybeBill, maybeHighest, maybePhase) => {
  let loadKw = 0;
  let avgMonthlyBill = 0;
  let highestBill = 0;
  let phase = 'SINGLE_PHASE';

  if (typeof param === 'object' && param !== null) {
    loadKw = parseFloat(param.connectedLoadKw) || 0;
    avgMonthlyBill = parseFloat(param.monthlyElectricityBill || param.avgMonthlyBill) || 0;
    highestBill = parseFloat(param.highestElectricityBill12Months || param.highestBill) || 0;
    phase = param.phase || 'SINGLE_PHASE';
  } else {
    loadKw = parseFloat(param) || 0;
    avgMonthlyBill = parseFloat(maybeBill) || 0;
    highestBill = parseFloat(maybeHighest) || 0;
    phase = maybePhase || 'SINGLE_PHASE';
  }

  // 1. Calculate cards based on Connected Load (1 card per 6 kW)
  const cardsFromLoad = loadKw > 0 ? Math.ceil(loadKw / BUSINESS_RULES.LOAD_PER_CARD_KW) : 0;

  // 2. Calculate cards based on Average Monthly Bill (1 card per ₹5,000)
  const cardsFromAvgBill = avgMonthlyBill > 0 ? Math.ceil(avgMonthlyBill / 5000) : 0;

  // 3. Calculate cards based on 12-Month Highest Bill (1 card per ₹6,000)
  const cardsFromHighestBill = highestBill > 0 ? Math.ceil(highestBill / 6000) : 0;

  // Base requirement: Maximum demand across load and bill metrics
  const baseCards = Math.max(cardsFromLoad, cardsFromAvgBill, cardsFromHighestBill);

  // 4. Phase adjustment: Add 1 extra card for Three Phase (3-Phase)
  const isThreePhase = phase === 'THREE_PHASE' || String(phase).toLowerCase().includes('three') || String(phase).includes('3');
  const phaseExtraCard = (isThreePhase && baseCards > 0) ? 1 : 0;

  return baseCards + phaseExtraCard;
};

/**
 * Calculates total installation amount based on card count and price per card.
 */
export const calculateInstallationTotal = (cardCount, pricePerCard) => {
  const count = parseInt(cardCount, 10) || 0;
  const price = Math.max(0, parseFloat(pricePerCard) || 0);
  return count * price;
};
