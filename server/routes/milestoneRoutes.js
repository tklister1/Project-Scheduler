const router = require('express').Router({ mergeParams: true });
const { query } = require('../db');
const { requireAuth, requireProjectAccess } = require('../auth');

router.get('/', requireAuth, requireProjectAccess('viewer'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY due_date, name', [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { name, category, status, due_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows: [milestone] } = await query(`
      INSERT INTO milestones (project_id, name, category, status, due_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.params.projectId, name, category || 'general', status || 'pending', due_date || null, notes || null]);
    res.status(201).json(milestone);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    const { rows: [existing] } = await query('SELECT * FROM milestones WHERE id = $1 AND project_id = $2', [req.params.id, req.params.projectId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, category, status, due_date, completed_date, notes } = req.body;

    let resolvedCompletedDate = completed_date !== undefined ? completed_date : existing.completed_date;
    if (status === 'complete' && !resolvedCompletedDate) resolvedCompletedDate = new Date().toISOString().slice(0, 10);
    if (status && status !== 'complete') resolvedCompletedDate = null;

    await query(`
      UPDATE milestones SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        status = COALESCE($3, status),
        due_date = $4,
        completed_date = $5,
        notes = $6,
        updated_at = NOW()
      WHERE id = $7 AND project_id = $8
    `, [
      name || null, category || null, status || null,
      due_date !== undefined ? due_date : existing.due_date,
      resolvedCompletedDate,
      notes !== undefined ? notes : existing.notes,
      req.params.id, req.params.projectId
    ]);

    const { rows: [updated] } = await query('SELECT * FROM milestones WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, requireProjectAccess('admin'), async (req, res) => {
  try {
    await query('DELETE FROM milestones WHERE id = $1 AND project_id = $2', [req.params.id, req.params.projectId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
