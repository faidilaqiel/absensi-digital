const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth');

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/dashboard
router.get('/', authenticateToken, (req, res) => {
  try {
    const today = req.query.date || getLocalDateString();
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const academicYearId = req.query.academic_year_id;

    // Filter by academic year if provided, otherwise active academic year
    let activeAY = null;
    if (academicYearId) {
      activeAY = db.prepare('SELECT id, name FROM academic_years WHERE id = ?').get(academicYearId);
    } else {
      activeAY = db.prepare('SELECT id, name FROM academic_years WHERE is_active = 1').get();
    }

    const ayId = activeAY ? activeAY.id : 1;

    // Total active classes (hanya hitung siswa yang status_siswa = 'Aktif')
    const classes = db.prepare(`
      SELECT c.id, c.name, c.level, c.homeroom_teacher,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND (s.status_siswa = 'Aktif' OR s.status_siswa IS NULL)) as total_students
      FROM classes c
      WHERE c.academic_year_id = ?
      ORDER BY c.level, c.name
    `).all(ayId);

    const totalRombel = classes.length;
    const totalStudents = classes.reduce((sum, c) => sum + c.total_students, 0);

    // Today's attendance summary (hanya siswa aktif dan sesuai academic_year_id)
    const todaySummary = db.prepare(`
      SELECT 
        COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN a.status = 'terlambat' THEN 1 END) as terlambat,
        COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as izin,
        COUNT(CASE WHEN a.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total_recorded
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE a.date = ? 
        AND (a.academic_year_id = ? OR c.academic_year_id = ?)
        AND (s.status_siswa = 'Aktif' OR s.status_siswa IS NULL)
    `).get(today, ayId, ayId);

    const hadirCount = todaySummary ? todaySummary.hadir : 0;
    const terlambatCount = todaySummary ? todaySummary.terlambat : 0;
    const sakitCount = todaySummary ? todaySummary.sakit : 0;
    const izinCount = todaySummary ? todaySummary.izin : 0;
    const alpaCount = todaySummary ? todaySummary.alpa : 0;
    const totalRecorded = todaySummary ? todaySummary.total_recorded : 0;
    const belumHadirCount = Math.max(0, totalStudents - totalRecorded);

    // Per rombel attendance breakdown today
    const rombelStats = classes.map(c => {
      const att = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'hadir' THEN 1 END) as hadir,
          COUNT(CASE WHEN status = 'terlambat' THEN 1 END) as terlambat,
          COUNT(CASE WHEN status = 'sakit' THEN 1 END) as sakit,
          COUNT(CASE WHEN status = 'izin' THEN 1 END) as izin,
          COUNT(CASE WHEN status = 'alpa' THEN 1 END) as alpa
        FROM attendances
        WHERE class_id = ? AND date = ?
      `).get(c.id, today);

      const h = att ? att.hadir : 0;
      const t = att ? att.terlambat : 0;
      const s = att ? att.sakit : 0;
      const i = att ? att.izin : 0;
      const a = att ? att.alpa : 0;
      const presentTotal = h + t;
      const percentage = c.total_students > 0 ? Math.round((presentTotal / c.total_students) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        level: c.level,
        homeroom_teacher: c.homeroom_teacher,
        total_students: c.total_students,
        hadir: h,
        terlambat: t,
        sakit: s,
        izin: i,
        alpa: a,
        present_total: presentTotal,
        percentage
      };
    });

    // Recent 10 scan activities today
    const recentScans = db.prepare(`
      SELECT a.id, a.date, a.time, a.status, a.method, a.notes,
             s.id as student_id, s.name as student_name, s.nisn, s.photo_url,
             c.name as class_name
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.date = ?
      ORDER BY a.time DESC
      LIMIT 10
    `).all(today);

    // Reward Leaderboard: Top early birds this month (siapa yang datang paling awal di setiap bulannya)
    const earlyBirds = db.prepare(`
      SELECT s.id, s.name, s.nisn, c.name as class_name, s.photo_url,
             COUNT(*) as early_count,
             MIN(a.time) as fastest_time,
             AVG(
               CAST(strftime('%H', a.time) AS INT) * 3600 +
               CAST(strftime('%M', a.time) AS INT) * 60 +
               CAST(strftime('%S', a.time) AS INT)
             ) as avg_seconds
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.date LIKE ? AND a.status = 'hadir' AND a.time <= '07:00:00'
      GROUP BY s.id
      ORDER BY early_count DESC, avg_seconds ASC
      LIMIT 5
    `).all(`${currentMonth}%`).map(row => {
      const avgSec = Math.round(row.avg_seconds || 0);
      const hours = String(Math.floor(avgSec / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0');
      const seconds = String(avgSec % 60).padStart(2, '0');
      return {
        ...row,
        avg_time: `${hours}:${minutes}:${seconds}`
      };
    });

    // Today's latecomers
    const lateToday = db.prepare(`
      SELECT a.id, a.time, a.notes, s.name, s.nisn, c.name as class_name
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.date = ? AND a.status = 'terlambat'
      ORDER BY a.time ASC
    `).all(today);

    res.json({
      date: today,
      academic_year: activeAY ? activeAY.name : '',
      academic_year_id: ayId,
      summary: {
        total_students: totalStudents,
        total_rombel: totalRombel,
        hadir: hadirCount,
        terlambat: terlambatCount,
        sakit: sakitCount,
        izin: izinCount,
        alpa: alpaCount,
        belum_hadir: belumHadirCount,
        total_recorded: totalRecorded,
        attendance_rate: totalStudents > 0 ? Math.round(((hadirCount + terlambatCount) / totalStudents) * 100) : 0
      },
      rombel_stats: rombelStats,
      recent_scans: recentScans,
      early_birds: earlyBirds,
      late_today: lateToday
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Gagal memuat data dashboard: ' + err.message });
  }
});

// GET /api/dashboard/rombel/:id/students (Detail siswa dalam rombel saat diklik di dashboard)
router.get('/rombel/:id/students', authenticateToken, (req, res) => {
  try {
    const classId = req.params.id;
    const today = req.query.date || getLocalDateString();

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    if (!cls) {
      return res.status(404).json({ error: 'Rombel tidak ditemukan.' });
    }

    const students = db.prepare(`
      SELECT s.id, s.nisn, s.nis, s.name, s.gender, s.parent_phone, s.status, s.qr_code,
             a.time as attendance_time, a.status as attendance_status, a.method, a.notes
      FROM students s
      LEFT JOIN attendances a ON s.id = a.student_id AND a.date = ?
      WHERE s.class_id = ?
      ORDER BY s.name ASC
    `).all(today, classId);

    res.json({
      class: cls,
      students
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/status-students - Drill-down detail siswa saat kartu status diklik
router.get('/status-students', authenticateToken, (req, res) => {
  try {
    const today = req.query.date || getLocalDateString();
    const statusType = req.query.status; // 'total', 'hadir', 'terlambat', 'sakit', 'izin', 'alpa', 'belum_hadir'
    const academicYearId = req.query.academic_year_id;

    let activeAY = null;
    if (academicYearId) {
      activeAY = db.prepare('SELECT id, name FROM academic_years WHERE id = ?').get(academicYearId);
    } else {
      activeAY = db.prepare('SELECT id, name FROM academic_years WHERE is_active = 1').get();
    }
    const ayId = activeAY ? activeAY.id : 1;

    let query = `
      SELECT s.id, s.nisn, s.nis, s.name, s.gender, s.parent_phone,
             c.name as class_name, c.level as class_level,
             a.time as attendance_time, a.status as attendance_status, a.notes, a.method
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendances a ON s.id = a.student_id AND a.date = ?
      WHERE s.status = 'active' AND c.academic_year_id = ?
    `;
    const params = [today, ayId];

    if (statusType === 'hadir') {
      query += ` AND a.status = 'hadir'`;
    } else if (statusType === 'terlambat') {
      query += ` AND a.status = 'terlambat'`;
    } else if (statusType === 'sakit') {
      query += ` AND a.status = 'sakit'`;
    } else if (statusType === 'izin') {
      query += ` AND a.status = 'izin'`;
    } else if (statusType === 'alpa') {
      query += ` AND a.status = 'alpa'`;
    } else if (statusType === 'belum_hadir') {
      query += ` AND a.id IS NULL`;
    } else if (statusType === 'alpa_or_belum') {
      query += ` AND (a.status = 'alpa' OR a.id IS NULL)`;
    }

    query += ` ORDER BY c.level, c.name, s.name ASC`;

    const students = db.prepare(query).all(...params);

    res.json({
      status: statusType,
      date: today,
      count: students.length,
      students
    });
  } catch (err) {
    console.error('Error fetching status students:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
