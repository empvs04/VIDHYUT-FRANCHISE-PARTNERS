import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache & Deduplication Storage
const memoryCache = new Map();
const inFlightRequests = new Map();

// Helper to generate cache key
const getCacheKey = (config) => {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.method?.toUpperCase() || 'GET'}:${url}?${params}`;
};

// Clear cache on write operations
export const clearApiCache = () => {
  memoryCache.clear();
};

// Custom GET with deduplication and caching
const originalGet = api.get;
api.get = function (url, config = {}) {
  const method = 'GET';
  const fullConfig = { ...config, method, url };
  const cacheKey = getCacheKey(fullConfig);
  const now = Date.now();

  // Check TTL (2 mins for territories, 12s for general dashboard/lookups)
  const isTerritory = url.includes('/territories');
  const cacheTTL = config.cacheTTL || (isTerritory ? 120000 : 12000);

  if (!config.skipCache && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (now - cached.timestamp < cacheTTL) {
      return Promise.resolve(JSON.parse(JSON.stringify(cached.data)));
    } else {
      memoryCache.delete(cacheKey);
    }
  }

  // Deduplicate in-flight GET requests
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

// Attach Authorization Token to outgoing requests
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('vidhyut_auth_token') ||
    localStorage.getItem('vidhyut_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    clearApiCache();
  }

  return config;
});

// Response Error Interceptor
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
