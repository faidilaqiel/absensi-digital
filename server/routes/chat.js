const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db'); // SQLite fallback if MySQL is unreachable

const fs = require('fs');
const path = require('path');

// Ambil GEMINI_API_KEY dari process.env atau file .env lokal (agar aman dari GitHub Push Protection)
let envApiKey = process.env.GEMINI_API_KEY || '';
if (!envApiKey) {
  try {
    const envPath = path.join(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        envApiKey = match[1].trim();
      }
    }
  } catch (e) {}
}

const GEMINI_API_KEY = envApiKey;

// Helper koneksi MySQL
async function getMySQLConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'absensi_sdnp3'
  });
}

// 1. Definisi Tools (Fungsi Database)
const tools = [
  {
    functionDeclarations: [
      {
        name: 'getTotalRombel',
        description: 'Gunakan fungsi ini jika user bertanya ada berapa rombel/kelas di sekolah.'
      },
      {
        name: 'getWaliKelas',
        description: 'Gunakan fungsi ini jika user bertanya tentang siapa wali kelas atau guru kelas untuk rombel tertentu (contoh: Kelas 1, Kelas 2A, dll).',
        parameters: {
          type: 'OBJECT',
          properties: {
            kelas: {
              type: 'STRING',
              description: 'Nama atau nomor rombel/kelas (contoh: "1", "2A", "3", "Kelas 4").'
            }
          },
          required: ['kelas']
        }
      },
      {
        name: 'getSiswaByKelas',
        description: 'Gunakan fungsi ini jika user bertanya siapa saja siswa di kelas tertentu (misal: siswa kelas 1 sampai 6).',
        parameters: {
          type: 'OBJECT',
          properties: {
            kelas: {
              type: 'STRING',
              description: 'Nama atau nomor kelas (contoh: "1", "2A", "Kelas 1").'
            }
          },
          required: ['kelas']
        }
      },
      {
        name: 'getSiswaBelumAbsen',
        description: 'Gunakan fungsi ini jika user bertanya siapa saja siswa yang belum absen hari ini. Bisa untuk seluruh sekolah atau difilter per kelas tertentu jika user menyebutkan kelas.',
        parameters: {
          type: 'OBJECT',
          properties: {
            kelas: {
              type: 'STRING',
              description: 'Nama atau nomor rombel/kelas jika user ingin cek kelas tertentu (contoh: "1", "2A", "Kelas 3"). Kosongkan jika untuk semua kelas.'
            }
          }
        }
      },
      {
        name: 'getSiswaByStatus',
        description: 'Gunakan fungsi ini jika user bertanya siapa saja siswa yang Alpa, Izin, Sakit, atau Terlambat hari ini.',
        parameters: {
          type: 'OBJECT',
          properties: {
            status: {
              type: 'STRING',
              description: 'Status kehadiran: "Alpa", "Izin", "Sakit", atau "Terlambat"'
            }
          },
          required: ['status']
        }
      },
      {
        name: 'getStatistikHariIni',
        description: 'Gunakan fungsi ini jika user bertanya ringkasan total kehadiran hari ini (Berapa hadir, berapa alpa, dll).'
      }
    ]
  }
];

