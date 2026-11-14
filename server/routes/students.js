const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// GET /api/students
router.get('/', authenticateToken, (req, res) => {
  try {
    const { class_id, academic_year_id, search, status } = req.query;
    let query = `
      SELECT s.*, c.name as class_name, c.level as class_level
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter guru/wali kelas to their own class if assigned
    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND s.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      query += ` AND s.class_id = ?`;
      params.push(class_id);
    }

    if (academic_year_id) {
      query += ` AND c.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    if (status) {
      if (status === 'active') {
        query += ` AND s.status = 'active' AND (s.status_siswa = 'Aktif' OR s.status_siswa IS NULL)`;
      } else if (status === 'inactive') {
        query += ` AND (s.status = 'inactive' OR s.status_siswa IN ('Lulus', 'Pindah'))`;
      } else {
        query += ` AND s.status_siswa = ?`;
        params.push(status);
      }
    }

    if (search) {
      query += ` AND (s.name LIKE ? OR s.nisn LIKE ? OR s.nis LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.level, c.name, s.name ASC`;

    const students = db.prepare(query).all(...params);
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const student = db.prepare(`
      SELECT s.*, c.name as class_name, c.homeroom_teacher
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { nisn, nis, name, gender, class_id, parent_phone, photo_url } = req.body;

    if (!nisn || !name || !gender || !class_id) {
      return res.status(400).json({ error: 'NISN, Nama, Jenis Kelamin, dan Kelas wajib diisi.' });
    }

    // Check existing NISN
    const existing = db.prepare('SELECT id FROM students WHERE nisn = ?').get(nisn.trim());
    if (existing) {
      return res.status(400).json({ error: 'Siswa dengan NISN ini sudah terdaftar.' });
    }

    // Generate unique QR Code
    const qrCode = `SDNP3-${nisn.trim()}`;

    const stmt = db.prepare(`
      INSERT INTO students (nisn, nis, name, gender, class_id, qr_code, parent_phone, photo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(nisn.trim(), nis ? nis.trim() : null, name.trim(), gender, class_id, qrCode, parent_phone || null, photo_url || null);

    res.status(201).json({
      message: 'Siswa berhasil ditambahkan.',
      studentId: result.lastInsertRowid,
      qr_code: qrCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { nisn, nis, name, gender, class_id, parent_phone, photo_url, status } = req.body;
    const studentId = req.params.id;

    const current = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!current) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    // If NISN is updated, check conflict
    if (nisn && nisn !== current.nisn) {
      const conflict = db.prepare('SELECT id FROM students WHERE nisn = ? AND id != ?').get(nisn.trim(), studentId);
      if (conflict) {
        return res.status(400).json({ error: 'NISN sudah digunakan oleh siswa lain.' });
      }
    }

    const newNisn = nisn ? nisn.trim() : current.nisn;
    const newName = name ? name.trim() : current.name;
    const newGender = gender || current.gender;
    const newClassId = class_id || current.class_id;
    const newNis = nis !== undefined ? nis : current.nis;
    const newPhone = parent_phone !== undefined ? parent_phone : current.parent_phone;
    const newPhoto = photo_url !== undefined ? photo_url : current.photo_url;
    const newStatus = status || current.status;

    db.prepare(`
      UPDATE students 
      SET nisn = ?, nis = ?, name = ?, gender = ?, class_id = ?, parent_phone = ?, photo_url = ?, status = ?
      WHERE id = ?
    `).run(newNisn, newNis, newName, newGender, newClassId, newPhone, newPhoto, newStatus, studentId);

    res.json({ message: 'Data siswa berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const studentId = req.params.id;

    // Check attendance records
    const attCount = db.prepare('SELECT COUNT(*) as count FROM attendances WHERE student_id = ?').get(studentId);
    if (attCount.count > 0) {
      // Soft delete: set status to inactive
      db.prepare("UPDATE students SET status = 'inactive' WHERE id = ?").run(studentId);
      return res.json({ message: 'Siswa memiliki riwayat absensi, status dinonaktifkan (arsip).' });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    res.json({ message: 'Data siswa berhasil dihapus secara permanen.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/:id/regenerate-qr (Cetak ulang jika kartu hilang)
router.post('/:id/regenerate-qr', authenticateToken, authorizeRoles('admin', 'petugas'), (req, res) => {
  try {
    const studentId = req.params.id;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    // Generate random suffix to invalidate old stolen/lost card
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newQr = `SDNP3-${student.nisn}-${randomSuffix}`;

    db.prepare('UPDATE students SET qr_code = ? WHERE id = ?').run(newQr, studentId);

    res.json({
      message: 'QR Code baru berhasil dibuat. Kartu lama otomatis tidak berlaku lagi.',
      qr_code: newQr
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/import (Bulk import dari file Excel/JSON)
router.post('/import', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Data siswa dalam format array wajib diisi.' });
    }

    const classes = db.prepare('SELECT id, name FROM classes').all();
    const classMap = {};
    classes.forEach(c => {
      classMap[c.name.toLowerCase().trim()] = c.id;
    });

    const insertStmt = db.prepare(`
      INSERT INTO students (nisn, nis, name, gender, class_id, qr_code, parent_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    let imported = 0;
    let skipped = 0;

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        if (!row.nisn || !row.name || !row.class_name) {
          skipped++;
          continue;
        }

        const normClass = row.class_name.toString().toLowerCase().trim();
        const classId = classMap[normClass] || (classes[0] ? classes[0].id : 1);

        const exists = db.prepare('SELECT id FROM students WHERE nisn = ?').get(row.nisn.toString().trim());
        if (exists) {
          skipped++;
          continue;
        }

        const qr = `SDNP3-${row.nisn.toString().trim()}`;
        const gender = (row.gender && row.gender.toString().toUpperCase().startsWith('P')) ? 'P' : 'L';

        insertStmt.run(
          row.nisn.toString().trim(),
          row.nis ? row.nis.toString().trim() : null,
          row.name.toString().trim(),
          gender,
          classId,
          qr,
          row.parent_phone ? row.parent_phone.toString().trim() : null
        );
        imported++;
      }
    });

    transaction(students);

    res.json({
      message: `Impor berhasil: ${imported} siswa ditambahkan, ${skipped} dilewati (duplikat/tidak lengkap).`,
      imported,
      skipped
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

