const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('./attendance.db');

// Query 1: Rekap Bulanan Semua Siswa (224 Anak)
const month = '2026-11';
const queryMonthly = `
  SELECT s.nisn, s.name, s.gender, c.name as class_name,
         COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as hadir,
         COUNT(CASE WHEN a.status = 'terlambat' THEN 1 END) as terlambat,
         COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as sakit,
         COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as izin,
         COUNT(CASE WHEN a.status = 'alpa' THEN 1 END) as alpa
  FROM students s
  JOIN classes c ON s.class_id = c.id
  LEFT JOIN attendances a ON s.id = a.student_id AND a.date LIKE ?
  WHERE s.status = 'active'
  GROUP BY s.id
  ORDER BY c.level, c.name, s.name ASC
`;
const rowsMonthly = db.prepare(queryMonthly).all(`${month}%`);

const excelMonthly = rowsMonthly.map((r, i) => {
  const masuk = r.hadir + r.terlambat;
  const total = masuk + r.sakit + r.izin + r.alpa;
  const persentase = total > 0 ? Math.round((masuk / total) * 100) : 0;
  return {
    'No': i + 1,
    'Rombel / Kelas': r.class_name,
    'NISN': r.nisn,
    'Nama Lengkap Siswa': r.name,
    'L/P': r.gender || '-',
    'Hadir Tepat Waktu (H)': r.hadir,
    'Terlambat (T)': r.terlambat,
    'Sakit (S)': r.sakit,
    'Izin (I)': r.izin,
    'Alpa (A)': r.alpa,
    'Total Hari Hadir': masuk,
    'Persentase Kehadiran': `${persentase}%`
  };
});

// Query 2: Rekap Harian (Detail Waktu Kedatangan)
const today = '2026-11-12';
const queryDaily = `
  SELECT a.date, a.time, s.nisn, s.name, c.name as class_name, a.status, a.method, a.notes
  FROM attendances a
  JOIN students s ON a.student_id = s.id
  JOIN classes c ON s.class_id = c.id
  WHERE a.date = ?
  ORDER BY a.time DESC
`;
const rowsDaily = db.prepare(queryDaily).all(today);
const excelDaily = rowsDaily.map((h, i) => ({
  'No': i + 1,
  'Tanggal': h.date,
  'Jam Scan': `${h.time} WIB`,
  'NISN': h.nisn,
  'Nama Siswa': h.name,
  'Rombel': h.class_name,
  'Status Kehadiran': h.status.toUpperCase(),
  'Metode Pemindaian': h.method === 'qr' ? 'Pemindai Kamera QR' : 'Input Manual Petugas',
  'Keterangan': h.notes || '-'
}));

// Query 3: Rekap Ringkasan Per Rombel
const queryRombel = `
  SELECT c.name as class_name, c.homeroom_teacher,
         COUNT(DISTINCT s.id) as total_students,
         COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as hadir,
         COUNT(CASE WHEN a.status = 'terlambat' THEN 1 END) as terlambat,
         COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as sakit,
         COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as izin,
         COUNT(CASE WHEN a.status = 'alpa' THEN 1 END) as alpa
  FROM classes c
  LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
  LEFT JOIN attendances a ON s.id = a.student_id AND a.date LIKE ?
  GROUP BY c.id
  ORDER BY c.level, c.name ASC
`;
const rowsRombel = db.prepare(queryRombel).all(`${month}%`);
const excelRombel = rowsRombel.map(r => ({
  'Rombel': r.class_name,
  'Wali Kelas': r.homeroom_teacher || '-',
  'Jumlah Siswa': r.total_students,
  'Total Hadir': r.hadir,
  'Total Terlambat': r.terlambat,
  'Total Sakit': r.sakit,
  'Total Izin': r.izin,
  'Total Alpa': r.alpa
}));

const wb = XLSX.utils.book_new();

// Sheet 1: Rekap Bulanan Per Siswa
const wsMonthly = XLSX.utils.json_to_sheet(excelMonthly);
XLSX.utils.book_append_sheet(wb, wsMonthly, 'Rekap Siswa (Bulanan)');

// Sheet 2: Rekap Harian
const wsDaily = XLSX.utils.json_to_sheet(excelDaily);
XLSX.utils.book_append_sheet(wb, wsDaily, 'Log Presensi Harian');

// Sheet 3: Rekap Per Rombel
const wsRombel = XLSX.utils.json_to_sheet(excelRombel);
XLSX.utils.book_append_sheet(wb, wsRombel, 'Rekapitulasi Rombel');

// Tulis ke root workspace dan client public
const rootFile = path.resolve('Contoh_Rekapan_Absensi_SDN_Pengampon_3.xlsx');
const clientFile = path.resolve('client/public/Contoh_Rekapan_Absensi_SDN_Pengampon_3.xlsx');

XLSX.writeFile(wb, rootFile);
XLSX.writeFile(wb, clientFile);

console.log('Excel backup sample created successfully at:');
console.log('-', rootFile);
console.log('-', clientFile);
