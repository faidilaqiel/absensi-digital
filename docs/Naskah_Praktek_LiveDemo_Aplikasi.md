# NASKAH PRAKTIK LIVE DEMO APLIKASI (FULL PRAKTEK LAYAR)
## SISTEM INFORMASI PRESENSI DIGITAL & PRESENSIAI - SDN PENGAMPON 3

---

### **INFORMASI MAHASISWA**
- **Nama Mahasiswa:** Faidil Aqiel
- **NIM:** 41257189
- **Kelas:** Reguler Sore / 1F-2025
- **Mata Kuliah:** Rekayasa Perangkat Lunak (RPL)
- **Fokus Video:** 100% Praktek Langsung di Aplikasi Web & Fitur AI (Live Demo)
- **Target Durasi:** 8 – 12 Menit

---

## PANDUAN PERSIAPAN SEBELUM MENEKAN TOMBOL RECORD:
1. Buka browser **Google Chrome** di alamat: `http://localhost:5000` (posisikan di halaman Login).
2. Siapkan 1 gambar kartu barcode siswa di HP Anda (atau cetak di kertas) untuk diarahkan ke webcam.
3. Buka tab kedua: `https://github.com/faidilaqiel/absensi-digital`
4. Buka tab ketiga: `http://localhost/phpmyadmin` (opsional untuk memperlihatkan database).

---

## NASKAH LENGKAP WORD-BY-WORD (BACA SAMBIL KLIK DI LAYAR)

---

### BAGIAN 1: PEMBUKAAN & LOGIN MULTI-ROLE (Menit 00:00 - 01:30)

*(Aksi Layar: Tampilkan halaman Login di `localhost:5000`)*

> "Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat pagi kepada Bapak/Ibu Dosen Pengampu mata kuliah Rekayasa Perangkat Lunak. 
> 
> Perkenalkan, saya **Faidil Aqiel**, NIM **41257189**, dari kelas **Reguler Sore 1F-2025**.
> 
> Pada video kali ini, saya akan mempraktikkan secara langsung (*live demonstration*) sistem aplikasi web yang telah saya bangun, yaitu **Sistem Informasi Presensi Siswa Digital Berbasis QR Code dan Asisten Virtual AI (PresensiAI) di SDN Pengampon 3 Kota Cirebon**.
> 
> Sekarang kita mulai dari halaman login. Sistem ini menerapkan sistem keamanan berbasis *Role-Based Access Control* (RBAC) dengan 4 hak akses: Administrator, Petugas Piket, Wali Kelas, dan Kepala Sekolah.
> 
> Pertama, saya masuk sebagai **Administrator**..."

*(Aksi Layar: Ketik username `admin` dan password `admin123`, lalu klik tombol Masuk)*

> "...Setelah berhasil login, kita langsung diarahkan ke halaman utama Dashboard sistem."

---

### BAGIAN 2: PRAKTEK DASHBOARD & STRUKTUR 7 ROMBEL (Menit 01:30 - 03:00)

*(Aksi Layar: Tunjukkan halaman Dashboard, gerakkan kursor di Card Statistik & Tabel Rombel)*

> "Di halaman Dashboard ini, seluruh metrik kehadiran disajikan secara *real-time*.
> 
> Perhatikan pada kartu statistik utama di atas:
> - Terdapat metrik **Total Siswa (224 Siswa)** yang terdaftar aktif di SDN Pengampon 3.
> - **Total Rombel (7 Kelas)** dari Kelas 1 sampai Kelas 6.
> - Serta metrik pemantauan harian: Hadir Pagi, Terlambat, Sakit, dan Izin.
> 
> Tanggal yang tampil di sini adalah tanggal lokal kalender nyata hari ini (*15 November 2026*).
> 
> Setiap kartu ini bersifat interaktif. Misalnya jika saya klik kartu **Total Siswa**..."

*(Aksi Layar: Klik kartu Total Siswa, hingga muncul modal daftar siswa)*

> "...Sistem langsung menampilkan *drill-down modal* berisi daftar lengkap nama 224 siswa beserta kelas dan kontaknya.
> 
> Di bagian bawah, terdapat **Tabel Struktur 7 Rombongan Belajar Resmi**:
> Mulai dari Kelas 1 diampu Ibu Rizky Yulianti, Kelas 2A Ibu Elis Susilawati, Kelas 2B Bapak Ahmad, Kelas 3 Bapak Nana Setiana, Kelas 4 Ibu Iin Asminah, Kelas 5 Ibu Gina Rahmania Sari, hingga Kelas 6 Ibu Sri Yulinawati.
> 
> Tabel ini dirancang responsif, sehingga jika dibuka di layar smartphone, tabel dapat digeser ke samping dengan sangat halus."

---

### BAGIAN 3: PRAKTEK SCANNER QR, SOUND BEEP KASIR, & TTS (Menit 03:00 - 05:30)

*(Aksi Layar: Klik menu **Scan QR Barcode** di bilah navigasi sebelah kiri)*

