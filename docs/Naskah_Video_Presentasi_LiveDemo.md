# NASKAH SKENARIO VIDEO PRESENTASI & LIVE DEMO FINAL (TAHAP 4)
## PROYEK REKAYASA PERANGKAT LUNAK (RPL)

---

### **INFORMASI MAHASISWA & PROYEK**
- **Nama Mahasiswa:** Faidil Aqiel
- **NIM:** 41257189
- **Kelas:** Reguler Sore / 1F-2025
- **Mata Kuliah:** Rekayasa Perangkat Lunak (RPL)
- **Judul Proyek:** Sistem Informasi Presensi Siswa Digital Berbasis QR Code & Asisten Virtual AI (PresensiAI) - SDN Pengampon 3 Kota Cirebon
- **Target Durasi Video:** 8 – 12 Menit
- **Mode Penyajian:** *Screen Recording* + Kamera Wajah (*Facecam/Picture-in-Picture*) + Suara Jelas

---

## RUNDOWN & STRUKTUR WAKTU VIDEO (8 - 12 MENIT)

| Bagian | Menit | Topik Bahasan | Aksi Layar (Visual Action) |
| :---: | :---: | :--- | :--- |
| **I** | 00:00 - 01:30 | Pembukaan, Identitas Diri, Latar Belakang & PRD/SRS | Slide Pembuka / Kamera Wajah |
| **II** | 01:30 - 03:00 | Perancangan Sistem SDD (4 UML, SOLID, ERD Basis Data) | Menampilkan Dokumen SDD & Diagram Mermaid |
| **III** | 03:00 - 05:30 | **Live Demo 1:** Scanner QR, Audio Beep, TTS, Kiosk & Offline Mode | Buka Web Browser `localhost:5000/scan` |
| **IV** | 05:30 - 08:30 | **Live Demo 2:** Uji Cerdas PresensiAI (Function Calling, Vision, Guardrails) | Buka Widget Chat PresensiAI & Kirim Prompt |
| **V** | 08:30 - 10:00 | **Live Demo 3:** Dashboard Grid 2x2, Cetak Kartu F4, Reset Data & phpMyAdmin | Navigasi Menu Dashboard, Cards, & phpMyAdmin |
| **VI** | 10:00 - 11:30 | Konstruksi Kode, Automated Unit Testing & GitHub Actions CI/CD | Buka VS Code, Terminal `npm test`, & Tab GitHub Actions |
| **VII**| 11:30 - 12:00 | Kesimpulan & Penutup | Kamera Wajah & Salam Penutup |

---

## NASKAH LENGKAP WORD-BY-WORD (SIAP DIBACA SAAT REKAMAN)

---

### BAGIAN I: PEMBUKAAN & LATAR BELAKANG PROYEK (00:00 - 01:30)

*(Visual: Kamera wajah tampak jelas dengan mikrofon aktif, menampilkan slide judul laporan)*

> **[Bicara dengan intonasi percaya diri dan ramah]**
> 
> "Assalamu’alaikum Warahmatullahi Wabarakatuh. Selamat pagi / siang kepada Bapak/Ibu Dosen Pengampu mata kuliah Rekayasa Perangkat Lunak serta rekan-rekan sekalian.
> 
> Perkenalkan, nama saya **Faidil Aqiel**, dengan **NIM 41257189**, dari **Kelas Reguler Sore / 1F-2025**.
> 
> Pada kesempatan kali ini, saya akan mempresentasikan serta mendemonstrasikan secara *live* proyek akhir Rekayasa Perangkat Lunak saya yang berjudul: **Sistem Informasi Presensi Siswa Digital Berbasis QR Code & Asisten Virtual AI (PresensiAI) di SDN Pengampon 3 Kota Cirebon**.
> 
> Latar belakang dari pengembangan sistem ini berawal dari permasalahan absensi manual di sekolah yang memakan waktu 10 hingga 15 menit setiap pagi, tingginya risiko salah rekapitulasi data kehadiran 224 siswa, serta lambatnya laporan kedisiplinan sampai ke Kepala Sekolah. 
> 
> Untuk menyelesaikan masalah tersebut, saya telah menyusun dokumen kebutuhan standar **IEEE 830 / ISO 29148** pada tahap PRD dan SRS, merancang arsitektur sistem pada tahap SDD, dan mengonstruksi aplikasi web utuh yang kini terintegrasi secara *real-time* dengan kecerdasan buatan."

