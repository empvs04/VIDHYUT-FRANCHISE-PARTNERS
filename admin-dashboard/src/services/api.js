import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Cache & Deduplication Storage ───────────────────────────────────────────
const memoryCache = new Map();
const inFlightRequests = new Map();

// ─── TTL config per URL prefix (milliseconds) ────────────────────────────────
// Longer TTL = faster navigation back to dashboard
const TTL_MAP = [
  { pattern: /\/territories/,           ttl: 5 * 60 * 1000  }, // 5 min  — almost never changes
  { pattern: /\/dashboard\//,            ttl: 60 * 1000       }, // 60 sec — main dashboard APIs
  { pattern: /\/analytics\//,           ttl: 60 * 1000       }, // 60 sec — charts
  { pattern: /\/transactions\/stats/,   ttl: 60 * 1000       }, // 60 sec — summary stats
  { pattern: /\/cards\/stats/,          ttl: 60 * 1000       }, // 60 sec — card stats
  { pattern: /\/cards\/ranges/,         ttl: 60 * 1000       }, // 60 sec — ranges
  { pattern: /\/partners/,              ttl: 30 * 1000       }, // 30 sec — partner lists
  { pattern: /\/transactions(?!\/stats)/, ttl: 20 * 1000     }, // 20 sec — transaction lists
  { pattern: /\/cards(?!\/stats)/,      ttl: 20 * 1000       }, // 20 sec — card lists
];

const DEFAULT_TTL = 12 * 1000; // 12 sec fallback

const getTTL = (url, configTTL) => {
  if (configTTL) return configTTL;
  for (const { pattern, ttl } of TTL_MAP) {
    if (pattern.test(url)) return ttl;
  }
  return DEFAULT_TTL;
};

// ─── Cache key generator ─────────────────────────────────────────────────────
const getCacheKey = (config) => {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `GET:${url}?${params}`;
};

// ─── Targeted cache invalidation ─────────────────────────────────────────────
// Instead of wiping the entire cache on every mutation, only clear keys
// that are likely affected by the mutation endpoint.
const INVALIDATION_MAP = [
  { trigger: /\/transactions/,  clear: [/\/transactions/, /\/dashboard/, /\/analytics/, /\/cards\/stats/] },
  { trigger: /\/cards/,         clear: [/\/cards/, /\/dashboard/, /\/analytics/, /\/transactions\/stats/] },
  { trigger: /\/partners/,      clear: [/\/partners/, /\/dashboard/, /\/analytics/] },
  { trigger: /\/installations/, clear: [/\/installations/, /\/dashboard/, /\/analytics/, /\/cards\/stats/] },
  { trigger: /\/customers/,     clear: [/\/customers/, /\/dashboard/] },
  { trigger: /\/auth/,          clear: [/.*/] }, // full clear on auth
];

export const clearApiCache = (mutationUrl = null) => {
  if (!mutationUrl) {
    memoryCache.clear();
    return;
  }

  // Find which patterns to clear for this mutation URL
  let patternsToInvalidate = null;
  for (const { trigger, clear } of INVALIDATION_MAP) {
    if (trigger.test(mutationUrl)) {
      patternsToInvalidate = clear;
      break;
    }
  }

  if (!patternsToInvalidate) {
    // Unknown mutation — clear everything to be safe
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (patternsToInvalidate.some((p) => p.test(key))) {
      memoryCache.delete(key);
    }
  }
};

// ─── Override api.get with caching + dedup + stale-while-revalidate ──────────
const originalGet = api.get;
api.get = function (url, config = {}) {
  const fullConfig = { ...config, method: 'GET', url };
  const cacheKey = getCacheKey(fullConfig);
  const now = Date.now();
  const ttl = getTTL(url, config.cacheTTL);

  // Stale-while-revalidate: dashboard & analytics endpoints
  // → return cached data immediately AND kick off a background refresh
  const isStaleWhileRevalidate =
    !config.skipCache &&
    /\/dashboard\/|\/analytics\/|\/transactions\/stats|\/cards\/stats|\/cards\/ranges/.test(url);

  if (!config.skipCache && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    const age = now - cached.timestamp;

    if (age < ttl) {
      // Cache still fresh — return immediately
      return Promise.resolve(JSON.parse(JSON.stringify(cached.data)));
    }

    if (isStaleWhileRevalidate) {
      // Cache stale but we have data — return stale immediately, refresh in background
      const staleData = JSON.parse(JSON.stringify(cached.data));

      // Background refresh (don't await)
      if (!inFlightRequests.has(cacheKey)) {
        const bgPromise = originalGet.call(this, url, config)
          .then((response) => {
            memoryCache.set(cacheKey, { timestamp: Date.now(), data: response });
            inFlightRequests.delete(cacheKey);
            return response;
          })
          .catch(() => {
            inFlightRequests.delete(cacheKey);
          });
        inFlightRequests.set(cacheKey, bgPromise);
      }

      return Promise.resolve(staleData);
    }

    // Regular expired cache — delete and re-fetch
    memoryCache.delete(cacheKey);
  }

  // Deduplicate simultaneous identical requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = originalGet.call(this, url, config)
    .then((response) => {
      memoryCache.set(cacheKey, { timestamp: Date.now(), data: response });
      inFlightRequests.delete(cacheKey);
      return response;
    })
    .catch((error) => {
      inFlightRequests.delete(cacheKey);
      throw error;
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

// ─── Attach Authorization Token ───────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('vidhyut_auth_token') ||
    localStorage.getItem('vidhyut_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Targeted cache invalidation on mutations
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    clearApiCache(config.url);
  }

  return config;
});

// ─── Response Error Interceptor ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearApiCache();
      localStorage.removeItem('vidhyut_auth_token');
      localStorage.removeItem('vidhyut_admin_token');
      localStorage.removeItem('vidhyut_auth_user');
      localStorage.removeItem('vidhyut_admin_user');
      localStorage.removeItem('vidhyut_auth_partner');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
