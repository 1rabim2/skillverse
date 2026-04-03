const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const value = String(header).trim();
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  const token = value.slice(7).trim();
  return token || null;
}

module.exports = function optionalAuth(req, _res, next) {
  try {
    if (!JWT_SECRET) return next();
    const token = req.cookies?.authToken || getBearerToken(req);
    if (!token) return next();
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return next();
  }
};

