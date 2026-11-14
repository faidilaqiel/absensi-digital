const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

const sqliteDb = new Database(path.join(__dirname, 'attendance.db'));

async function migrate() {
  console.log('--- Memulai Migrasi Data SQLite ke MySQL phpMyAdmin ---');

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  // 1. Buat database
  await conn.query('CREATE DATABASE IF NOT EXISTS absensi_sdnp3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query('USE absensi_sdnp3');

  // Matikan foreign key checks sementara saat pembuatan tabel
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // 2. Buat tabel-tabel di MySQL
  console.log('1. Membuat tabel di MySQL...');
  await conn.query(`
    DROP TABLE IF EXISTS attendances;
    DROP TABLE IF EXISTS students;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS classes;
    DROP TABLE IF EXISTS academic_years;
    DROP TABLE IF EXISTS settings;

    CREATE TABLE academic_years (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE classes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      level INT NOT NULL,
      academic_year_id INT NOT NULL,
      homeroom_teacher VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_class_year (name, academic_year_id),
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin', 'petugas', 'guru', 'kepsek') NOT NULL,
      assigned_class_id INT NULL,
      phone VARCHAR(25),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_class_id) REFERENCES classes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nisn VARCHAR(20) NOT NULL UNIQUE,
      nis VARCHAR(20),
      name VARCHAR(100) NOT NULL,
      gender ENUM('L', 'P') NOT NULL,
      class_id INT NOT NULL,
      photo_url TEXT,
      qr_code VARCHAR(100) NOT NULL UNIQUE,
      parent_phone VARCHAR(25),
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB;

    CREATE TABLE attendances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      class_id INT NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      status ENUM('hadir', 'terlambat', 'sakit', 'izin', 'alpa') NOT NULL,
      notes TEXT,
      recorded_by_user_id INT,
      recorded_by_name VARCHAR(100),
      method ENUM('qr_scan', 'manual_authorized', 'offline_synced') DEFAULT 'qr_scan',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_date (student_id, date),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE settings (
      key_name VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // 3. Salin Data academic_years
  const academicYears = sqliteDb.prepare('SELECT * FROM academic_years').all();
  for (const ay of academicYears) {
    await conn.query('INSERT INTO academic_years (id, name, is_active, created_at) VALUES (?, ?, ?, ?)',
      [ay.id, ay.name, ay.is_active, ay.created_at || new Date()]);
  }
  console.log(`- Berhasil menyalin ${academicYears.length} Tahun Ajaran.`);

  // 4. Salin Data classes
  const classes = sqliteDb.prepare('SELECT * FROM classes').all();
  for (const c of classes) {
    await conn.query('INSERT INTO classes (id, name, level, academic_year_id, homeroom_teacher, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.level, c.academic_year_id, c.homeroom_teacher, c.created_at || new Date()]);
  }
  console.log(`- Berhasil menyalin ${classes.length} Rombel/Kelas.`);

  // 5. Salin Data users
  const users = sqliteDb.prepare('SELECT * FROM users').all();
  for (const u of users) {
    await conn.query('INSERT INTO users (id, username, password, name, role, assigned_class_id, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.username, u.password, u.name, u.role, u.assigned_class_id, u.phone, u.status, u.created_at || new Date()]);
  }
  console.log(`- Berhasil menyalin ${users.length} Akun Pengguna.`);

  // 6. Salin Data students (224 siswa Dapodik)
  const students = sqliteDb.prepare('SELECT * FROM students').all();
  for (const s of students) {
    await conn.query('INSERT INTO students (id, nisn, nis, name, gender, class_id, photo_url, qr_code, parent_phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.nisn, s.nis, s.name, s.gender, s.class_id, s.photo_url, s.qr_code, s.parent_phone, s.status, s.created_at || new Date()]);
  }
  console.log(`- Berhasil menyalin ${students.length} Siswa Lengkap.`);

  // 7. Salin Data attendances
  const attendances = sqliteDb.prepare('SELECT * FROM attendances').all();
  for (const a of attendances) {
    const validMethod = (a.method === 'manual_authorized' || a.method === 'offline_synced') ? a.method : 'qr_scan';
    await conn.query('INSERT INTO attendances (id, student_id, class_id, date, time, status, notes, recorded_by_user_id, recorded_by_name, method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.student_id, a.class_id, a.date, a.time, a.status, a.notes, a.recorded_by_user_id, a.recorded_by_name, validMethod, a.created_at || new Date()]);
  }
  console.log(`- Berhasil menyalin ${attendances.length} Catatan Absensi.`);

  // 8. Salin Data settings
  const settings = sqliteDb.prepare('SELECT * FROM settings').all();
  for (const st of settings) {
    await conn.query('INSERT INTO settings (key_name, value, description) VALUES (?, ?, ?)',
      [st.key, st.value, st.description || '']);
  }
  console.log(`- Berhasil menyalin ${settings.length} Pengaturan Sistem.`);

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  console.log('=== SUKSES! Database MySQL "absensi_sdnp3" di phpMyAdmin telah terisi lengkap! ===');
}

migrate().catch(console.error);