---

### BAGIAN II: PERANCANGAN ARSITEKTUR & PEMODELAN UML (01:30 - 03:00)

*(Visual: Buka dokumen `SDD_UML_Arsitektur_SDNP3.pdf` atau `cetaksdd.html`, scroll ke bagian diagram UML)*

> **[Bicara sambil mengarahkan kursor mouse ke diagram]**
> 
> "Sebelum masuk ke live demo aplikasi, saya akan menjelaskan fondasi perancangan sistem yang saya bangun pada dokumen SDD:
> 
> 1. **Pertama, Use Case Diagram:** Memetakan 10 use case fungsional untuk 4 aktor, yaitu Administrator, Petugas Piket, Wali Kelas, dan Kepala Sekolah, serta interaksi ke Google Gemini AI Cloud Engine.
> 
> 2. **Kedua, Activity Diagram:** Saya membagi menjadi 2 alur utama, yakni alur bisnis presensi siswa dengan penanganan *offline-first*, dan alur kerja AI yang membedakan input teks dengan input multimodal gambar.
> 
> 3. **Ketiga, Class Diagram Berorientasi Objek:** Dirancang dengan mematuhi prinsip **SOLID**, seperti *Single Responsibility* yang memisahkan modul scanner, audio synthesizer, dan generator kartu, serta *Dependency Inversion* pada lapisan basis data.
> 
> 4. **Keempat, Sequence Diagram:** Memodelkan pertukaran data asinkronus antara Klien React, Router Express.js, Dual-Storage (SQLite WAL & MySQL), hingga pemanggilan fungsi Gemini API secara deterministik.
> 
> 5. **Dan ERD Basis Data:** Terdiri dari 6 entitas yang saling terelasi secara normalisasi, mulai dari tahun ajaran, rombel kelas, akun pengguna, siswa, hingga rekaman riwayat absensi."

---

### BAGIAN III: LIVE DEMO PEMINDAIAN BARCODE QR & SCANNER FITUR (03:00 - 05:30)

*(Visual: Buka browser Chrome pada alamat `http://localhost:5000`, login sebagai Petugas atau Admin, masuk ke menu **Scan QR Barcode**)*

> **[Arahkan kamera ke halaman Scan QR]**
> 
> "Sekarang kita masuk ke pengujian aplikasi secara langsung (*real-time live demo*).
> 
> Saat ini saya berada di halaman **Scan QR Barcode**. Halaman ini dirancang khusus untuk petugas piket di gerbang sekolah:
> 
> - Perhatikan saat kartu QR siswa diarahkan ke kamera... *(Lakukan scan kartu Alula / Dave)*
> 
> *(Dengarkan suara beep: 'Tiiit!' diikuti ucapan: 'Absensi berhasil!')*
> 
> - Sistem langsung merespon dalam waktu di bawah 300 milidetik.
> - Efek suara yang terdengar adalah **Web Audio API Chime 1760 Hz** berdurasi 80 milidetik seperti mesin scanner kasir minimarket modern, dilanjutkan suara sintesis bahasa Indonesia **'Absensi berhasil'**. Nama siswa sengaja tidak dieja huruf per huruf agar tidak mengganggu operasional di lapangan.
> - Di layar visual, profil siswa muncul sangat besar dan jelas: nama siswa, NISN, rombel, foto, dan jam kedatangan.
> 
> Sekarang mari kita uji **Fitur Proteksi**:
> 1. **Uji Scan Ganda:** Jika siswa yang sama mencoba scan kembali... *(Scan kartu yang sama)*
>    *(Buzzer berbunyi)* Sistem langsung menolak dan menampilkan peringatan bahwa siswa tersebut sudah tercatat absen sebelumnya.
> 2. **Uji Siswa Non-Aktif:** Jika siswa berstatus Lulus atau Pindah discan, sistem otomatis menolaknya.
> 3. **Mode Kiosk & Offline:** Aplikasi memiliki tombol Kiosk Mode layar penuh untuk tablet di gerbang, dan jika internet padam, data tersimpan di *Local Offline Queue* dan otomatis tersinkron saat internet kembali menyala."