> "Sekarang kita masuk ke modul operasional utama di pintu gerbang sekolah, yaitu **Scan QR Barcode**.
> 
> Modul ini dirancang cepat untuk petugas piket. Kamera scanner langsung aktif mendeteksi barcode secara otomatis.
> 
> Sekarang saya akan mempraktikkan pemindaian kartu identitas siswa. Saya arahkan kartu QR siswa ke kamera..."

*(Aksi Layar: Dekatkan kartu QR siswa ke webcam laptop)*
*(Dengarkan efek suara di video: Bunyi 'Beep' 1760 Hz kasir minimarket, lalu suara TTS: 'Absensi berhasil!')*

> "...Bisa kita dengarkan bersama:
> 1. Terdengar efek nada **Beep pendek berfrekuensi 1760 Hz** persis seperti scanner kasir barcode minimarket modern, diikuti suara sintesis bahasa Indonesia **'Absensi berhasil'**. Nama siswa sengaja tidak dieja huruf per huruf agar tidak bising dan mempercepat alur kedatangan di gerbang.
> 2. Di layar muncul kartu verifikasi visual yang besar dan jelas: nama siswa, NISN, kelas, foto profil, dan status jam kehadirannya.
> 
> Sekarang, mari kita uji **Fitur Pencegahan Absensi Ganda (Anti-Duplicate)**:
> Jika siswa yang sama mencoba scan kartunya untuk kedua kalinya hari ini..."

*(Aksi Layar: Arahkan kembali kartu siswa yang sama ke kamera)*
*(Dengarkan efek suara: Bunyi buzzer)*

> "...Sistem langsung menolak! Terdengar suara *buzzer* peringatan dan muncul notifikasi bahwa siswa tersebut sudah tercatat absen sebelumnya.
> 
> Selain itu, jika ada siswa yang lupa membawa kartu fisik, petugas dapat menekan tombol **Input Manual Berizin**..."

*(Aksi Layar: Klik tombol Input Manual di bawah kamera, pilih 1 nama siswa, klik Simpan)*

> "...Dan kehadiran siswa tersebut tetap dapat dicatat dengan catatan khusus dispensasi petugas."

---

### BAGIAN 4: PRAKTEK CHATBOT AI (PRESENSIAI) SECARA REAL-TIME (Menit 05:30 - 08:30)

*(Aksi Layar: Arahkan kursor ke pojok kanan bawah, klik gelembung avatar robot PresensiAI untuk membuka jendela chat)*

> "Sekarang kita beralih ke fitur kecerdasan buatan utama aplikasi ini, yaitu **PresensiAI**—asisten virtual pintar yang terintegrasi dengan Google Gemini API.
> 
> Berbeda dari chatbot biasa, PresensiAI memiliki kemampuan **Function Calling / Tool Calling langsung ke basis data MySQL** sekolah sehingga jawabannya **100% akurat dan bebas halusinasi**.
> 
> Mari kita uji dengan 4 skenario pertanyaan:
> 
> **Uji Coba 1: Menanyakan Siswa yang Belum Absen**
> Saya ketik pertanyaan: *'Siapa saja siswa yang belum absen hari ini?'*..."

*(Aksi Layar: Ketik teks tersebut di chat, tekan tombol Kirim)*

> "...Perhatikan responnya. Status AI menampilkan 'Sedang mengetik...'. 
> Model AI secara cerdas memanggil fungsi `getSiswaBelumAbsen()` ke basis data sekolah.
> Hasilnya keluar: AI hanya menyebutkan siswa yang memang belum absen hari ini. Siswa yang tadi sudah kita scan otomatis tidak muncul di daftar ini! Seluruh nama disusun dengan penomoran urut yang rapi dan bersih dari simbol bintang markdown.
> 
> **Uji Coba 2: Menanyakan Wali Kelas (Uji Anti-Mengarang Data)**
> Sekarang saya tanyakan: *'Siapa wali kelas 2A dan siapa wali kelas 4?'*..."

*(Aksi Layar: Ketik teks tersebut di chat, tekan tombol Kirim)*

> "...AI mengeksekusi fungsi `getWaliKelas` ke tabel kelas.
> Jawabannya tepat 100%: Wali kelas 2A adalah Ibu Elis Susilawati, dan Kelas 4 adalah Ibu Iin Asminah. AI tidak mengarang nama orang lain.
> 
> **Uji Coba 3: Fitur Multimodal Computer Vision**
> PresensiAI juga dibekali mata komputer. Perhatikan ikon klip kertas di sebelah kiri kolom input. Saya klik dan unggah foto kartu absensi siswa..."

*(Aksi Layar: Klik ikon klip kertas, pilih gambar kartu barcode, lalu kirim)*

