const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'attendance.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance & concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level INTEGER NOT NULL,
      academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      homeroom_teacher TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, academic_year_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'petugas', 'guru', 'kepsek')),
      assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nisn TEXT UNIQUE NOT NULL,
      nis TEXT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      photo_url TEXT,
      qr_code TEXT UNIQUE NOT NULL,
      parent_phone TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      date TEXT NOT NULL, -- Format YYYY-MM-DD
      time TEXT NOT NULL, -- Format HH:MM:SS
      status TEXT NOT NULL CHECK(status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpa')),
      notes TEXT,
      recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      recorded_by_name TEXT,
      method TEXT DEFAULT 'qr_scan' CHECK(method IN ('qr_scan', 'manual_authorized', 'offline_synced')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date) -- Anti absensi ganda per hari
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
    CREATE INDEX IF NOT EXISTS idx_attendances_class ON attendances(class_id);
    CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_qr ON students(qr_code);
  `);

  seedInitialData();
}

function seedInitialData() {
  // Check settings
  const checkSetting = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (checkSetting.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const defaultSettings = [
      ['school_name', 'SDN Pengampon 3 Kota Cirebon'],
      ['school_address', 'Jl. Pengampon No. 3, Kec. Lemahwungkuk, Kota Cirebon, Jawa Barat 45111'],
      ['school_npsn', '20222123'],
      ['school_email', 'sdnpengampon3cirebon@gmail.com'],
      ['school_phone', '(0231) 203894'],
      ['school_headmaster', 'Hj. Sri Mulyati, M.Pd.'],
      ['check_in_start', '06:00'],
      ['check_in_ontime_limit', '07:00'], // <= 07.00: Hadir, > 07.00: Terlambat
      ['check_in_end', '11:00'],
      ['active_academic_year', '2024/2025 - Ganjil']
    ];
    for (const [k, v] of defaultSettings) {
      insertSetting.run(k, v);
    }
  }

  // Check Academic Year
  let ay = db.prepare("SELECT id FROM academic_years LIMIT 1").get();
  if (!ay) {
    const res = db.prepare("INSERT INTO academic_years (name, is_active) VALUES ('2026/2027', 1)").run();
    ay = { id: res.lastInsertRowid };
  }

  // Check 7 Rombongan Belajar (Rombel)
  const defaultClasses = [
    { name: 'Kelas 1', level: 1, homeroom: 'Ibu Siti Rohmah, S.Pd' },
    { name: 'Kelas 2A', level: 2, homeroom: 'Bapak Ahmad Fauzi, S.Pd' },
    { name: 'Kelas 2B', level: 2, homeroom: 'Ibu Nurul Hidayah, S.Pd' },
    { name: 'Kelas 3', level: 3, homeroom: 'Ibu Dewi Sartika, S.Pd' },
    { name: 'Kelas 4', level: 4, homeroom: 'Bapak Budi Santoso, S.Pd' },
    { name: 'Kelas 5', level: 5, homeroom: 'Ibu Eka Prasetya, S.Pd' },
    { name: 'Kelas 6', level: 6, homeroom: 'Bapak Hendra Gunawan, S.Pd' },
  ];

  for (const c of defaultClasses) {
    const existing = db.prepare('SELECT id FROM classes WHERE name = ? AND academic_year_id = ?').get(c.name, ay.id);
    if (!existing) {
      db.prepare('INSERT INTO classes (name, level, academic_year_id, homeroom_teacher) VALUES (?, ?, ?, ?)').run(
        c.name, c.level, ay.id, c.homeroom
      );
    }
  }

  // Check Users
  const checkUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (checkUsers.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const class2A = db.prepare("SELECT id FROM classes WHERE name = 'Kelas 2A'").get();

    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role, assigned_class_id, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', bcrypt.hashSync('admin123', salt), 'Administrator Sistem', 'admin', null, '081234567890');
    insertUser.run('guru', bcrypt.hashSync('guru123', salt), 'Ahmad Fauzi, S.Pd (Wali Kelas 2A)', 'guru', class2A ? class2A.id : null, '081234567892');
    insertUser.run('kepsek', bcrypt.hashSync('kepsek123', salt), 'Hj. Sri Mulyati, M.Pd. (Kepala Sekolah)', 'kepsek', null, '081234567893');
  }

  // Check Students
  const checkStudents = db.prepare('SELECT COUNT(*) as count FROM students').get();
  if (checkStudents.count === 0) {
    const classes = db.prepare('SELECT id, name FROM classes ORDER BY level, name').all();
    const classMap = {};
    classes.forEach(c => classMap[c.name] = c.id);

    const initialStudents = [
      // Kelas 1
      { nisn: '0151123401', nis: '2401', name: 'Muhammad Al-Fatih', gender: 'L', class: 'Kelas 1', phone: '0813110001' },
      { nisn: '0151123402', nis: '2402', name: 'Aisyah Putri Azzahra', gender: 'P', class: 'Kelas 1', phone: '0813110002' },
      { nisn: '0151123403', nis: '2403', name: 'Bilal Habibi Ramadhan', gender: 'L', class: 'Kelas 1', phone: '0813110003' },
      { nisn: '0151123404', nis: '2404', name: 'Zahra Amelia Safitri', gender: 'P', class: 'Kelas 1', phone: '0813110004' },
      { nisn: '0151123405', nis: '2405', name: 'Fatih Rayyan Pratama', gender: 'L', class: 'Kelas 1', phone: '0813110005' },

      // Kelas 2A
      { nisn: '0142123401', nis: '2301', name: 'Rizky Ramadhan', gender: 'L', class: 'Kelas 2A', phone: '0813110006' },
      { nisn: '0142123402', nis: '2302', name: 'Aditya Bagus Saputra', gender: 'L', class: 'Kelas 2A', phone: '0813110007' },
      { nisn: '0142123403', nis: '2303', name: 'Nabila Syakira', gender: 'P', class: 'Kelas 2A', phone: '0813110008' },
      { nisn: '0142123404', nis: '2304', name: 'Dimas Arya Pamungkas', gender: 'L', class: 'Kelas 2A', phone: '0813110009' },
      { nisn: '0142123405', nis: '2305', name: 'Chelsea Olivia Zahra', gender: 'P', class: 'Kelas 2A', phone: '0813110010' },

      // Kelas 2B
      { nisn: '0142223401', nis: '2311', name: 'Danendra Satria', gender: 'L', class: 'Kelas 2B', phone: '0813110011' },
      { nisn: '0142223402', nis: '2312', name: 'Farah Annisa Khair', gender: 'P', class: 'Kelas 2B', phone: '0813110012' },
      { nisn: '0142223403', nis: '2313', name: 'Galih Rakabuming', gender: 'L', class: 'Kelas 2B', phone: '0813110013' },
      { nisn: '0142223404', nis: '2314', name: 'Haniifah Nur Azizah', gender: 'P', class: 'Kelas 2B', phone: '0813110014' },

      // Kelas 3
      { nisn: '0133123401', nis: '2201', name: 'Irfan Maulana Akbar', gender: 'L', class: 'Kelas 3', phone: '0813110015' },
      { nisn: '0133123402', nis: '2202', name: 'Jihan Kirana Dewi', gender: 'P', class: 'Kelas 3', phone: '0813110016' },
      { nisn: '0133123403', nis: '2203', name: 'Kenzo Alvaro Putra', gender: 'L', class: 'Kelas 3', phone: '0813110017' },
      { nisn: '0133123404', nis: '2204', name: 'Larasati Ayu Ningrum', gender: 'P', class: 'Kelas 3', phone: '0813110018' },

      // Kelas 4
      { nisn: '0124123401', nis: '2101', name: 'Mochammad Raffi', gender: 'L', class: 'Kelas 4', phone: '0813110019' },
      { nisn: '0124123402', nis: '2102', name: 'Nadya Putri Utami', gender: 'P', class: 'Kelas 4', phone: '0813110020' },
      { nisn: '0124123403', nis: '2103', name: 'Omar Al-Ghazali', gender: 'L', class: 'Kelas 4', phone: '0813110021' },
      { nisn: '0124123404', nis: '2104', name: 'Putri Dwi Lestari', gender: 'P', class: 'Kelas 4', phone: '0813110022' },

      // Kelas 5
      { nisn: '0115123401', nis: '2001', name: 'Qaisar Raditya', gender: 'L', class: 'Kelas 5', phone: '0813110023' },
      { nisn: '0115123402', nis: '2002', name: 'Rania Salma Kirana', gender: 'P', class: 'Kelas 5', phone: '0813110024' },
      { nisn: '0115123403', nis: '2003', name: 'Satria Bintang Timur', gender: 'L', class: 'Kelas 5', phone: '0813110025' },
      { nisn: '0115123404', nis: '2004', name: 'Tiara Citra Maharani', gender: 'P', class: 'Kelas 5', phone: '0813110026' },

      // Kelas 6
      { nisn: '0106123401', nis: '1901', name: 'Umar Wirahadikusumah', gender: 'L', class: 'Kelas 6', phone: '0813110027' },
      { nisn: '0106123402', nis: '1902', name: 'Vina Anindya Putri', gender: 'P', class: 'Kelas 6', phone: '0813110028' },
      { nisn: '0106123403', nis: '1903', name: 'Wahyu Nugraha Jaya', gender: 'L', class: 'Kelas 6', phone: '0813110029' },
      { nisn: '0106123404', nis: '1904', name: 'Yasmin Zahra Firdaus', gender: 'P', class: 'Kelas 6', phone: '0813110030' },
    ];

    const insertStudent = db.prepare(`
      INSERT INTO students (nisn, nis, name, gender, class_id, qr_code, parent_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const s of initialStudents) {
      const cId = classMap[s.class];
      if (cId) {
        const qr = `SDNP3-${s.nisn}`;
        insertStudent.run(s.nisn, s.nis, s.name, s.gender, cId, qr, s.phone);
      }
    }
  }

  // Seed sample attendances for today & past days to populate leaderboard & dashboard statistics
  const checkAtt = db.prepare('SELECT COUNT(*) as count FROM attendances').get();
  if (checkAtt.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    const stds = db.prepare('SELECT id, class_id FROM students').all();
    
    // Seed some attendances for today
    // Let 1st student come at 06:40:12 (hadir tepat waktu)
    // 2nd at 06:45:00 (hadir)
    // 3rd at 06:58:20 (hadir)
    // 4th at 07:08:15 (terlambat)
    // 5th at 07:15:30 (terlambat)
    // Some izin, sakit
    const insertAtt = db.prepare(`
      INSERT INTO attendances (student_id, class_id, date, time, status, notes, recorded_by_name, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (stds.length >= 6) {
      insertAtt.run(stds[0].id, stds[0].class_id, today, '06:38:15', 'hadir', 'Tiba paling awal', 'Petugas Piket', 'qr_scan');
      insertAtt.run(stds[1].id, stds[1].class_id, today, '06:44:22', 'hadir', '', 'Petugas Piket', 'qr_scan');
      insertAtt.run(stds[2].id, stds[2].class_id, today, '06:52:05', 'hadir', '', 'Petugas Piket', 'qr_scan');
      insertAtt.run(stds[3].id, stds[3].class_id, today, '06:59:40', 'hadir', '', 'Petugas Piket', 'qr_scan');
      insertAtt.run(stds[4].id, stds[4].class_id, today, '07:05:18', 'terlambat', 'Macet di jalan', 'Petugas Piket', 'qr_scan');
      insertAtt.run(stds[5].id, stds[5].class_id, today, '07:12:30', 'terlambat', 'Kesiangan bangun', 'Petugas Piket', 'qr_scan');
      if (stds[6]) insertAtt.run(stds[6].id, stds[6].class_id, today, '07:00:00', 'sakit', 'Demam tinggi (Surat dokter terlampir)', 'Wali Kelas', 'manual_authorized');
      if (stds[7]) insertAtt.run(stds[7].id, stds[7].class_id, today, '07:00:00', 'izin', 'Acara keluarga di Bandung', 'Wali Kelas', 'manual_authorized');
      if (stds[8]) insertAtt.run(stds[8].id, stds[8].class_id, today, '07:00:00', 'alpa', 'Tanpa keterangan', 'Sistem', 'manual_authorized');
    }
  }
}

initDatabase();

module.exports = db;