---

### BAGIAN IV: LIVE DEMO PENGUJIAN KECERDASAN BUATAN - PRESENSIAI (05:30 - 08:30)

*(Visual: Arahkan kursor ke pojok kanan bawah, klik floating icon robot PresensiAI untuk membuka kotak chat)*

> **[Bicara sambil mengetik prompt ke chatbot]**
> 
> "Sekarang kita beralih ke fitur unggulan utama, yaitu **PresensiAI**—asisten virtual berbasis LLM Google Gemini.
> 
> PresensiAI bukan chatbot biasa yang hanya merangkai teks fiksi, melainkan terhubung langsung ke basis data menggunakan **Function Calling / Tool Calling** agar **100% Anti-Halusinasi**.
> 
> Mari kita lakukan 4 skenario pengujian langsung:
> 
> **Pengujian 1: Pertanyaan Data Belum Absen**
> Saya ketik: *'Siapa saja yang belum absen hari ini?'* *(Kirim pesan)*
> 
> - Perhatikan, AI memanggil fungsi `getSiswaBelumAbsen()`.
> - AI mengecek ke database MySQL dan hanya menampilkan siswa yang benar-benar belum absen hari ini (misalnya kelas 3 sampai 6), sementara kelas 1 dan 2 yang tadi sudah kita scan tidak dimunculkan kembali.
> - Seluruh nama disebutkan satu per satu dengan penomoran rapi dan bersih dari simbol bintang tebal markdown.
> 
> **Pengujian 2: Pertanyaan Wali Kelas (Anti-Mengarang Nama Guru)**
> Saya ketik: *'Siapa wali kelas 2A dan kelas 4?'* *(Kirim pesan)*
> 
> - AI memanggil fungsi `getWaliKelas` ke tabel database.
> - Jawabannya tepat: Wali kelas 2A adalah Ibu Elis Susilawati, dan Kelas 4 adalah Ibu Iin Asminah. AI tidak mengarang nama orang lain.
> 
> **Pengujian 3: Multimodal Computer Vision**
> - Di samping kolom chat terdapat tombol klip lampiran. Saya unggah foto kartu QR identitas siswa... *(Unggah foto kartu)*
> - Gemini Vision Engine langsung menganalisis gambar dan mengonfirmasi bahwa kartu tersebut adalah kartu absensi resmi SDN Pengampon 3.
> 
> **Pengujian 4: Guardrails (Penolakan Topik Luar Konteks Sekolah)**
> Sekarang mari kita uji ketegasan aturan AI. Saya ketik pertanyaan umum di luar konteks sekolah: *'Siapa presiden Indonesia ke-2?'* *(Kirim pesan)*
> 
> - Perhatikan responnya! AI menolak dengan tegas menggunakan kalimat baku:
>   *'Maaf Bapak/Ibu, saya adalah asisten khusus absensi sekolah. Saya tidak dapat menjawab pertanyaan di luar topik kehadiran siswa atau informasi sekolah.'*
> - Ini membuktikan bahwa model AI telah terkunci aman (*strict guardrails*) hanya untuk kebutuhan sekolah."

---

### BAGIAN V: LIVE DEMO DASHBOARD, CETAK KARTU F4, & BASIS DATA (08:30 - 10:00)

*(Visual: Masuk ke halaman Dashboard, lalu Cetak Kartu Siswa, lalu Data Kehadiran)*

