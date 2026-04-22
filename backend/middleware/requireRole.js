function normalize(role) {
  return String(role || '').trim().toLowerCase();
}

module.exports = function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles.map(normalize) : [normalize(roles)];
  return function (req, res, next) {
    const current = normalize(req.user?.role);
    if (!current) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowed.includes(current)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
};

