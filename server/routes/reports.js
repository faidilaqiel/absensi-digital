const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth');

// GET /api/reports/recap (Rekap per rombel/kelas dalam rentang tanggal)
router.get('/recap', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, class_id, academic_year_id } = req.query;

    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || startDate;

    let classQuery = 'SELECT id, name, level, homeroom_teacher FROM classes WHERE 1=1';
    const params = [];

    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      classQuery += ' AND id = ?';
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      classQuery += ' AND id = ?';
      params.push(class_id);
    } else if (academic_year_id) {
      classQuery += ' AND academic_year_id = ?';
      params.push(academic_year_id);
    }

    classQuery += ' ORDER BY level, name';
    const classes = db.prepare(classQuery).all(...params);

    const result = classes.map(cls => {
      const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE class_id = ? AND status = "active"').get(cls.id).count;

      const stats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as hadir,
          COUNT(CASE WHEN a.status = 'terlambat' THEN 1 END) as terlambat,
          COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as sakit,
          COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as izin,
          COUNT(CASE WHEN a.status = 'alpa' THEN 1 END) as alpa,
          COUNT(*) as total_records
        FROM attendances a
        JOIN students s ON a.student_id = s.id
        WHERE a.class_id = ? AND a.date BETWEEN ? AND ?
      `).get(cls.id, startDate, endDate);

      const hadir = stats ? stats.hadir : 0;
      const terlambat = stats ? stats.terlambat : 0;
      const sakit = stats ? stats.sakit : 0;
      const izin = stats ? stats.izin : 0;
      const alpa = stats ? stats.alpa : 0;
      const totalAttended = hadir + terlambat;

      // Calculate days in range (approximate active school days)
      const daysCount = db.prepare('SELECT COUNT(DISTINCT date) as days FROM attendances WHERE date BETWEEN ? AND ?').get(startDate, endDate).days || 1;
      const expectedTotal = studentCount * daysCount;
      const percentage = expectedTotal > 0 ? Math.round((totalAttended / expectedTotal) * 100) : 0;

      return {
        class_id: cls.id,
        class_name: cls.name,
        homeroom_teacher: cls.homeroom_teacher,
        total_students: studentCount,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        total_attended: totalAttended,
        percentage
      };
    });

    res.json({
      start_date: startDate,
      end_date: endDate,
      recap: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/monthly-reward (Rekap siapa yang datang paling awal di setiap bulannya untuk REWARD)
router.get('/monthly-reward', authenticateToken, (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7); // Format YYYY-MM
    const classId = req.query.class_id;

    let query = `
      SELECT s.id as student_id, s.name as student_name, s.nisn, s.gender,
             c.name as class_name, c.homeroom_teacher,
             COUNT(CASE WHEN a.status = 'hadir' AND a.time <= '07:00:00' THEN 1 END) as ontime_days,
             COUNT(CASE WHEN a.status = 'hadir' AND a.time <= '06:45:00' THEN 1 END) as ultra_early_days,
             MIN(a.time) as earliest_time,
             AVG(
               CAST(strftime('%H', a.time) AS INT) * 3600 +
               CAST(strftime('%M', a.time) AS INT) * 60 +
               CAST(strftime('%S', a.time) AS INT)
             ) as avg_seconds,
             COUNT(*) as total_attended
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.date LIKE ? AND a.status = 'hadir'
    `;
    const params = [`${month}%`];

    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND a.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (classId) {
      query += ` AND a.class_id = ?`;
      params.push(classId);
    }

    query += `
      GROUP BY s.id
      HAVING ontime_days > 0
      ORDER BY ontime_days DESC, avg_seconds ASC
      LIMIT 20
    `;

    const candidates = db.prepare(query).all(...params).map((c, index) => {
      const avgSec = Math.round(c.avg_seconds || 0);
      const h = String(Math.floor(avgSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0');
      const s = String(avgSec % 60).padStart(2, '0');

      return {
        rank: index + 1,
        student_id: c.student_id,
        student_name: c.student_name,
        nisn: c.nisn,
        gender: c.gender,
        class_name: c.class_name,
        homeroom_teacher: c.homeroom_teacher,
        ontime_days: c.ontime_days,
        ultra_early_days: c.ultra_early_days,
        earliest_time: c.earliest_time,
        avg_arrival_time: `${h}:${m}:${s}`,
        reward_badge: index === 0 ? 'Bintang Kedisiplinan Emas (Juara 1)' : index === 1 ? 'Bintang Kedisiplinan Perak (Juara 2)' : index === 2 ? 'Bintang Kedisiplinan Perunggu (Juara 3)' : 'Siswa Teladan'
      };
    });

    res.json({
      month,
      candidates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/monthly-students (Rekap Absensi Siswa Per Bulan Lengkap: H, T, S, I, A, %)
router.get('/monthly-students', authenticateToken, (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7); // YYYY-MM
    const { class_id, search } = req.query;

    let query = `
      SELECT s.id, s.nisn, s.nis, s.name, s.gender,
             c.name as class_name, c.level as class_level, c.homeroom_teacher,
             COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as hadir,
             COUNT(CASE WHEN a.status = 'terlambat' THEN 1 END) as terlambat,
             COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as sakit,
             COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as izin,
             COUNT(CASE WHEN a.status = 'alpa' THEN 1 END) as alpa,
             COUNT(a.id) as total_presensi
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendances a ON s.id = a.student_id AND a.date LIKE ?
      WHERE s.status = 'active'
    `;
    const params = [`${month}%`];

    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND s.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      query += ` AND s.class_id = ?`;
      params.push(class_id);
    }

    if (search) {
      query += ` AND (s.name LIKE ? OR s.nisn LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY s.id
      ORDER BY c.level, c.name, s.name ASC
    `;

    const students = db.prepare(query).all(...params);

    // Hitung persentase kehadiran (Hadir + Terlambat / Hari Efektif atau Total Presensi)
    const formatted = students.map(s => {
      const masuk = s.hadir + s.terlambat;
      const total = s.hadir + s.terlambat + s.sakit + s.izin + s.alpa;
      const persentase = total > 0 ? Math.round((masuk / total) * 100) : 0;
      return {
        ...s,
        total_kehadiran: masuk,
        total_hari_absen: total,
        persentase
      };
    });

    res.json({
      month,
      students: formatted
    });
  } catch (err) {
    console.error('Error fetching monthly student recap:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/student/:id (Rekap personal kehadiran siswa)
router.get('/student/:id', authenticateToken, (req, res) => {
  try {
    const studentId = req.params.id;
    const student = db.prepare(`
      SELECT s.*, c.name as class_name, c.homeroom_teacher
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    const records = db.prepare(`
      SELECT * FROM attendances
      WHERE student_id = ?
      ORDER BY date DESC, time DESC
    `).all(studentId);

    const stats = {
      hadir: records.filter(r => r.status === 'hadir').length,
      terlambat: records.filter(r => r.status === 'terlambat').length,
      sakit: records.filter(r => r.status === 'sakit').length,
      izin: records.filter(r => r.status === 'izin').length,
      alpa: records.filter(r => r.status === 'alpa').length,
      total: records.length
    };

    res.json({ student, stats, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

