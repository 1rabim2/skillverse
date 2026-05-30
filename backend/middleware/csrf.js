// Simple CSRF protection middleware
// Uses double-submit cookie pattern
const crypto = require('crypto');

function cookieOptions(maxAge) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    ...(maxAge ? { maxAge } : {})
  };
}

// Generate CSRF token
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate CSRF token endpoint middleware
function csrfProtection(req, res, next) {
  // Generate and set CSRF token in a secure httpOnly cookie
  if (!req.cookies || !req.cookies['XSRF-TOKEN']) {
    const token = generateCSRFToken();
    res.cookie('XSRF-TOKEN', token, cookieOptions(24 * 60 * 60 * 1000));
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies['XSRF-TOKEN'];
  }
  
  // Provide token to frontend via response header for initial page load
  res.set('X-CSRF-TOKEN', req.csrfToken);
  next();
}

// Verify CSRF token for state-changing requests
function verifyCSRFToken(req, res, next) {
  // Skip CSRF check for safe/idempotent methods and CORS preflight.
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // CSRF token should be in X-XSRF-TOKEN header or body
  const tokenFromHeader = req.headers['x-xsrf-token'];
  const tokenFromBody = req.body?.['x-xsrf-token'];
  const token = tokenFromHeader || tokenFromBody;

  // Token from cookie
  const cookieToken = req.cookies?.['XSRF-TOKEN'];

  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }

  next();
}

module.exports = {
  csrfProtection,
  verifyCSRFToken,
  generateCSRFToken
};
