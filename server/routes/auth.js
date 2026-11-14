const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authenticateToken } = require('../auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const user = db.prepare(`
    SELECT u.*, c.name as class_name 
    FROM users u 
    LEFT JOIN classes c ON u.assigned_class_id = c.id 
    WHERE u.username = ? AND u.status = 'active'
  `).get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah, atau akun nonaktif.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const token = generateToken(user);
  res.json({
    message: 'Login berhasil',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      assigned_class_id: user.assigned_class_id,
      class_name: user.class_name,
      phone: user.phone
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.assigned_class_id, u.phone, u.status, c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.assigned_class_id = c.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  res.json({ user });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
  }

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(400).json({ error: 'Password lama tidak sesuai.' });
  }

  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);

  res.json({ message: 'Password berhasil diperbarui.' });
});

module.exports = router;

