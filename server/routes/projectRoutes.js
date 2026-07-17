const router = require('express').Router();
const { query } = require('../db');
const { requireAuth, requireAdmin, requireProjectAccess } = require('../auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.is_global_admin) {
      ({ rows } = await query(`
        SELECT p.*, u.name as created_by_name,
          (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
          (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'complete') as completed_milestones
        FROM projects p LEFT JOIN users u ON u.id = p.created_by
        ORDER BY p.updated_at DESC
      `));
    } else {
      ({ rows } = await query(`
        SELECT p.*, u.name as created_by_name, pa.role as user_role,
          (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
          (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'complete') as completed_milestones
        FROM projects p
        JOIN project_access pa ON pa.project_id = p.id AND pa.user_id = $1
        LEFT JOIN users u ON u.id = p.created_by
        ORDER BY p.updated_at DESC
      `, [req.user.id]));
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, requireProjectAccess('viewer'), async (req, res) => {
  try {
    const { rows: [project] } = await query(`
      SELECT p.*, u.name as created_by_name FROM projects p
      LEFT JOIN users u ON u.id = p.created_by WHERE p.id = $1
    `, [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Not found' });

    const { rows: access } = await query(`
      SELECT pa.*, u.name, u.email FROM project_access pa
      JOIN users u ON u.id = pa.user_id WHERE pa.project_id = $1
    `, [req.params.id]);

    res.json({ ...project, access });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, status, start_date } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { rows: [project] } = await query(`
      INSERT INTO projects (name, description, status, start_date, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [name, description || null, status || 'pre_development', start_date || null, req.user.id]);

    const projectId = project.id;

    await query('INSERT INTO project_access (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [projectId, req.user.id, 'admin']);

    const defaultPhases = ['Entitlements & Permitting', 'Design & Engineering', 'Construction'];
    for (let i = 0; i < defaultPhases.length; i++) {
      await query('INSERT INTO project_phases (project_id, name, sort_order) VALUES ($1, $2, $3)', [projectId, defaultPhases[i], i]);
    }

    res.status(201).json({ id: projectId, name, description, status: status || 'pre_development' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { name, description, status, start_date } = req.body;
    await query(`
      UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        start_date = COALESCE($4, start_date),
        updated_at = NOW()
      WHERE id = $5
    `, [name || null, description !== undefined ? description : null, status || null, start_date !== undefined ? start_date : null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:projectId/access', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT pa.*, u.name, u.email FROM project_access pa
      JOIN users u ON u.id = pa.user_id WHERE pa.project_id = $1
    `, [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:projectId/access', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
    await query('INSERT INTO project_access (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3', [req.params.projectId, user_id, role]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:projectId/access/:userId', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    await query('DELETE FROM project_access WHERE project_id = $1 AND user_id = $2', [req.params.projectId, req.params.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:projectId/phases', requireAuth, requireProjectAccess('viewer'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM project_phases WHERE project_id = $1 ORDER BY sort_order, name', [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:projectId/phases/:id', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    await query('UPDATE project_phases SET start_date = $1, end_date = $2 WHERE id = $3 AND project_id = $4', [start_date || null, end_date || null, req.params.id, req.params.projectId]);
    const { rows: [phase] } = await query('SELECT * FROM project_phases WHERE id = $1', [req.params.id]);
    res.json(phase);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
