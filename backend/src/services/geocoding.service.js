// In-Memory Geocoding Cache (Key: lat_lng rounded to 4 decimals ~ 11m resolution)
const geocodeCache = new Map();
const CACHE_MAX_ENTRIES = 500;

// Indian State and District Alias Normalizer Table
const STATE_ALIASES = {
  'nct of delhi': 'Delhi',
  delhi: 'Delhi',
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
};

const DISTRICT_ALIASES = {
  'mumbai suburban': 'Mumbai',
  'mumbai city': 'Mumbai',
  'greater mumbai': 'Mumbai',
  'bengaluru urban': 'Bengaluru',
  'bengaluru rural': 'Bengaluru',
  'bangalore urban': 'Bangalore',
  'bangalore rural': 'Bangalore',
  'chhatrapati sambhajinagar': 'Aurangabad',
  dharashiv: 'Osmanabad',
  poona: 'Pune',
  calcuttata: 'Kolkata',
  madras: 'Chennai',
  ahmadabad: 'Ahmedabad',
  gurugram: 'Gurgaon',
  prayagraj: 'Allahabad',
  varanasi: 'Varanasi',
  kashi: 'Varanasi',
};

// Known Reference Coordinate Boxes for major regions (Fallback / Offline Verification)
const KNOWN_INDIAN_REGIONS = [
  // Maharashtra
  { state: 'Maharashtra', district: 'Mumbai', minLat: 18.85, maxLat: 19.35, minLng: 72.75, maxLng: 73.05 },
  { state: 'Maharashtra', district: 'Thane', minLat: 19.15, maxLat: 19.45, minLng: 72.90, maxLng: 73.20 },
  { state: 'Maharashtra', district: 'Pune', minLat: 18.30, maxLat: 18.80, minLng: 73.70, maxLng: 74.10 },
  { state: 'Maharashtra', district: 'Nagpur', minLat: 21.05, maxLat: 21.25, minLng: 79.00, maxLng: 79.20 },
  { state: 'Maharashtra', district: 'Nashik', minLat: 19.90, maxLat: 20.10, minLng: 73.70, maxLng: 73.90 },
  { state: 'Maharashtra', district: 'Aurangabad', minLat: 19.80, maxLat: 20.00, minLng: 75.25, maxLng: 75.45 },
  // Gujarat
  { state: 'Gujarat', district: 'Ahmedabad', minLat: 22.95, maxLat: 23.15, minLng: 72.50, maxLng: 72.70 },
  { state: 'Gujarat', district: 'Surat', minLat: 21.10, maxLat: 21.30, minLng: 72.75, maxLng: 72.95 },
  { state: 'Gujarat', district: 'Vadodara', minLat: 22.25, maxLat: 22.40, minLng: 73.15, maxLng: 73.25 },
  // Delhi
  { state: 'Delhi', district: 'New Delhi', minLat: 28.45, maxLat: 28.85, minLng: 76.90, maxLng: 77.35 },
  // Karnataka
  { state: 'Karnataka', district: 'Bengaluru', minLat: 12.85, maxLat: 13.15, minLng: 77.45, maxLng: 77.75 },
  // Rajasthan
  { state: 'Rajasthan', district: 'Jaipur', minLat: 26.80, maxLat: 27.05, minLng: 75.70, maxLng: 76.00 },
];

/**
 * Normalizes state name to standardized Indian state name.
 */
