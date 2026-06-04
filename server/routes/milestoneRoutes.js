const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const { requireAuth, requireProjectAccess } = require('../auth');

// List milestones for a project
router.get('/', requireAuth, requireProjectAccess('viewer'), (req, res) => {
  const milestones = db.prepare(`
    SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order, due_date, name
  `).all(req.params.projectId);
  res.json(milestones);
});

// Create milestone
router.post('/', requireAuth, requireProjectAccess('admin'), (req, res) => {
  const { name, category, status, start_date, due_date, notes, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const result = db.prepare(`
    INSERT INTO milestones (project_id, name, category, status, start_date, due_date, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.projectId, name,
    category || 'general',
    status || 'pending',
    start_date || null, due_date || null,
    notes || null,
    sort_order !== undefined ? sort_order : 0
  );

  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(milestone);
});

// Update milestone
router.put('/:id', requireAuth, requireProjectAccess('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM milestones WHERE id = ? AND project_id = ?').get(req.params.id, req.params.projectId);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, category, status, start_date, due_date, completed_date, notes, sort_order } = req.body;

  let resolvedCompletedDate = completed_date !== undefined ? completed_date : existing.completed_date;
  if (status === 'complete' && !resolvedCompletedDate) resolvedCompletedDate = new Date().toISOString().slice(0, 10);
  if (status && status !== 'complete') resolvedCompletedDate = null;

  db.prepare(`
    UPDATE milestones SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      status = COALESCE(?, status),
      start_date = ?,
      due_date = ?,
      completed_date = ?,
      notes = ?,
      sort_order = COALESCE(?, sort_order),
      updated_at = datetime('now')
    WHERE id = ? AND project_id = ?
  `).run(
    name || null, category || null, status || null,
    start_date !== undefined ? start_date : existing.start_date,
    due_date !== undefined ? due_date : existing.due_date,
    resolvedCompletedDate,
    notes !== undefined ? notes : existing.notes,
    sort_order !== undefined ? sort_order : null,
    req.params.id, req.params.projectId
  );

  const updated = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete milestone
router.delete('/:id', requireAuth, requireProjectAccess('admin'), (req, res) => {
  db.prepare('DELETE FROM milestones WHERE id = ? AND project_id = ?').run(req.params.id, req.params.projectId);
  res.json({ success: true });
});

module.exports = router;