> "...Gambar kartu langsung dianalisis oleh Gemini Vision Engine, dan AI mengonfirmasi keaslian format kartu absensi SDN Pengampon 3 tersebut.
> 
> **Uji Coba 4: Guardrails (Penolakan Pertanyaan Luar Konteks)**
> Terakhir, mari kita uji batasan aturan AI. Jika ada guru atau siswa yang usil menanyakan hal umum di luar konteks sekolah, misalnya: *'Siapa presiden Indonesia ke-2?'*..."

*(Aksi Layar: Ketik 'siapa presiden indonesia ke 2', tekan tombol Kirim)*

> "...Lihat hasilnya! AI menolak dengan sopan menggunakan kalimat baku:
> *'Maaf Bapak/Ibu, saya adalah asisten khusus absensi sekolah. Saya tidak dapat menjawab pertanyaan di luar topik kehadiran siswa atau informasi sekolah.'*
> Ini membuktikan bahwa sistem AI kita aman dan fokus pada tugasnya."

---

### BAGIAN 5: PRAKTEK CETAK KARTU F4, RESET DATA, & BASIS DATA (Menit 08:30 - 10:00)

*(Aksi Layar: Tutup widget chat, lalu klik menu **Cetak Kartu Siswa**)*

> "Sekarang kita beralih ke modul pendukung:
> 
> 1. **Modul Cetak Kartu Siswa:**
>    - Di halaman ini, sekolah dapat mencetak kartu identitas ber-barcode untuk seluruh siswa.
>    - Tersedia filter per kelas dan tombol **Format PDF (F4)**.
>    - Jika tombol PDF ini ditekan, sistem otomatis membuat lembar kerja Folio F4 yang memuat 12 kartu per lembar dengan algoritma perapian nama panjang agar tidak terpotong.
> 
> 2. **Modul Data Kehadiran & Reset Data:**
>    - Kita buka menu **Data Kehadiran**..."

*(Aksi Layar: Klik menu Data Kehadiran)*

> "...Di sini seluruh log kehadiran tersimpan rapi dengan rincian jam, metode scan, status, dan tombol Ekspor Excel.
> - Di samping tombol Excel, terdapat tombol merah **Hapus Semua / Reset**.
> - Fitur ini memiliki proteksi keamanan: untuk mereset seluruh data, administrator wajib mengetik kata konfirmasi `HAPUS SEMUA` agar tidak terjadi salah hapus data.
> - Seluruh data ini tersimpan ganda (*Dual-Storage*) secara sinkron di SQLite lokal dan MySQL phpMyAdmin."

---

### BAGIAN 6: PRAKTEK UNIT TESTING & GITHUB ACTIONS CI/CD (Menit 10:00 - 11:30)

*(Aksi Layar: Buka jendela Terminal / PowerShell, lalu buka tab GitHub)*

> "Untuk menjamin keandalan perangkat lunak, proyek ini telah dilengkapi pengujian otomatis dan alur kerja CI/CD:
> 
> 1. **Automated Unit Testing:**
>    - Di terminal proyek, saya jalankan perintah pengujian: `npm test`..."

*(Aksi Layar: Di terminal ketik `npm test` dan tekan Enter)*

> "...Bisa kita lihat di terminal: **11 dari 11 uji test passed 100%**. Mulai dari validasi skema 224 siswa, batas toleransi jam 07.00 WIB, hingga integritas fungsi AI teruji valid.
> 
> 2. **CI/CD Pipeline di GitHub:**
>    - Sekarang kita buka repositori GitHub publik saya di `github.com/faidilaqiel/absensi-digital`..."

*(Aksi Layar: Buka tab browser GitHub, klik tab **Actions**)*

> "...Pada tab **Actions**, alur kerja CI/CD Pipeline telah berjalan sukses dengan centang hijau (*Green Passed*). Setiap ada perubahan kode, sistem otomatis melakukan testing dan memvalidasi build produksi."

---

### BAGIAN 7: PENUTUP (Menit 11:30 - 12:00)

*(Aksi Layar: Kembali ke halaman utama Dashboard aplikasi atau kamera wajah)*

> "Demikian demonstrasi aplikasi secara langsung (*live demo*) dari proyek akhir Rekayasa Perangkat Lunak: **Sistem Informasi Presensi Siswa Digital & PresensiAI SDN Pengampon 3 Kota Cirebon**.
> 
> Seluruh fungsionalitas aplikasi, integrasi kecerdasan buatan, basis data, hingga alur CI/CD telah berjalan secara utuh dan memenuhi target luaran tugas akhir.
> 
> Terima kasih atas perhatian Bapak/Ibu Dosen Pengampu. Saya Faidil Aqiel pamit undur diri.
> 
> Wassalamu’alaikum Warahmatullahi Wabarakatuh."

---

## CATATAN PENTING SAAT MEREKAM:
- **Jangan buru-buru:** Ikuti alur klik mouse sesuai naskah di atas.
- **Tampilkan bukti nyata:** Saat demo scanner dan chat AI, biarkan layar merekam prosesnya selama beberapa detik agar penguji melihat respon aslinya.
