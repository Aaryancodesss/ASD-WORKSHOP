const DEFAULT_TTL = 60 * 1000;
let currentTTL = DEFAULT_TTL;

const cacheStore = new Map();

const clearCache = () => {
  cacheStore.clear();
};

const getCacheStore = () => cacheStore;

const setTTL = (ttlMs) => {
  currentTTL = ttlMs;
};

const getTTL = () => currentTTL;

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
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cachedEntry.data);
    } else {
      cacheStore.delete(key);
    }
  }

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
