const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function adminAuth(req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured (missing JWT_SECRET)' });
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Token error' });

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Token malformatted' });

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
