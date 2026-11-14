const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// GET /api/users
router.get('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.assigned_class_id, u.phone, u.status, u.created_at,
             c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.assigned_class_id = c.id
      ORDER BY u.role, u.name ASC
    `).all();

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { username, password, name, role, assigned_class_id, phone } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Username, password, nama, dan role wajib diisi.' });
    }

    if (!['admin', 'petugas', 'guru', 'kepsek'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    let cleanClassId = null;
    if (assigned_class_id !== undefined && assigned_class_id !== null && assigned_class_id !== '' && Number(assigned_class_id) > 0) {
      cleanClassId = Number(assigned_class_id);
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, password, name, role, assigned_class_id, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);

    stmt.run(username.trim(), hashedPassword, name.trim(), role, cleanClassId, phone || null);

    res.status(201).json({ message: 'Pengguna baru berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { username, password, name, role, assigned_class_id, phone, status } = req.body;
    const userId = req.params.id;

    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!current) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    let passwordHash = current.password;
    if (password && password.trim().length > 0) {
      passwordHash = bcrypt.hashSync(password, 10);
    }

    // Parse assigned_class_id: null if empty string, 0, or not a valid number
    let cleanClassId = null;
    if (assigned_class_id !== undefined && assigned_class_id !== null && assigned_class_id !== '' && Number(assigned_class_id) > 0) {
      cleanClassId = Number(assigned_class_id);
    }

    db.prepare(`
      UPDATE users
      SET username = COALESCE(?, username),
          password = ?,
          name = COALESCE(?, name),
          role = COALESCE(?, role),
          assigned_class_id = ?,
          phone = ?,
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      username ? username.trim() : current.username,
      passwordHash,
      name ? name.trim() : current.name,
      role || current.role,
      cleanClassId,
      phone !== undefined ? phone : current.phone,
      status || current.status,
      userId
    );

    res.json({ message: 'Data pengguna berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const userId = req.params.id;
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri saat sedang login.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'Pengguna berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

