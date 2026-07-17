const jwt = require('jsonwebtoken');
const { query } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_global_admin: user.is_global_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_global_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function requireProjectAccess(minRole) {
  return async (req, res, next) => {
    const projectId = parseInt(req.params.projectId || req.params.id);
    if (req.user.is_global_admin) return next();
    try {
      const { rows } = await query('SELECT role FROM project_access WHERE project_id = $1 AND user_id = $2', [projectId, req.user.id]);
      if (!rows[0]) return res.status(403).json({ error: 'No access to this project' });
      const roles = ['viewer', 'admin'];
      if (roles.indexOf(rows[0].role) < roles.indexOf(minRole)) return res.status(403).json({ error: 'Insufficient permissions' });
      req.projectRole = rows[0].role;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { signToken, requireAuth, requireAdmin, requireProjectAccess };