// 2. System Prompt (Instruksi Dasar AI Sangat Ketat)
const systemInstruction = `Kamu adalah PresensiAI, asisten virtual eksklusif untuk SDN Pengampon 3.

ATURAN MUTLAK & BATASAN TOPIK:
1. Kamu HANYA BOLEH menjawab pertanyaan seputar: kehadiran siswa, data rombel/kelas, statistik absensi, informasi siswa/guru sekolah, dan panduan penggunaan aplikasi absensi SDN Pengampon 3.
2. Jika user bertanya tentang hal di luar topik tersebut (contoh: presiden, tokoh nasional, sejarah, politik, resep masakan, rumus matematika umum, sains umum, hiburan, dongeng, atau pengetahuan umum lainnya), kamu WAJIB MENOLAK DENGAN TEGAS DAN SOPAN.
3. DILARANG KERAS memberikan jawaban sedikit pun atas pertanyaan di luar topik, meskipun kamu mengetahui jawabannya. Tolak 100% semua pertanyaan di luar konteks sekolah!
4. Format kalimat penolakan WAJIB berbunyi:
   "Maaf Bapak/Ibu, saya adalah asisten khusus absensi sekolah. Saya tidak dapat menjawab pertanyaan di luar topik kehadiran siswa atau informasi sekolah."

ATURAN DATA & FORMAT JAWABAN RESMI:
1. JANGAN PERNAH MENGARANG DATA.
2. DILARANG MENGARANG nama guru/wali kelas. Jika user bertanya tentang wali kelas atau guru kelas, kamu WAJIB memanggil fungsi getWaliKelas. Jika data tidak ditemukan di database, katakan dengan jujur bahwa data belum diinput.
3. Jika user bertanya tentang rombel, siswa per kelas, siswa alpa/izin/sakit, atau siswa belum absen, KAMU WAJIB memanggil fungsi (tools) yang sesuai.
4. WAJIB MENYEBUTKAN SEMUA NAMA SISWA SATU PER SATU TANPA TERKECUALI:
   - Jika ada siswa yang belum absen atau berada di suatu kategori, sebutkan SEMUA nama siswa tersebut secara lengkap dan berurutan!
   - DILARANG menggunakan kata "dan X siswa lainnya", "dan seterusnya", atau memotong/meringkas daftar nama. Semua nama dari database harus tertulis!
5. FORMAT DAFTAR HARUS RAPI:
   - Gunakan penomoran berurutan (1., 2., 3., dst).
   - Sebutkan Nama beserta Kelasnya dengan jelas (contoh: "1. Budi Santoso (Kelas 1)").
6. DILARANG menggunakan format markdown tebal seperti tanda bintang ganda (**teks**) atau tanda pagar (#). Gunakan teks biasa dan angka agar bersih dan rapi.
7. Jika user mengunggah gambar, analisislah gambar tersebut hanya jika berkaitan dengan foto siswa, kartu absensi, atau barcode QR SDN Pengampon 3. Jika gambar di luar topik sekolah, tolak dengan sopan menggunakan format aturan nomor 4.`;

// Fungsi pembersih markdown (menghapus ** dan # agar bersih)
function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // hapus **bold**
    .replace(/\*(.*?)\*/g, '$1')     // hapus *italic*
    .replace(/#{1,6}\s?/g, '')       // hapus # header
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // hapus code tick
    .trim();
}

