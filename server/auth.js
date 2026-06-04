const jwt = require('jsonwebtoken');
const db = require('./db');

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
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_global_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function requireProjectAccess(minRole) {
  return (req, res, next) => {
    const projectId = parseInt(req.params.projectId || req.params.id);
    if (req.user.is_global_admin) return next();

    const access = db.prepare(
      'SELECT role FROM project_access WHERE project_id = ? AND user_id = ?'
    ).get(projectId, req.user.id);

    if (!access) return res.status(403).json({ error: 'No access to this project' });

    const roles = ['viewer', 'admin'];
    if (roles.indexOf(access.role) < roles.indexOf(minRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.projectRole = access.role;
    next();
  };
}

module.exports = { signToken, requireAuth, requireAdmin, requireProjectAccess };
