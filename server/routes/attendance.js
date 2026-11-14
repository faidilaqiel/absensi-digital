const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// Helper to get formatted current time or custom time HH:MM:SS
function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Helper to get today YYYY-MM-DD (WIB / Waktu Lokal Komputer)
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to calculate late minutes
function calculateLateMinutes(scanTime, limitTime = '07:00:00') {
  const [sh, sm, ss] = scanTime.split(':').map(Number);
  const [lh, lm, ls] = limitTime.split(':').map(Number);
  const scanSeconds = sh * 3600 + sm * 60 + (ss || 0);
  const limitSeconds = lh * 3600 + lm * 60 + (ls || 0);
  const diff = scanSeconds - limitSeconds;
  return diff > 0 ? Math.ceil(diff / 60) : 0;
}

// POST /api/attendance/scan
router.post('/scan', authenticateToken, authorizeRoles('admin', 'petugas'), async (req, res) => {
  try {
    const { qr_code, custom_time, custom_date } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error_code: 'EMPTY_QR',
        message: 'Barcode/QR Code tidak boleh kosong.'
      });
    }

    // 1. Search student by QR Code or NISN
    const student = db.prepare(`
      SELECT s.*, c.name as class_name, c.homeroom_teacher
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.qr_code = ? OR s.nisn = ?
    `).get(qr_code.trim(), qr_code.trim());

    if (!student) {
      return res.status(404).json({
        success: false,
        error_code: 'NOT_FOUND',
        message: 'Kartu QR Code tidak terdaftar di sistem SDN Pengampon 3.'
      });
    }

    // 2. Check student status & status_siswa (Hanya siswa berstatus 'Aktif' yang boleh absen)
    if (student.status !== 'active' || (student.status_siswa && student.status_siswa !== 'Aktif')) {
      const keteranganStatus = student.status_siswa || student.status;
      return res.status(400).json({
        success: false,
        error_code: 'STUDENT_INACTIVE',
        message: `Siswa ${student.name} berstatus "${keteranganStatus}". Siswa tidak dapat melakukan absensi.`
      });
    }

    const date = custom_date || getTodayDate();
    const time = custom_time || getCurrentTime();

    // 3. Check duplicate attendance today
    const existing = db.prepare(`
      SELECT * FROM attendances WHERE student_id = ? AND date = ?
    `).get(student.id, date);

    if (existing) {
      return res.status(409).json({
        success: false,
        error_code: 'DUPLICATE_SCAN',
        message: `Pencegahan Absensi Ganda! ${student.name} sudah melakukan absensi hari ini pukul ${existing.time} dengan status "${existing.status.toUpperCase()}".`,
        student: {
          name: student.name,
          nisn: student.nisn,
          class_name: student.class_name,
          recorded_time: existing.time,
          status: existing.status
        }
      });
    }

    // Ambil tahun ajaran aktif untuk disimpan ke kolom academic_year_id
    const activeAY = db.prepare('SELECT id FROM academic_years WHERE is_active = 1 LIMIT 1').get();
    const currentAYId = activeAY ? activeAY.id : 1;

    // 4. Check on-time or late
    // Ambil setting jam batas tepat waktu (default 07:00:00)
    const onTimeSetting = db.prepare("SELECT value FROM settings WHERE key = 'check_in_ontime_limit'").get();
    const limitTime = onTimeSetting ? onTimeSetting.value : '07:00';
    const fullLimitTime = limitTime.length === 5 ? `${limitTime}:00` : limitTime;

    let status = 'hadir';
    let notes = '';
    const lateMinutes = calculateLateMinutes(time, fullLimitTime);

    if (lateMinutes > 0) {
      status = 'terlambat';
      notes = `Terlambat ${lateMinutes} menit (Batas: ${limitTime})`;
    }

    // 5. Save attendance record dengan academic_year_id
    const insertStmt = db.prepare(`
      INSERT INTO attendances (student_id, academic_year_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr_scan')
    `);

    const result = insertStmt.run(
      student.id,
      currentAYId,
      student.class_id,
      date,
      time,
      status,
      notes,
      req.user.id,
      req.user.name
    );

    // Sinkronkan ke MySQL secara real-time
    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'absensi_sdnp3'
      });
      await conn.query(
        `INSERT INTO attendances (id, student_id, academic_year_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr_scan')
         ON DUPLICATE KEY UPDATE status = VALUES(status), time = VALUES(time), notes = VALUES(notes)`,
        [result.lastInsertRowid, student.id, currentAYId, student.class_id, date, time, status, notes, req.user.id, req.user.name]
      );
      await conn.end();
    } catch (mysqlErr) {
      console.warn('MySQL scan sync warning:', mysqlErr.message);
    }

    res.json({
      success: true,
      attendance_id: result.lastInsertRowid,
      message: status === 'hadir'
        ? `Absensi Berhasil! Selamat pagi, ${student.name}.`
        : `Absensi Berhasil (Terlambat ${lateMinutes} menit). Selamat pagi, ${student.name}.`,
      data: {
        student_id: student.id,
        name: student.name,
        nisn: student.nisn,
        class_name: student.class_name,
        homeroom_teacher: student.homeroom_teacher,
        photo_url: student.photo_url,
        date,
        time,
        status,
        late_minutes: lateMinutes,
        notes,
        recorded_by: req.user.name
      }
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ success: false, error_code: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/attendance/manual (Jika lupa kartu atau otorisasi petugas)
router.post('/manual', authenticateToken, authorizeRoles('admin', 'petugas', 'guru'), async (req, res) => {
  try {
    const { student_id, date, time, status, notes } = req.body;

    if (!student_id || !status) {
      return res.status(400).json({ error: 'Siswa dan status kehadiran wajib dipilih.' });
    }

    const student = db.prepare('SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    // Wali kelas hanya boleh untuk rombelnya sendiri
    if (req.user.role === 'guru' && req.user.assigned_class_id && req.user.assigned_class_id !== student.class_id) {
      return res.status(403).json({ error: 'Anda hanya memiliki izin mencatat absensi untuk rombel Anda sendiri.' });
    }

    const attDate = date || getTodayDate();
    const attTime = time || getCurrentTime();

    // Check duplicate
    const existing = db.prepare('SELECT * FROM attendances WHERE student_id = ? AND date = ?').get(student_id, attDate);
    if (existing) {
      return res.status(409).json({
        error: `Siswa ini sudah memiliki catatan absensi pada ${attDate} (Status: ${existing.status}). Silakan lakukan edit/koreksi jika ada perubahan.`
      });
    }

    const fullNotes = notes ? `Pencatatan Manual: ${notes}` : 'Pencatatan Manual (Siswa lupa bawa kartu)';

    const insertStmt = db.prepare(`
      INSERT INTO attendances (student_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual_authorized')
    `);

    const result = insertStmt.run(student.id, student.class_id, attDate, attTime, status, fullNotes, req.user.id, req.user.name);

    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'absensi_sdnp3'
      });
      await conn.query(
        `INSERT INTO attendances (id, student_id, academic_year_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_authorized')
         ON DUPLICATE KEY UPDATE status = VALUES(status), time = VALUES(time), notes = VALUES(notes)`,
        [result.lastInsertRowid, student.id, 1, student.class_id, attDate, attTime, status, fullNotes, req.user.id, req.user.name]
      );
      await conn.end();
    } catch (mysqlErr) {
      console.warn('MySQL manual sync warning:', mysqlErr.message);
    }

    res.json({
      message: `Pencatatan manual untuk ${student.name} (${student.class_name}) berhasil disimpan.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/sync-offline (Sinkronisasi antrean scan saat HP offline kembali online)
router.post('/sync-offline', authenticateToken, authorizeRoles('admin', 'petugas'), (req, res) => {
  try {
    const { queue } = req.body; // Array of { qr_code, date, time, method }

    if (!Array.isArray(queue) || queue.length === 0) {
      return res.status(400).json({ error: 'Antrean sinkronisasi kosong.' });
    }

    const onTimeSetting = db.prepare("SELECT value FROM settings WHERE key = 'check_in_ontime_limit'").get();
    const limitTime = onTimeSetting ? onTimeSetting.value : '07:00';
    const fullLimitTime = limitTime.length === 5 ? `${limitTime}:00` : limitTime;

    let synced = 0;
    let skipped = 0;
    const errors = [];

    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item.qr_code) {
          skipped++;
          continue;
        }

        const student = db.prepare(`
          SELECT s.*, c.name as class_name
          FROM students s
          JOIN classes c ON s.class_id = c.id
          WHERE s.qr_code = ? OR s.nisn = ?
        `).get(item.qr_code.trim(), item.qr_code.trim());

        if (!student) {
          skipped++;
          errors.push(`Barcode ${item.qr_code} tidak ditemukan.`);
          continue;
        }

        const date = item.date || getTodayDate();
        const time = item.time || getCurrentTime();

        // Check duplicate
        const exists = db.prepare('SELECT id FROM attendances WHERE student_id = ? AND date = ?').get(student.id, date);
        if (exists) {
          skipped++;
          continue;
        }

        const lateMinutes = calculateLateMinutes(time, fullLimitTime);
        const status = lateMinutes > 0 ? 'terlambat' : 'hadir';
        const notes = lateMinutes > 0 ? `Sinkron Offline: Terlambat ${lateMinutes} menit` : 'Sinkron Offline (Disimpan saat offline)';

        db.prepare(`
          INSERT INTO attendances (student_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'offline_synced')
        `).run(student.id, student.class_id, date, time, status, notes, req.user.id, req.user.name);

        synced++;
      }
    });

    transaction(queue);

    res.json({
      message: `Sinkronisasi berhasil: ${synced} absensi tersimpan, ${skipped} dilewati.`,
      synced,
      skipped,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/history (Riwayat absensi lengkap)
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { date, start_date, end_date, class_id, academic_year_id, status, search } = req.query;

    let query = `
      SELECT a.*, s.name as student_name, s.nisn, s.nis, s.gender, s.photo_url,
             c.name as class_name, c.level as class_level
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Guru/Wali kelas hanya dapat melihat rombelnya sendiri
    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND a.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      query += ` AND a.class_id = ?`;
      params.push(class_id);
    }

    if (academic_year_id) {
      query += ` AND c.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    } else if (start_date && end_date) {
      query += ` AND a.date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (s.name LIKE ? OR s.nisn LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.date DESC, a.time DESC`;

    const records = db.prepare(query).all(...params);
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendance/:id (Koreksi data absensi)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'petugas', 'guru'), (req, res) => {
  try {
    const { status, notes, time } = req.body;
    const attId = req.params.id;

    const current = db.prepare('SELECT * FROM attendances WHERE id = ?').get(attId);
    if (!current) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    // Role guru check
    if (req.user.role === 'guru' && req.user.assigned_class_id && req.user.assigned_class_id !== current.class_id) {
      return res.status(403).json({ error: 'Anda hanya dapat mengoreksi data rombel Anda sendiri.' });
    }

    const newStatus = status || current.status;
    const newNotes = notes !== undefined ? `${notes} (Dikoreksi oleh ${req.user.name})` : current.notes;
    const newTime = time || current.time;

    db.prepare(`
      UPDATE attendances
      SET status = ?, notes = ?, time = ?
      WHERE id = ?
    `).run(newStatus, newNotes, newTime, attId);

    res.json({ message: 'Data absensi berhasil dikoreksi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance/reset (Hapus massal / reset data absensi)
router.delete('/reset', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { mode, date, academic_year_id } = req.body;
    // mode: 'today', 'filtered_date', 'all'
    let query = 'DELETE FROM attendances';
    let params = [];
    let mysqlQuery = 'DELETE FROM attendances';
    let mysqlParams = [];

    if (mode === 'today') {
      const today = getTodayDate();
      query += ' WHERE date = ?';
      params.push(today);
      mysqlQuery += ' WHERE date = ?';
      mysqlParams.push(today);
    } else if (mode === 'date' && date) {
      query += ' WHERE date = ?';
      params.push(date);
      mysqlQuery += ' WHERE date = ?';
      mysqlParams.push(date);
    } else if (mode === 'academic_year' && academic_year_id) {
      query += ' WHERE academic_year_id = ?';
      params.push(academic_year_id);
      mysqlQuery += ' WHERE academic_year_id = ?';
      mysqlParams.push(academic_year_id);
    } else if (mode === 'all') {
      // Hapus seluruh data absensi
    } else {
      return res.status(400).json({ error: 'Mode reset tidak valid.' });
    }

    const info = db.prepare(query).run(...params);

    // Sinkronkan juga ke MySQL jika ada
    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'absensi_sdnp3'
      });
      await conn.query(mysqlQuery, mysqlParams);
      await conn.end();
    } catch (mysqlErr) {
      console.warn('MySQL reset sync warning:', mysqlErr.message);
    }

    res.json({
      success: true,
      deleted_count: info.changes,
      message: `Berhasil mereset data absensi (${info.changes} catatan dihapus).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    db.prepare('DELETE FROM attendances WHERE id = ?').run(req.params.id);

    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'absensi_sdnp3'
      });
      await conn.query('DELETE FROM attendances WHERE id = ?', [req.params.id]);
      await conn.end();
    } catch (mysqlErr) {
      console.warn('MySQL delete sync warning:', mysqlErr.message);
    }

    res.json({ message: 'Catatan absensi berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