// Eksekutor fungsi database MySQL dengan fallback SQLite
async function executeDatabaseFunction(name, args) {
  let conn = null;
  try {
    conn = await getMySQLConnection();

    if (name === 'getTotalRombel') {
      const [countRows] = await conn.query('SELECT COUNT(*) as total FROM classes');
      const [listRows] = await conn.query('SELECT name, homeroom_teacher FROM classes ORDER BY level, name');
      return {
        total_rombel: countRows[0]?.total || 0,
        daftar_rombel: listRows.map(c => `${c.name}${c.homeroom_teacher ? ` (Wali Kelas: ${c.homeroom_teacher})` : ''}`)
      };
    }

    if (name === 'getWaliKelas') {
      const rawParam = String(args.kelas || '').trim();
      // Bersihkan string, misal: "Kelas 2A" -> "2A", "kelas 1" -> "1"
      const cleanParam = rawParam.replace(/^kelas\s+/i, '').trim();
      const numLevel = cleanParam.replace(/[^0-9]/g, '');

      const [rows] = await conn.query(
        `SELECT id, name, homeroom_teacher 
         FROM classes 
         WHERE name = ? 
            OR name LIKE ? 
            OR name = ? 
            OR (level = ? AND ? NOT REGEXP '[a-zA-Z]')
         ORDER BY name ASC`,
        [
          `Kelas ${cleanParam}`,
          `%${cleanParam}%`,
          rawParam,
          numLevel || -1,
          cleanParam
        ]
      );

      if (rows && rows.length > 0) {
        // Jika cocok spesifik
        const matchedClass = rows.find(r => r.name.toLowerCase() === `kelas ${cleanParam}`.toLowerCase() || r.name.toLowerCase() === rawParam.toLowerCase()) || rows[0];
        if (matchedClass.homeroom_teacher && matchedClass.homeroom_teacher.trim()) {
          return {
            status: 'ditemukan',
            kelas: matchedClass.name,
            wali_kelas: matchedClass.homeroom_teacher,
            pesan: `Wali kelas untuk ${matchedClass.name} adalah ${matchedClass.homeroom_teacher}.`
          };
        } else {
          return {
            status: 'belum_diisi',
            kelas: matchedClass.name,
            pesan: `Data wali kelas untuk ${matchedClass.name} belum diinput di sistem.`
          };
        }
      }

      // Jika tidak ditemukan kecocokan kelas
      return {
        status: 'tidak_ditemukan',
        kelas: rawParam,
        pesan: `Rombongan belajar atau kelas ${rawParam} tidak ditemukan di database sekolah.`
      };
    }

    if (name === 'getSiswaByKelas') {
      const paramKelas = String(args.kelas || '').trim();
      const cleanParam = paramKelas.replace(/^kelas\s+/i, '').trim();
      const cleanLevel = cleanParam.replace(/[^0-9]/g, '');
      const [rows] = await conn.query(
        `SELECT s.name AS nama, c.name AS kelas
         FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE (c.name LIKE ? OR c.name = ? OR c.name = ? OR (c.level = ? AND ? NOT REGEXP '[a-zA-Z]'))
           AND s.status = 'active'
         ORDER BY s.name ASC`,
        [`%${cleanParam}%`, `Kelas ${cleanParam}`, paramKelas, cleanLevel || -1, cleanParam]
      );

      return {
        kelas: paramKelas,
        total_siswa: rows.length,
        daftar_semua_siswa: rows.map((r, i) => `${i + 1}. ${r.nama} (${r.kelas})`)
      };
    }

    if (name === 'getSiswaBelumAbsen') {
      const paramKelas = String(args?.kelas || '').trim();
      const cleanParam = paramKelas.replace(/^kelas\s+/i, '').trim();
      const cleanLevel = cleanParam.replace(/[^0-9]/g, '');

      let sql = `
        SELECT s.name AS nama, c.name AS kelas
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.status = 'active'
          AND s.id NOT IN (
            SELECT student_id FROM attendances WHERE date = CURDATE() OR date = DATE(NOW())
          )
      `;
      const queryParams = [];

      if (cleanParam) {
        sql += ` AND (c.name LIKE ? OR c.name = ? OR c.name = ? OR (c.level = ? AND ? NOT REGEXP '[a-zA-Z]'))`;
        queryParams.push(`%${cleanParam}%`, `Kelas ${cleanParam}`, paramKelas, cleanLevel || -1, cleanParam);
      }

      sql += ` ORDER BY c.level, c.name, s.name ASC`;

      const [rows] = await conn.query(sql, queryParams);

      return {
        filter_kelas: paramKelas || 'Semua Kelas',
        total_belum_absen: rows.length,
        daftar_semua_siswa: rows.map((r, i) => `${i + 1}. ${r.nama} (${r.kelas})`)
      };
    }

    if (name === 'getSiswaByStatus') {
      const rawStatus = String(args.status || '').trim();
      let statusMap = rawStatus;
      if (/alpa/i.test(rawStatus)) statusMap = 'Alpa';
      else if (/izin/i.test(rawStatus)) statusMap = 'Izin';
      else if (/sakit/i.test(rawStatus)) statusMap = 'Sakit';
      else if (/terlambat/i.test(rawStatus)) statusMap = 'Terlambat';
      else if (/hadir/i.test(rawStatus)) statusMap = 'Hadir';

      const [rows] = await conn.query(
        `SELECT s.name AS nama, c.name AS kelas, a.time, a.status
         FROM students s
         JOIN classes c ON s.class_id = c.id
         JOIN attendances a ON s.id = a.student_id
         WHERE a.status = ? AND a.date = CURDATE()
         ORDER BY c.level, s.name ASC`,
        [statusMap]
      );

      return {
        status: statusMap,
        total: rows.length,
        daftar_semua_siswa: rows.map((r, i) => `${i + 1}. ${r.nama} (${r.kelas})`)
      };
    }

    if (name === 'getStatistikHariIni') {
      const [stats] = await conn.query(
        `SELECT status, COUNT(*) as jumlah FROM attendances WHERE date = CURDATE() GROUP BY status`
      );
      const [totalActive] = await conn.query(
        `SELECT COUNT(*) as total FROM students WHERE status = 'active'`
      );
      const [attended] = await conn.query(
        `SELECT COUNT(DISTINCT student_id) as total FROM attendances WHERE date = CURDATE()`
      );
      const totalSiswa = totalActive[0]?.total || 0;
      const totalHadir = attended[0]?.total || 0;
      return {
        tanggal: new Date().toISOString().split('T')[0],
        total_siswa_terdaftar: totalSiswa,
        sudah_absen: totalHadir,
        belum_absen: Math.max(0, totalSiswa - totalHadir),
        rincian_status: stats
      };
    }

    return { error: `Fungsi ${name} tidak dikenali.` };
  } catch (err) {
    console.error(`Error query MySQL untuk ${name}:`, err.message);
    // Fallback SQLite jika MySQL error
    try {
      if (name === 'getTotalRombel') {
        const count = db.prepare('SELECT COUNT(*) as total FROM classes').get();
        const list = db.prepare('SELECT name, homeroom_teacher FROM classes ORDER BY level, name').all();
        return { total_rombel: count?.total || 0, daftar_rombel: list.map(c => c.name) };
      }
      if (name === 'getWaliKelas') {
        const rawParam = String(args.kelas || '').trim();
        const cleanParam = rawParam.replace(/^kelas\s+/i, '').trim();
        const row = db.prepare('SELECT name, homeroom_teacher FROM classes WHERE name LIKE ? OR name = ?').get(`%${cleanParam}%`, `Kelas ${cleanParam}`);
        if (row && row.homeroom_teacher) {
          return { status: 'ditemukan', kelas: row.name, wali_kelas: row.homeroom_teacher, pesan: `Wali kelas untuk ${row.name} adalah ${row.homeroom_teacher}.` };
        }
        return { status: 'belum_diisi', kelas: rawParam, pesan: `Data wali kelas untuk ${rawParam} belum diinput di sistem.` };
      }
      if (name === 'getSiswaBelumAbsen') {
        const today = new Date().toISOString().split('T')[0];
        const paramKelas = String(args?.kelas || '').trim();
        const cleanParam = paramKelas.replace(/^kelas\s+/i, '').trim();
        const cleanLevel = cleanParam.replace(/[^0-9]/g, '');

        let sql = `
          SELECT s.name as nama, c.name as kelas FROM students s
          JOIN classes c ON s.class_id = c.id
          WHERE s.status = 'active' AND s.id NOT IN (SELECT student_id FROM attendances WHERE date = ?)
        `;
        const params = [today];

        if (cleanParam) {
          sql += ` AND (c.name LIKE ? OR c.name = ?)`;
          params.push(`%${cleanParam}%`, `Kelas ${cleanParam}`);
        }

        sql += ` ORDER BY c.level, c.name, s.name ASC`;
        const rows = db.prepare(sql).all(...params);
        return {
          filter_kelas: paramKelas || 'Semua Kelas',
          total_belum_absen: rows.length,
          daftar_semua_siswa: rows.map((r, i) => `${i + 1}. ${r.nama} (${r.kelas})`)
        };
      }
      if (name === 'getStatistikHariIni') {
        const today = new Date().toISOString().split('T')[0];
        const stats = db.prepare('SELECT status, COUNT(*) as jumlah FROM attendances WHERE date = ? GROUP BY status').all(today);
        return { tanggal: today, rincian_status: stats };
      }
    } catch (e) {
      console.error('SQLite fallback error:', e.message);
    }
    return { error: err.message };
  } finally {
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
  }
}

