/**
 * Caching utility with memory store
 * For production, migrate to Redis
 */

class CacheManager {
  constructor(defaultTTL = 60 * 60 * 1000) { // 1 hour default
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set value in cache with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set new expiry timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

/**
 * Middleware to add caching headers to responses
 */
function setCacheHeaders(req, res, next) {
  // Cache configuration by path pattern
  const cacheConfig = {
    '/api/courses': 3600,           // 1 hour
    '/api/skill-paths': 3600,       // 1 hour
    '/api/user/leaderboard': 1800,  // 30 minutes
    '/api/instructor/library': 3600, // 1 hour
    '/api/admin': 0                 // No cache for admin
  };

  let cacheTime = 0;

  for (const [pattern, ttl] of Object.entries(cacheConfig)) {
    if (req.path.startsWith(pattern)) {
      cacheTime = ttl;
      break;
    }
  }

  if (cacheTime > 0) {
    res.set('Cache-Control', `public, max-age=${cacheTime}`);
  } else {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  next();
}

/**
 * Standardized success response formatter
 */
function successResponse(data, message = 'Success', statusCode = 200) {
  return {
    ok: true,
    status: statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Standardized error response formatter
 */
function errorResponse(error, statusCode = 500) {
  return {
    ok: false,
    status: statusCode,
    error: error.message || error || 'An error occurred',
    timestamp: new Date().toISOString()
  };
}

/**
 * Pagination formatter
 */
function paginatedResponse(items, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Global error handler middleware
 */
function globalErrorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    ok: false,
    status: statusCode,
    error: isDevelopment ? err.message : 'An error occurred',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    status: 404,
    error: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  CacheManager,
  setCacheHeaders,
  successResponse,
  errorResponse,
  paginatedResponse,
  globalErrorHandler,
  notFoundHandler
};