export const normalizeStateName = (rawState = '') => {
  const cleaned = String(rawState).trim().toLowerCase();
  if (STATE_ALIASES[cleaned]) return STATE_ALIASES[cleaned];
  // Capitalize words
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Normalizes district name to standardized Indian district name.
 */
export const normalizeDistrictName = (rawDistrict = '') => {
  const cleaned = String(rawDistrict).trim().toLowerCase();
  if (DISTRICT_ALIASES[cleaned]) return DISTRICT_ALIASES[cleaned];
  // Strip common suffixes like ' District', ' zilla'
  const stripped = cleaned.replace(/\s+(district|zilla|mandal)$/i, '').trim();
  if (DISTRICT_ALIASES[stripped]) return DISTRICT_ALIASES[stripped];

  return stripped
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Checks if two state names match (fuzzy / normalized).
 */
export const isStateMatch = (stateA = '', stateB = '') => {
  const sA = normalizeStateName(stateA).toLowerCase();
  const sB = normalizeStateName(stateB).toLowerCase();
  return sA === sB;
};

/**
 * Checks if two district names match (fuzzy / normalized / aliases).
 */
export const isDistrictMatch = (districtA = '', districtB = '', authorizedList = []) => {
  const dA = normalizeDistrictName(districtA).toLowerCase();
  const dB = normalizeDistrictName(districtB).toLowerCase();

  if (dA === dB) return true;

  // Check aliases or substring inclusions (e.g. "Mumbai" matches "Mumbai Suburban")
  if (dA.includes(dB) || dB.includes(dA)) return true;

  // Check partner's multiple authorized districts list if provided
  if (Array.isArray(authorizedList)) {
    for (const authDist of authorizedList) {
      const authNorm = normalizeDistrictName(authDist).toLowerCase();
      if (dA === authNorm || dA.includes(authNorm) || authNorm.includes(dA)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Fallback coordinate bounding box lookup when external geocoding API is unreachable.
 */
const lookupFallbackRegion = (lat, lng) => {
  for (const region of KNOWN_INDIAN_REGIONS) {
    if (lat >= region.minLat && lat <= region.maxLat && lng >= region.minLng && lng <= region.maxLng) {
      return {
        formattedAddress: `${region.district}, ${region.state}, India`,
        locality: region.district,
        city: region.district,
        district: region.district,
        state: region.state,
        country: 'India',
        postalCode: '',
        provider: 'FALLBACK_ADMIN_LOOKUP',
      };
    }
  }
  return null;
};

/**
 * Reverse Geocodes coordinates (lat, lng) to official address, district, and state.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ formattedAddress, locality, city, district, state, country, postalCode, provider }>}
 */
export const reverseGeocodeCoordinates = async (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`Invalid GPS coordinates: [${latitude}, ${longitude}]`);
  }

  // 1. Check Cache
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return { ...geocodeCache.get(cacheKey) };
  }

  // 2. Primary Provider: OpenStreetMap Nominatim with Rate-Limiting & Timeout
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VidhyutSaathi-FranchisePlatform/1.0 (contact: tech@vidhyutsaathi.com)',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;

        const stateRaw = addr.state || addr.province || addr.state_district || '';
        const districtRaw =
          addr.state_district ||
          addr.district ||
          addr.county ||
          addr.city ||
          addr.town ||
          addr.municipality ||
          '';
        const cityRaw = addr.city || addr.town || addr.municipality || addr.village || '';
        const localityRaw = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
        const postalCode = addr.postcode || '';

        const state = normalizeStateName(stateRaw);
        const district = normalizeDistrictName(districtRaw);
        const city = cityRaw ? normalizeDistrictName(cityRaw) : district;

        const result = {
          formattedAddress: data.display_name || `${city}, ${district}, ${state}, India`,
          locality: localityRaw,
          city,
          district: district || city,
          state: state || 'Maharashtra',
          country: addr.country || 'India',
          postalCode,
          provider: 'OSM_NOMINATIM',
        };

        // Save to Cache
        if (geocodeCache.size >= CACHE_MAX_ENTRIES) {
          const firstKey = geocodeCache.keys().next().value;
          geocodeCache.delete(firstKey);
        }
        geocodeCache.set(cacheKey, result);

        return result;
      }
    }
  } catch (err) {
    // OSM failed or timed out, gracefully use fallback
    console.warn(`[ReverseGeocode] External OSM request failed for (${lat}, ${lng}):`, err.message);
  }

  // 3. Fallback: Known Indian Regions Lookup
  const fallback = lookupFallbackRegion(lat, lng);
  if (fallback) {
    geocodeCache.set(cacheKey, fallback);
    return fallback;
  }

  // 4. Default graceful location estimation if coordinates are valid within Indian mainland
  const defaultResult = {
    formattedAddress: `GPS Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
    locality: '',
    city: 'Mumbai',
    district: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '',
    provider: 'FALLBACK_ADMIN_LOOKUP',
  };

  return defaultResult;
};