// 3. Logika Backend Endpoint POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { pesan, gambar } = req.body;
    const teksPesan = (pesan || '').trim();

    // Validasi: jika tidak ada pesan teks dan tidak ada gambar
    if (!teksPesan && !gambar) {
      return res.status(400).json({ error: 'Input pesan atau gambar tidak boleh kosong.' });
    }

    // Inisialisasi GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      tools: tools,
      systemInstruction: systemInstruction
    });

    // JIKA USER MENGUNGGAH GAMBAR (VISION MODE)
    if (gambar && typeof gambar === 'string' && gambar.includes('base64,')) {
      try {
        const matches = gambar.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        let mimeType = 'image/jpeg';
        let base64Data = gambar;

        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = gambar.split('base64,')[1];
        }

        const promptTeks = teksPesan || 'Tolong analisis gambar ini. Jika ini foto siswa, kartu absensi, atau barcode/QR presensi, berikan penjelasan terkait absensi SDN Pengampon 3.';

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        };

        const resultVision = await model.generateContent([promptTeks, imagePart]);
        const rawVisionText = resultVision.response.text();
        const jawabanBersih = cleanMarkdown(rawVisionText);

        return res.json({ jawaban: jawabanBersih });
      } catch (visionErr) {
        console.error('Error memproses gambar dengan Gemini:', visionErr);
        return res.json({
          jawaban: 'Gambar telah diterima. Namun terjadi kendala saat menganalisis gambar ini dengan AI. Pastikan format gambar berupa JPG atau PNG yang jelas.'
        });
      }
    }

    // JIKA TEKS BIASA / PERCAKAPAN DATABASE (FUNCTION CALLING MODE)
    const chat = model.startChat();
    const result = await chat.sendMessage(teksPesan);
    const functionCalls = result.response.functionCalls();

    // TANGKAP FUNCTION CALL: Jika Gemini meminta pemanggilan fungsi database
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const functionName = call.name;
      const functionArgs = call.args || {};

      console.log(`[PresensiAI Function Call] Memanggil fungsi: ${functionName} dengan argumen:`, functionArgs);

      // Eksekusi data langsung dari MySQL
      const functionResult = await executeDatabaseFunction(functionName, functionArgs);

      // Kirim hasil query kembali ke Gemini agar dirangkum menjadi respon ramah
      let aiFollowup;
      try {
        aiFollowup = await chat.sendMessage([
          {
            functionResponse: {
              name: functionName,
              response: functionResult
            }
          }
        ]);
      } catch (callErr) {
        // Fallback jika API version memerlukan string input konteks hasil query
        aiFollowup = await chat.sendMessage(
          `Hasil data resmi dari database MySQL untuk fungsi ${functionName}:\n${JSON.stringify(functionResult, null, 2)}\nINSTRUKSI: Sampaikan jawaban dengan ramah dan sopan. Dilarang mengarang nama lain selain data di atas. Tulis tanpa tanda bintang (**).`
        );
      }

      const rawJawaban = aiFollowup.response.text();
      const jawabanBersih = cleanMarkdown(rawJawaban);
      return res.json({ jawaban: jawabanBersih });
    }

    // Jika Gemini langsung merespons teks (misal: salam atau sapaan umum)
    const rawJawabanLangsung = result.response.text();
    const jawabanBersih = cleanMarkdown(rawJawabanLangsung);
    return res.json({ jawaban: jawabanBersih });

  } catch (error) {
    console.error('Error pada endpoint /api/chat:', error);

    // Fallback cerdas bebas tanda bintang (plain text) jika koneksi internet/API offline
    try {
      const pesanLower = (req.body.pesan || '').toLowerCase();
      if (pesanLower.includes('wali kelas') || pesanLower.includes('guru kelas')) {
        // Deteksi kelas dari pesan
        let matchKelas = '1';
        if (pesanLower.includes('2a')) matchKelas = '2A';
        else if (pesanLower.includes('2b')) matchKelas = '2B';
        else if (pesanLower.includes('2')) matchKelas = '2';
        else if (pesanLower.includes('3')) matchKelas = '3';
        else if (pesanLower.includes('4')) matchKelas = '4';
        else if (pesanLower.includes('5')) matchKelas = '5';
        else if (pesanLower.includes('6')) matchKelas = '6';

        const data = await executeDatabaseFunction('getWaliKelas', { kelas: matchKelas });
        return res.json({
          jawaban: data.wali_kelas
            ? `Wali kelas untuk ${data.kelas} adalah ${data.wali_kelas}.`
            : (data.pesan || 'Data wali kelas belum diinput.')
        });
      }
      if (pesanLower.includes('rombel') || pesanLower.includes('kelas di sekolah')) {
        const data = await executeDatabaseFunction('getTotalRombel', {});
        return res.json({
          jawaban: `Di SDN Pengampon 3 saat ini terdapat ${data.total_rombel} rombongan belajar (rombel):\n` +
            data.daftar_rombel.map((r, i) => `${i + 1}. ${r}`).join('\n')
        });
      }
      if (pesanLower.includes('belum absen')) {
        const data = await executeDatabaseFunction('getSiswaBelumAbsen', {});
        return res.json({
          jawaban: `Hari ini tercatat ada ${data.total_belum_absen} siswa yang belum melakukan absensi:\n\n` +
            data.daftar_semua_siswa.join('\n')
        });
      }
      if (pesanLower.includes('statistik') || pesanLower.includes('hadir') || pesanLower.includes('rekap')) {
        const data = await executeDatabaseFunction('getStatistikHariIni', {});
        return res.json({
          jawaban: `Berikut ringkasan kehadiran siswa SDN Pengampon 3 hari ini:\n` +
            `• Total Siswa Terdaftar: ${data.total_siswa_terdaftar}\n` +
            `• Sudah Absen: ${data.sudah_absen}\n` +
            `• Belum Absen: ${data.belum_absen}`
        });
      }
    } catch (fbErr) {}

    return res.status(500).json({
      jawaban: 'Maaf, PresensiAI sedang mengalami kendala teknis saat memproses data. Silakan coba beberapa saat lagi.'
    });
  }
});

module.exports = router;
