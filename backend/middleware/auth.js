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

module.exports = function (req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured (missing JWT_SECRET)' });
  
  // Try to get token from httpOnly cookie first (most secure)
  const token = req.cookies?.authToken || getBearerToken(req);
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
