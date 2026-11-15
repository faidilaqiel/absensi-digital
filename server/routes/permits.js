const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// GET /api/permits (Daftar siswa izin / sakit / alpa)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { date, start_date, end_date, class_id, status } = req.query;

    let query = `
      SELECT a.*, s.name as student_name, s.nisn, s.gender,
             c.name as class_name, c.homeroom_teacher
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.status IN ('izin', 'sakit', 'alpa')
    `;
    const params = [];

    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND a.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      query += ` AND a.class_id = ?`;
      params.push(class_id);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    } else if (start_date && end_date) {
      query += ` AND a.date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY a.date DESC, s.name ASC`;

    const records = db.prepare(query).all(...params);
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/permits (Catat izin / sakit / alpa)
router.post('/', authenticateToken, authorizeRoles('admin', 'petugas', 'guru'), async (req, res) => {
  try {
    const { student_id, date, status, notes } = req.body;

    if (!student_id || !status) {
      return res.status(400).json({ error: 'Siswa dan status ketidakhadiran (izin/sakit/alpa) wajib diisi.' });
    }

    if (!['izin', 'sakit', 'alpa'].includes(status)) {
      return res.status(400).json({ error: 'Status harus salah satu dari: izin, sakit, alpa.' });
    }

    const student = db.prepare('SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    if (req.user.role === 'guru' && req.user.assigned_class_id && req.user.assigned_class_id !== student.class_id) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola izin/sakit siswa di rombel Anda sendiri.' });
    }

    const attDate = date || new Date().toISOString().split('T')[0];

    // Check existing
    const existing = db.prepare('SELECT * FROM attendances WHERE student_id = ? AND date = ?').get(student_id, attDate);
    let recordId;
    if (existing) {
      db.prepare(`
        UPDATE attendances
        SET status = ?, notes = ?, recorded_by_user_id = ?, recorded_by_name = ?, method = 'manual_authorized'
        WHERE id = ?
      `).run(status, notes || '', req.user.id, req.user.name, existing.id);
      recordId = existing.id;
    } else {
      const activeAY = db.prepare("SELECT id FROM academic_years WHERE is_active = 1").get();
      const ayId = activeAY ? activeAY.id : null;
      const info = db.prepare(`
        INSERT INTO attendances (student_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method, academic_year_id)
        VALUES (?, ?, ?, '07:00:00', ?, ?, ?, ?, 'manual_authorized', ?)
      `).run(student.id, student.class_id, attDate, status, notes || '', req.user.id, req.user.name, ayId);
      recordId = info.lastInsertRowid;
    }

    // Sync real-time ke MySQL jika terhubung
    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'absensi_sdnp3'
      });
      await conn.query(
        `INSERT INTO attendances (id, student_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
         VALUES (?, ?, ?, ?, '07:00:00', ?, ?, ?, ?, 'manual_authorized')
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), recorded_by_user_id = VALUES(recorded_by_user_id), recorded_by_name = VALUES(recorded_by_name)`,
        [recordId, student.id, student.class_id, attDate, status, notes || '', req.user.id, req.user.name]
      );
      await conn.end();
    } catch (mysqlErr) {
      console.warn('MySQL permits sync warning:', mysqlErr.message);
    }

    if (existing) {
      return res.json({ message: `Status ketidakhadiran ${student.name} berhasil diperbarui menjadi ${status.toUpperCase()}.` });
    }
    res.json({ message: `Ketidakhadiran (${status.toUpperCase()}) untuk ${student.name} berhasil dicatat.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

