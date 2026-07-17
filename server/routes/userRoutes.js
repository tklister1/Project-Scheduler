const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, email, name, is_global_admin, created_at FROM users ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, is_global_admin } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, name, is_global_admin) VALUES ($1, $2, $3, $4) RETURNING id, email, name, is_global_admin',
      [email.toLowerCase().trim(), hash, name, is_global_admin ? 1 : 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, is_global_admin } = req.body;
    if (password) {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(password, 10), req.params.id]);
    }
    if (name || email || is_global_admin !== undefined) {
      const updates = [], vals = [];
      if (name) { updates.push(`name = $${vals.length + 1}`); vals.push(name); }
      if (email) { updates.push(`email = $${vals.length + 1}`); vals.push(email.toLowerCase().trim()); }
      if (is_global_admin !== undefined) { updates.push(`is_global_admin = $${vals.length + 1}`); vals.push(is_global_admin ? 1 : 0); }
      if (updates.length) {
        vals.push(req.params.id);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${vals.length}`, vals);
      }
    }
    const { rows } = await query('SELECT id, email, name, is_global_admin, created_at FROM users WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