> **[Bicara sambil mendemokan menu-menu lain]**
> 
> "Selanjutnya, mari kita lihat fitur manajemen sekolah lainnya:
> 
> 1. **Dashboard Statistik:**
>    - Di desktop maupun di tampilan smartphone, card statistik tertata rapi dalam Grid 2x2.
>    - Tanggal berjalan secara *real-time* mengikuti kalender lokal WIB tanpa ada selisih UTC.
>    - Setiap kartu statistik bisa diklik untuk melihat daftar siswa di dalamnya (*drill-down modal*).
> 
> 2. **Modul Cetak Kartu Siswa:**
>    - Di menu ini, kita bisa mencetak kartu barcode identitas siswa secara massal dalam format **PDF lembar kerja F4 (12 kartu per lembar)** siap potong, maupun format ZIP PNG.
>    - Dilengkapi fitur *Smart Line Wrapping* sehingga nama siswa yang sangat panjang tidak akan terpotong bingkai.
> 
> 3. **Modul Data Kehadiran & Reset Data:**
>    - Memuat riwayat scan lengkap dengan filter tanggal dan rombel serta tombol Ekspor Excel instan.
>    - Tersedia fitur aman **'Hapus Semua / Reset Data'** yang dilengkapi proteksi ketik kata verifikasi `HAPUS SEMUA`.
>    - Seluruh perubahan data langsung tersinkron ganda (*dual-storage*) ke **SQLite** dan **MySQL phpMyAdmin** pada port 3306."

---

### BAGIAN VI: KODE PROGRAM, AUTOMATED UNIT TESTING & CI/CD (10:00 - 11:30)

*(Visual: Buka VS Code / Terminal PowerShell, lalu buka tab GitHub Actions di browser)*

> **[Bicara sambil mendemokan terminal dan GitHub]**
> 
> "Sekarang mari kita tinjau kualitas konstruksi perangkat lunak dan otomasi pengujian:
> 
> 1. **Automated Unit Testing:**
>    - Saya telah menyusun skrip unit test otomatis di berkas `test/app.test.js` menggunakan modul *native Node.js Test Runner*.
>    - Mari kita jalankan di terminal: `npm test`... *(Jalankan perintah)*
>    - Hasilnya: **11 dari 11 uji test passed 100%**, mencakup validasi skema database 224 siswa, logika kalkulasi menit keterlambatan, hingga deterministik query AI.
> 
> 2. **CI/CD Pipeline GitHub Actions:**
>    - Seluruh kode proyek telah dipush ke repositori GitHub publik pribadi saya di `github.com/faidilaqiel/absensi-digital`.
>    - Pada tab **Actions** di GitHub, alur kerja CI/CD (`.github/workflows/ci.yml`) otomatis terpicu pada setiap push commit untuk memvalidasi test di berbagai versi Node.js dan mengompilasi build Vite production secara otomatis hingga status centang hijau."

---

### BAGIAN VII: KESIMPULAN & PENUTUP (11:30 - 12:00)

*(Visual: Kamera wajah penuh / Facecam utama)*

> **[Bicara dengan ramah dan formal]**
> 
> "Sebagai kesimpulan, Sistem Informasi Presensi Siswa Digital SDN Pengampon 3 ini telah berhasil dibangun secara mandiri mulai dari Tahap 1 (PRD/SRS IEEE 830), Tahap 2 (Pemodelan UML SOLID & SDD), Tahap 3 (Konstruksi Kode Bersih, Integrasi AI Gemini, Unit Testing, dan CI/CD Pipeline), hingga live demo utuh hari ini.
> 
> Sistem ini terbukti mampu memangkas waktu absensi pagi hingga 90%, mencegah kesalahan data manual, serta memberikan kemudahan akses informasi bagi para guru melalui kehadiran asisten cerdas PresensiAI.
> 
> Demikian presentasi dan live demo proyek akhir Rekayasa Perangkat Lunak ini saya sampaikan. Terima kasih banyak atas perhatian Bapak/Ibu Dosen Pengampu.
> 
> Wabillahi taufiq wal hidayah, Wassalamu’alaikum Warahmatullahi Wabarakatuh."

---

## TIPS REKAMAN AGAR MENDAPAT NILAI MAKSIMAL (A):
1. **Gunakan OBS Studio atau Clipchamp:** Rekam layar PC (*Display Capture*) + kotak wajah Anda di sudut kanan atas (*Facecam*).
2. **Siapkan 2 Tab Chrome:**
   - Tab 1: Aplikasi berjalan di `http://localhost:5000`
   - Tab 2: Repositori GitHub Anda di `https://github.com/faidilaqiel/absensi-digital`
3. **Praktekkan Scan Kartu Nyata:** Siapkan 1 file kartu QR di layar HP atau cetak kertas untuk discan ke kamera laptop saat bagian Demo Scan QR.
