const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// GET /api/settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const settings = req.body;
    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const updateMany = db.transaction((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          upsertStmt.run(key, String(value));
        }
      }
    });

    updateMany(settings);
    res.json({ message: 'Pengaturan sistem berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/backup-db (Download database SQLite)
router.get('/backup-db', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const dbFilePath = path.join(__dirname, '..', '..', 'attendance.db');
    const dateStr = new Date().toISOString().split('T')[0];
    res.download(dbFilePath, `backup_absensi_sdnpengampon3_${dateStr}.db`);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mendownload backup: ' + err.message });
  }
});

module.exports = router;

