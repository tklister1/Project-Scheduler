const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireAdmin, requireProjectAccess } = require('../auth');

// List projects accessible to current user
router.get('/', requireAuth, (req, res) => {
  let projects;
  if (req.user.is_global_admin) {
    projects = db.prepare(`
      SELECT p.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'complete') as completed_milestones
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.updated_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as created_by_name, pa.role as user_role,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'complete') as completed_milestones
      FROM projects p
      JOIN project_access pa ON pa.project_id = p.id AND pa.user_id = ?
      LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.updated_at DESC
    `).all(req.user.id);
  }
  res.json(projects);
});

// Get single project
router.get('/:id', requireAuth, requireProjectAccess('viewer'), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as created_by_name
    FROM projects p LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });

  const access = db.prepare(`
    SELECT pa.*, u.name, u.email FROM project_access pa
    JOIN users u ON u.id = pa.user_id
    WHERE pa.project_id = ?
  `).all(req.params.id);

  res.json({ ...project, access });
});

// Create project (admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, description, status, start_date, end_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const result = db.prepare(`
    INSERT INTO projects (name, description, status, start_date, end_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, description || null, status || 'active', start_date || null, end_date || null, req.user.id);

  // Grant admin access to creator
  db.prepare('INSERT OR IGNORE INTO project_access (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');

  res.status(201).json({ id: result.lastInsertRowid, name, description, status: status || 'active' });
});

// Update project
router.put('/:id', requireAuth, requireProjectAccess('admin'), (req, res) => {
  const { name, description, status, start_date, end_date } = req.body;
  db.prepare(`
    UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description),
      status = COALESCE(?, status), start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date), updated_at = datetime('now')
    WHERE id = ?
  `).run(name || null, description !== undefined ? description : null, status || null, start_date !== undefined ? start_date : null, end_date !== undefined ? end_date : null, req.params.id);
  res.json({ success: true });
});

// Delete project (global admin only)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Manage project access
router.get('/:projectId/access', requireAuth, requireProjectAccess('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT pa.*, u.name, u.email FROM project_access pa
    JOIN users u ON u.id = pa.user_id WHERE pa.project_id = ?
  `).all(req.params.projectId);
  res.json(rows);
});

router.post('/:projectId/access', requireAuth, requireProjectAccess('admin'), (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
  db.prepare('INSERT OR REPLACE INTO project_access (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user_id, role);
  res.json({ success: true });
});

router.delete('/:projectId/access/:userId', requireAuth, requireProjectAccess('admin'), (req, res) => {
  db.prepare('DELETE FROM project_access WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ success: true });
});

module.exports = router;
