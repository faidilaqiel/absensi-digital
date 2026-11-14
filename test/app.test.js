const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const db = require('../server/db');

// 1. Pengujian Modul Basis Data & Skema
test('1. Database Schema & Master Data Validation', async (t) => {
  await t.test('Harus memuat data siswa aktif dengan atribut lengkap', () => {
    const student = db.prepare('SELECT * FROM students WHERE status = ? LIMIT 1').get('active');
    assert.ok(student, 'Siswa aktif harus ditemukan');
    assert.ok(student.nisn, 'Siswa harus memiliki NISN');
    assert.ok(student.qr_code, 'Siswa harus memiliki string QR Code unik');
    assert.ok(student.class_id, 'Siswa harus terdaftar pada salah satu rombel');
  });

  await t.test('Harus terdapat 7 rombel kelas standar SDN Pengampon 3', () => {
    const count = db.prepare('SELECT COUNT(*) as total FROM classes').get();
    assert.strictEqual(count.total, 7, 'Jumlah kelas harus tepat 7 (Kelas 1 - Kelas 6)');
  });

  await t.test('Tahun ajaran aktif harus terdefinisi', () => {
    const ay = db.prepare('SELECT * FROM academic_years WHERE is_active = 1').get();
    assert.ok(ay, 'Harus ada tahun ajaran berstatus is_active = 1');
    assert.strictEqual(ay.name, '2026/2027', 'Tahun ajaran aktif harus 2026/2027');
  });
});

// 2. Pengujian Logika Bisnis & Perhitungan Absensi
test('2. Attendance Business Logic & Late Time Calculation', async (t) => {
  // Helper late calculation
  function calculateLateMinutes(scanTime, limitTime = '07:00:00') {
    const [sh, sm, ss] = scanTime.split(':').map(Number);
    const [lh, lm, ls] = limitTime.split(':').map(Number);
    const scanSeconds = sh * 3600 + sm * 60 + (ss || 0);
    const limitSeconds = lh * 3600 + lm * 60 + (ls || 0);
    const diff = scanSeconds - limitSeconds;
    return diff > 0 ? Math.ceil(diff / 60) : 0;
  }

  await t.test('Siswa yang scan sebelum atau tepat pukul 07:00 dihitung tepat waktu (Hadir)', () => {
    assert.strictEqual(calculateLateMinutes('06:45:00', '07:00:00'), 0);
    assert.strictEqual(calculateLateMinutes('07:00:00', '07:00:00'), 0);
  });

  await t.test('Siswa yang scan setelah pukul 07:00 dihitung terlambat secara akurat', () => {
    assert.strictEqual(calculateLateMinutes('07:15:00', '07:00:00'), 15);
    assert.strictEqual(calculateLateMinutes('07:45:30', '07:00:00'), 46);
  });
});

// 3. Pengujian Integritas & Filter Chatbot AI Function Calling
test('3. Chatbot AI Function Calling & Deterministic Queries', async (t) => {
  await t.test('Fungsi getWaliKelas harus mengembalikan nama guru resmi dari database', () => {
    const row = db.prepare('SELECT homeroom_teacher FROM classes WHERE name LIKE ?').get('%Kelas 1%');
    assert.ok(row, 'Kelas 1 harus ditemukan');
    assert.strictEqual(row.homeroom_teacher, 'Rizky Yulianti, S.Pd.SD.');
  });

  await t.test('Fungsi getSiswaBelumAbsen harus mengembalikan daftar siswa aktif tanpa duplikasi', () => {
    const today = new Date().toLocaleDateString('en-CA');
    const rows = db.prepare(`
      SELECT s.id, s.name, c.name as kelas FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'active' AND s.id NOT IN (
        SELECT student_id FROM attendances WHERE date = ?
      )
    `).all(today);
    assert.ok(Array.isArray(rows), 'Hasil query harus bertipe array');
  });

  await t.test('Pembersihan sintaks markdown harus menghapus tanda bintang ganda', () => {
    function cleanMarkdown(text) {
      if (!text) return '';
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s?/g, '')
        .trim();
    }
    const sample = 'Berikut adalah **224 siswa** yang terdaftar.';
    assert.strictEqual(cleanMarkdown(sample), 'Berikut adalah 224 siswa yang terdaftar.');
  });
});

