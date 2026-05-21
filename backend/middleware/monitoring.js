/**
 * Middleware for monitoring request/response times and performance
 */

/**
 * Log request processing time and include request ID
 */
function requestTimingMiddleware(req, res, next) {
  // Generate unique request ID if not exists
  req.id = req.headers['x-request-id'] || generateRequestId();
  res.set('X-Request-ID', req.id);
  
  const startTime = process.hrtime.bigint();
  
  // Track response
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
    
    // Add performance data to response headers
    res.set('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    
    // Log slow requests (> 1000ms)
    if (durationMs > 1000) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path} - ${durationMs.toFixed(2)}ms`, {
        requestId: req.id,
        userId: req.user?.id,
        statusCode: res.statusCode
      });
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Health check endpoint middleware
 */
function healthCheckMiddleware(req, res, next) {
  if (req.path === '/health' || req.path === '/api/health') {
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }
  next();
}

/**
 * Rate limiting with memory store (for single-server deployment)
 * For production, use Redis or external service
 */
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  getKey(req) {
    return req.user?.id || req.ip || req.socket.remoteAddress;
  }

  middleware() {
    return (req, res, next) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }
      
      const timestamps = this.requests.get(key);
      
      // Remove old requests outside the window
      const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
      
      if (validTimestamps.length >= this.maxRequests) {
        const resetTime = new Date(validTimestamps[0] + this.windowMs);
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: resetTime.toISOString(),
          message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`
        });
      }
      
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
      
      // Cleanup old entries periodically
      if (Math.random() < 0.01) {
        for (const [k, v] of this.requests.entries()) {
          const active = v.filter(t => now - t < this.windowMs);
          if (active.length === 0) {
            this.requests.delete(k);
          } else {
            this.requests.set(k, active);
          }
        }
      }
      
      next();
    };
  }
}

/**
 * Create rate limiters for different endpoints
 */
const apiLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const authLimiter = new RateLimiter(15 * 60 * 1000, 5);  // 5 login attempts per 15 minutes
const uploadLimiter = new RateLimiter(60 * 60 * 1000, 50); // 50 uploads per hour
const sensitiveOpLimiter = new RateLimiter(60 * 60 * 1000, 20); // 20 ops per hour

/**
 * Log all requests (in production, consider using proper logging service)
 */
function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    console.log(`[${level.toUpperCase()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      requestId: req.id,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
}

module.exports = {
  requestTimingMiddleware,
  healthCheckMiddleware,
  RateLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  sensitiveOpLimiter,
  requestLoggingMiddleware,
  generateRequestId
};
