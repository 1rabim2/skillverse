const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET;

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const value = String(header).trim();
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  const token = value.slice(7).trim();
  return token || null;
}

module.exports = async function adminAuth(req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured (missing JWT_SECRET)' });
  
  // Try to get token from httpOnly cookie (most secure)
  const token = req.cookies?.adminToken || getBearerToken(req);
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' || !decoded.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) return res.status(403).json({ error: 'Admin not allowed' });
    req.admin = admin;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
