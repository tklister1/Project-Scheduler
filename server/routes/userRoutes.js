const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

// List all users (admin only)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, email, name, is_global_admin, created_at FROM users ORDER BY name').all();
  res.json(users);
});

// Create user (admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { email, password, name, is_global_admin } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, is_global_admin) VALUES (?, ?, ?, ?)'
    ).run(email.toLowerCase().trim(), hash, name, is_global_admin ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, email, name, is_global_admin: is_global_admin ? 1 : 0 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, is_global_admin } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
  }
  if (name || email !== undefined || is_global_admin !== undefined) {
    const updates = [];
    const vals = [];
    if (name) { updates.push('name = ?'); vals.push(name); }
    if (email) { updates.push('email = ?'); vals.push(email.toLowerCase().trim()); }
    if (is_global_admin !== undefined) { updates.push('is_global_admin = ?'); vals.push(is_global_admin ? 1 : 0); }
    if (updates.length) {
      vals.push(req.params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
    }
  }
  const updated = db.prepare('SELECT id, email, name, is_global_admin, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
