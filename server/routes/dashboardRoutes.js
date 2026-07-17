const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

router.get('/key-dates', requireAuth, (req, res) => {
  let projectIds;
  if (req.user.is_global_admin) {
    projectIds = db.prepare('SELECT id FROM projects').all().map((p) => p.id);
  } else {
    projectIds = db.prepare('SELECT project_id FROM project_access WHERE user_id = ?').all(req.user.id).map((r) => r.project_id);
  }

  if (projectIds.length === 0) return res.json([]);

  const placeholders = projectIds.map(() => '?').join(',');

  // Milestone due dates
  const milestones = db.prepare(`
    SELECT m.id, m.name, m.due_date as date, m.status, m.category as phase,
      p.id as project_id, p.name as project_name, 'milestone' as type
    FROM milestones m
    JOIN projects p ON p.id = m.project_id
    WHERE m.project_id IN (${placeholders})
      AND m.due_date IS NOT NULL
      AND m.status != 'cancelled'
    ORDER BY m.due_date
  `).all(...projectIds);

  // Phase start dates
  const phaseStarts = db.prepare(`
    SELECT ph.id, ph.name, ph.start_date as date, 'pending' as status, ph.name as phase,
      p.id as project_id, p.name as project_name, 'phase_start' as type
    FROM project_phases ph
    JOIN projects p ON p.id = ph.project_id
    WHERE ph.project_id IN (${placeholders})
      AND ph.start_date IS NOT NULL
    ORDER BY ph.start_date
  `).all(...projectIds);

  // Phase end dates
  const phaseEnds = db.prepare(`
    SELECT ph.id, ph.name, ph.end_date as date, 'pending' as status, ph.name as phase,
      p.id as project_id, p.name as project_name, 'phase_end' as type
    FROM project_phases ph
    JOIN projects p ON p.id = ph.project_id
    WHERE ph.project_id IN (${placeholders})
      AND ph.end_date IS NOT NULL
    ORDER BY ph.end_date
  `).all(...projectIds);

  const all = [...milestones, ...phaseStarts, ...phaseEnds]
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  res.json(all);
});

module.exports = router;
