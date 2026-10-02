/**
 * In-memory cache store and caching middleware.
 * Stores { data, createdAt } for cached endpoints with a 1-minute TTL.
 */

const DEFAULT_TTL = 60 * 1000; // 1 minute in milliseconds
let currentTTL = DEFAULT_TTL;

// In-memory cache storage: key -> { data, createdAt }
const cacheStore = new Map();

/**
 * Clear all cache entries.
 */
const clearCache = () => {
  cacheStore.clear();
};

/**
 * Retrieve cache store for debugging or testing.
 * @returns {Map<string, {data: any, createdAt: number}>}
 */
const getCacheStore = () => cacheStore;

/**
 * Set custom TTL (primarily for testing expiration).
 * @param {number} ttlMs 
 */
const setTTL = (ttlMs) => {
  currentTTL = ttlMs;
};

/**
 * Get the current TTL in milliseconds.
 * @returns {number}
 */
const getTTL = () => currentTTL;

/**
 * Caching middleware for GET endpoints.
 * - Adds 'X-Cache: HIT' header when data is served from valid cache.
 * - Adds 'X-Cache: MISS' header when data is not cached or expired.
 * - Stores entry with creation timestamp (createdAt).
 * - Enforces 1-minute TTL.
 */
const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = req.originalUrl || req.url;
  const cachedEntry = cacheStore.get(key);

  if (cachedEntry) {
    const age = Date.now() - cachedEntry.createdAt;
    const isExpired = age > currentTTL;

    if (!isExpired) {
      // CACHE HIT
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cachedEntry.data);
    } else {
      // Cache entry expired: remove stale data
      cacheStore.delete(key);
    }
  }

  // CACHE MISS: fetch from controller/database and cache fresh result
  res.set('X-Cache', 'MISS');

  let isCached = false;
  const storeFreshCache = (body) => {
    if (!isCached && res.statusCode === 200 && body !== undefined && body !== null) {
      let dataToStore = body;
      if (typeof body === 'string') {
        try {
          dataToStore = JSON.parse(body);
        } catch {
          dataToStore = body;
        }
      }
      cacheStore.set(key, {
        data: dataToStore,
        createdAt: Date.now(),
      });
      isCached = true;
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    storeFreshCache(body);
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    storeFreshCache(body);
    return originalSend(body);
  };

  next();
};

/**
 * Cache invalidation middleware for modifying requests (POST, PUT, PATCH, DELETE).
 * Whenever stored data is successfully modified (HTTP 2xx response),
 * all cache entries that may contain stale data are invalidated.
 */
const invalidateCacheMiddleware = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  let invalidated = false;
  const triggerInvalidation = () => {
    if (!invalidated && res.statusCode >= 200 && res.statusCode < 300) {
      clearCache();
      invalidated = true;
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    triggerInvalidation();
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    triggerInvalidation();
    return originalSend(body);
  };

  res.on('finish', () => {
    triggerInvalidation();
  });

  next();
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  clearCache,
  getCacheStore,
  setTTL,
  getTTL,
  TTL: DEFAULT_TTL,
};
