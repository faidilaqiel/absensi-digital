const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../auth');

// GET /api/classes
router.get('/', authenticateToken, (req, res) => {
  try {
    const { academic_year_id } = req.query;
    let query = `
      SELECT c.*, ay.name as academic_year_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
      FROM classes c
      JOIN academic_years ay ON c.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND c.id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (academic_year_id) {
      query += ` AND c.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    query += ` ORDER BY c.level, c.name ASC`;

    const classes = db.prepare(query).all(...params);
    res.json({ classes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/academic-years
router.get('/academic-years', authenticateToken, (req, res) => {
  try {
    const years = db.prepare('SELECT * FROM academic_years ORDER BY id DESC').all();
    res.json({ years });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/academic-years (Buat Tahun Ajaran Baru)
router.post('/academic-years', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, copy_classes = true, set_active = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama tahun ajaran baru wajib diisi (misal: 2026/2027 atau 2027/2028).' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT * FROM academic_years WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ error: `Tahun ajaran "${trimmedName}" sudah ada di sistem.` });
    }

    // Ambil tahun ajaran aktif sebelumnya
    const currentActive = db.prepare('SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1').get();

    const insertAY = db.transaction(() => {
      // 1. Jika di-set aktif, nonaktifkan tahun ajaran lainnya
      if (set_active) {
        db.prepare('UPDATE academic_years SET is_active = 0').run();
      }

      // 2. Masukkan tahun ajaran baru
      const ayResult = db.prepare('INSERT INTO academic_years (name, is_active) VALUES (?, ?)').run(
        trimmedName,
        set_active ? 1 : 0
      );
      const newAYId = ayResult.lastInsertRowid;

      // Update pengaturan active_academic_year jika set_active
      if (set_active) {
        db.prepare(`
          INSERT INTO settings (key, value) VALUES ('active_academic_year', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(trimmedName);
      }

      // 3. Salin 7 rombel default dari tahun ajaran sebelumnya jika dipilih
      let createdClassesCount = 0;
      if (copy_classes && currentActive) {
        const oldClasses = db.prepare('SELECT name, level, homeroom_teacher FROM classes WHERE academic_year_id = ?').all(currentActive.id);
        const insertClass = db.prepare(`
          INSERT INTO classes (name, level, academic_year_id, homeroom_teacher)
          VALUES (?, ?, ?, ?)
        `);
        for (const cls of oldClasses) {
          insertClass.run(cls.name, cls.level, newAYId, cls.homeroom_teacher);
          createdClassesCount++;
        }
      }

      return { newAYId, createdClassesCount };
    });

    const result = insertAY();

    res.status(201).json({
      success: true,
      message: `Tahun Ajaran baru "${trimmedName}" berhasil dibuat dan diaktifkan! Data dashboard kini dimulai kembali dari angka 0.`,
      academic_year_id: result.newAYId,
      classes_created: result.createdClassesCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/classes/academic-years/:id/activate (Ganti Tahun Ajaran Aktif)
router.put('/academic-years/:id/activate', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const ayId = req.params.id;
    const target = db.prepare('SELECT * FROM academic_years WHERE id = ?').get(ayId);
    if (!target) {
      return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan.' });
    }

    const switchActive = db.transaction(() => {
      db.prepare('UPDATE academic_years SET is_active = 0').run();
      db.prepare('UPDATE academic_years SET is_active = 1 WHERE id = ?').run(ayId);
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('active_academic_year', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(target.name);
    });

    switchActive();

    res.json({
      success: true,
      message: `Tahun ajaran aktif berhasil dialihkan ke "${target.name}".`,
      active_year: target
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/promote-classes (Proses Kenaikan Kelas Massal)
router.post('/promote-classes', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { target_academic_year_id } = req.body;
    
    // Tentukan tahun ajaran target (jika tidak dikirim, gunakan tahun ajaran aktif)
    let targetAY = null;
    if (target_academic_year_id) {
      targetAY = db.prepare('SELECT * FROM academic_years WHERE id = ?').get(target_academic_year_id);
    } else {
      targetAY = db.prepare('SELECT * FROM academic_years WHERE is_active = 1').get();
    }

    if (!targetAY) {
      return res.status(400).json({ error: 'Tahun ajaran tujuan tidak ditemukan.' });
    }

    // CEK: Cegah eksekusi ganda jika kenaikan kelas sudah pernah diproses pada tahun ajaran ini
    if (targetAY.is_promoted) {
      return res.status(400).json({
        error: `Kenaikan kelas untuk tahun ajaran ${targetAY.name} sudah selesai diproses sebelumnya dan tidak dapat dijalankan dua kali.`
      });
    }

    // Ambil rombel pada tahun ajaran target
    const targetClasses = db.prepare('SELECT * FROM classes WHERE academic_year_id = ? ORDER BY level, name').all(targetAY.id);
    if (targetClasses.length === 0) {
      return res.status(400).json({ error: 'Belum ada rombel di tahun ajaran tujuan. Pastikan rombel sudah tersedia.' });
    }

    // Buat map rombel target berdasarkan nama
    const targetClassMap = {};
    targetClasses.forEach(c => {
      targetClassMap[c.name] = c.id;
    });

    const runPromotion = db.transaction(() => {
      // 1. Siswa di Kelas 6 (level 6) diubah statusnya menjadi 'Lulus'
      const graduatedResult = db.prepare(`
        UPDATE students 
        SET status_siswa = 'Lulus'
        WHERE class_id IN (SELECT id FROM classes WHERE level = 6)
          AND status_siswa = 'Aktif'
      `).run();

      // 2. Naikkan kelas siswa aktif secara mundur (Level 5 -> 6, Level 4 -> 5, dst.)
      let totalPromoted = 0;

      // Pemetaan standar jenjang SD:
      // Kelas 5 -> Kelas 6
      if (targetClassMap['Kelas 6']) {
        const res5 = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 5')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 6']);
        totalPromoted += res5.changes;
      }

      // Kelas 4 -> Kelas 5
      if (targetClassMap['Kelas 5']) {
        const res4 = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 4')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 5']);
        totalPromoted += res4.changes;
      }

      // Kelas 3 -> Kelas 4
      if (targetClassMap['Kelas 4']) {
        const res3 = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 3')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 4']);
        totalPromoted += res3.changes;
      }

      // Kelas 2B -> Kelas 3
      if (targetClassMap['Kelas 3']) {
        const res2b = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 2B')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 3']);
        totalPromoted += res2b.changes;
      }

      // Kelas 2A -> Kelas 3
      if (targetClassMap['Kelas 3']) {
        const res2a = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 2A')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 3']);
        totalPromoted += res2a.changes;
      }

      // Kelas 1 -> Kelas 2A
      if (targetClassMap['Kelas 2A']) {
        const res1 = db.prepare(`
          UPDATE students 
          SET class_id = ? 
          WHERE class_id IN (SELECT id FROM classes WHERE name = 'Kelas 1')
            AND status_siswa = 'Aktif'
        `).run(targetClassMap['Kelas 2A']);
        totalPromoted += res1.changes;
      }

      // 3. Kunci status kenaikan kelas untuk tahun ajaran ini
      db.prepare('UPDATE academic_years SET is_promoted = 1 WHERE id = ?').run(targetAY.id);

      return {
        graduated: graduatedResult.changes,
        promoted: totalPromoted
      };
    });

    const outcome = runPromotion();

    res.json({
      success: true,
      message: `Proses Kenaikan Kelas Berhasil!\n- ${outcome.promoted} siswa berhasil naik kelas.\n- ${outcome.graduated} siswa Kelas 6 resmi berstatus 'Lulus'.`,
      promoted_count: outcome.promoted,
      graduated_count: outcome.graduated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, level, academic_year_id, homeroom_teacher } = req.body;

    if (!name || !level || !academic_year_id) {
      return res.status(400).json({ error: 'Nama rombel, tingkat (1-6), dan tahun ajaran wajib diisi.' });
    }

    const existing = db.prepare('SELECT id FROM classes WHERE name = ? AND academic_year_id = ?').get(name.trim(), academic_year_id);
    if (existing) {
      return res.status(400).json({ error: 'Nama rombel sudah ada pada tahun ajaran ini.' });
    }

    const stmt = db.prepare(`
      INSERT INTO classes (name, level, academic_year_id, homeroom_teacher)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(name.trim(), level, academic_year_id, homeroom_teacher ? homeroom_teacher.trim() : null);

    res.status(201).json({
      message: 'Rombongan belajar berhasil ditambahkan.',
      classId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/classes/:id
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, level, homeroom_teacher } = req.body;
    const classId = req.params.id;

    const current = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    if (!current) {
      return res.status(404).json({ error: 'Rombel tidak ditemukan.' });
    }

    db.prepare(`
      UPDATE classes
      SET name = COALESCE(?, name),
          level = COALESCE(?, level),
          homeroom_teacher = COALESCE(?, homeroom_teacher)
      WHERE id = ?
    `).run(name, level, homeroom_teacher, classId);

    res.json({ message: 'Rombongan belajar berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const classId = req.params.id;
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE class_id = ?').get(classId);
    if (studentCount.count > 0) {
      return res.status(400).json({ error: `Tidak dapat menghapus rombel. Masih terdapat ${studentCount.count} siswa di kelas ini.` });
    }

    db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
    res.json({ message: 'Rombel berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

