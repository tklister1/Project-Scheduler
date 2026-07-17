const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../auth');

router.get('/key-dates', requireAuth, async (req, res) => {
  try {
    let projectIds;
    if (req.user.is_global_admin) {
      const { rows } = await query('SELECT id FROM projects');
      projectIds = rows.map((p) => p.id);
    } else {
      const { rows } = await query('SELECT project_id FROM project_access WHERE user_id = $1', [req.user.id]);
      projectIds = rows.map((r) => r.project_id);
    }

    if (projectIds.length === 0) return res.json([]);

    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(',');

    const { rows: milestones } = await query(`
      SELECT m.id, m.name, m.due_date as date, m.status, m.category as phase,
        p.id as project_id, p.name as project_name, 'milestone' as type
      FROM milestones m JOIN projects p ON p.id = m.project_id
      WHERE m.project_id IN (${placeholders}) AND m.due_date IS NOT NULL AND m.status != 'cancelled'
      ORDER BY m.due_date
    `, projectIds);

    const { rows: phaseStarts } = await query(`
      SELECT ph.id, ph.name, ph.start_date as date, 'pending' as status, ph.name as phase,
        p.id as project_id, p.name as project_name, 'phase_start' as type
      FROM project_phases ph JOIN projects p ON p.id = ph.project_id
      WHERE ph.project_id IN (${placeholders}) AND ph.start_date IS NOT NULL
      ORDER BY ph.start_date
    `, projectIds);

    const { rows: phaseEnds } = await query(`
      SELECT ph.id, ph.name, ph.end_date as date, 'pending' as status, ph.name as phase,
        p.id as project_id, p.name as project_name, 'phase_end' as type
      FROM project_phases ph JOIN projects p ON p.id = ph.project_id
      WHERE ph.project_id IN (${placeholders}) AND ph.end_date IS NOT NULL
      ORDER BY ph.end_date
    `, projectIds);

    const all = [...milestones, ...phaseStarts, ...phaseEnds].sort((a, b) => (a.date > b.date ? 1 : -1));
    res.json(all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
