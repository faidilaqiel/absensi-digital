**Nama: Faidil Aqiel**
**NIM: 41257189**
**Kelas: Reg Sore / 1F-2025**
**Prodi: Teknik Informatika**
Link Video:


# Aplikasi Absensi Digital SDN Pengampon 3 Kota Cirebon

Aplikasi Sistem Informasi Absensi Siswa berbasis pemindaian QR Code pada kartu identitas siswa untuk kedatangan pagi hari di **SDN Pengampon 3 Kota Cirebon**, dioptimalkan untuk perangkat smartphone sekolah maupun desktop/tablet.

---

## 🌟 Fitur Utama & Modul Lengkap

1. **Dashboard & Statistik Rombongan Belajar (Rombel)**
   - **Statistik Utama**: Total Seluruh Siswa, Total Rombel Aktif (7 Rombel), Hadir Pagi, Sakit, Izin, Alpa, Terlambat, dan Belum Hadir.
   - **Fitur Khusus Statistik 7 Rombel**:
     - Menampilkan seluruh 7 rombel aktif: **Kelas 1, Kelas 2A, Kelas 2B, Kelas 3, Kelas 4, Kelas 5, Kelas 6**.
     - Total siswa per rombel dan persentase kehadiran masing-masing kelas.
     - **Interaktif Detail Rombel**: Klik baris rombel untuk melihat modal daftar siswa di kelas tersebut beserta status kehadirannya hari ini.
     - Filter distribusi rombel berdasarkan Tahun Ajaran.
   - **Aktivitas Scan Terbaru**: Live feed konfirmasi kehadiran siswa dari gerbang sekolah.
   - **Kandidat Reward Bulanan**: Siswa terajin yang datang paling awal di bulan berjalan.

2. **Pemindai Barcode / QR Code**
   - Pemindaian kamera berkecepatan tinggi (< 2 detik) menggunakan kamera belakang (*environment*) atau kamera depan.
   - **Audio Synthesizer Real-time**: Chime nada ceria untuk hadir tepat waktu, nada peringatan untuk terlambat, dan buzzer untuk tolak absensi ganda.
   - **Animasi Visual & Confetti**: Konfirmasi instan menampilkan foto siswa, nama, NISN, rombel, jam kedatangan, dan status.
   - **Dukungan Barcode Gun / Scanner Eksternal & Input Manual**: Petugas dapat mengetikkan atau memindai menggunakan scanner USB/Bluetooth.
   - **Mode Otorisasi Manual (Siswa Lupa Bawa Kartu)**: Petugas dapat mencatat kehadiran siswa dengan memilih nama siswa dan menginput alasan otorisasi.

3. **Pencegahan Absensi Ganda & Validasi Cerdas**
   - Siswa yang melakukan scan lebih dari satu kali dalam satu hari otomatis **DITOLAK** dengan notifikasi jam scan sebelumnya.
   - Barcode tidak terdaftar / siswa nonaktif otomatis menampilkan pesan kesalahan.

4. **Aturan Keterlambatan Sekolah (Jam Masuk 07.00 WIB)**
   - **Sebelum atau tepat pukul 07.00** (06.00 – 07.00) = **Hadir**.
   - **Setelah pukul 07.00** (07.01 dan seterusnya) = **Terlambat** (otomatis menghitung selisih menit keterlambatan).

5. **Dukungan Mode Offline & Sinkronisasi Antrean (Offline Queue Sync)**
   - Jika koneksi internet/WiFi di gerbang sekolah terputus, pemindaian tetap dapat berjalan di HP dan disimpan di antrean lokal (*Local Queue*).
   - Saat koneksi online kembali, notifikasi muncul dan sistem menyinkronkan data antrean ke database server tanpa duplikasi data.

6. **Cetak Kartu Siswa Ber-Barcode (ID Card Ready)**
   - Layout kartu identitas standar ID Card berlogo **SDN Pengampon 3 Kota Cirebon**.
   - Dilengkapi foto siswa, nama lengkap, NISN, NIS, rombel, dan QR Code unik.
   - **Cetak Massal**: Otomatis menyusun kartu per kelas dalam format siap cetak (A4/kertas tebal/PVC).
   - **Cetak Ulang / Regenerasi QR Code**: Jika kartu siswa hilang, sistem dapat membuat kode unik baru sehingga kartu lama yang hilang otomatis tidak dapat disalahgunakan.

7. **Data Kehadiran & Riwayat Absensi**
   - Riwayat harian, mingguan, dan bulanan dengan filter rombel dan status.
   - Fitur koreksi catatan absensi dengan alasan pencatatan petugas.

8. **Pencatatan Izin, Sakit, & Alpa**
   - Form pencatatan ketidakhadiran beserta keterangan surat dokter atau izin orang tua.

9. **Laporan & Papan Reward Kedisiplinan Siswa (Early Bird Reward)**
   - Rekapitulasi per rombel dan per siswa.
   - **Leaderboard Siswa Datang Paling Awal**: Pemeringkatan juara 1 (Emas), juara 2 (Perak), dan juara 3 (Perunggu) bagi siswa paling disiplin setiap bulannya.
   - Ekspor laporan ke format **Excel (.xlsx)** dan **PDF (.pdf)**.

10. **Manajemen Akun Pengguna & Hak Akses (Role Matrix)**
    - **Admin**: Akses penuh ke seluruh konfigurasi, data master, dan pencadangan.
    - **Petugas Piket Pagi**: Melakukan scan QR kartu siswa dan mencatat absensi manual/izin.
    - **Guru / Wali Kelas**: Memantau kehadiran dan mengelola izin/sakit rombel yang diampunya.
    - **Kepala Sekolah**: Memantau statistik, rekapitulasi kehadiran, dan reward kedisiplinan.

11. **Pengaturan Sistem & Backup Database**
    - Konfigurasi jam operasional absensi pagi.
    - Konfigurasi profil sekolah SDN Pengampon 3 Kota Cirebon.
    - Tombol pencadangan (*backup*) langsung mengunduh file database SQLite (`attendance.db`).

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Jalankan Server (Backend & Frontend Terpadu)
```bash
npm start
```
Aplikasi dapat dibuka di browser melalui:
- **Komputer / Laptop**: `http://localhost:5000`
- **HP Samsung Galaxy A56 (Jaringan WiFi Sama)**: `http://<IP_KOMPUTER_SERVER>:5000`

### 2. Akun Uji Coba Bawaan (*Default Accounts*)

| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Petugas Piket** | `petugas` | `petugas123` | Langsung diarahkan ke kamera pemindai QR di HP |
| **Administrator** | `admin` | `admin123` | Akses penuh seluruh fitur & cetak kartu |
| **Wali Kelas** | `Nama Depan Guru` | `Nama Depan Guru123` | Akses monitoring Guru |
| **Kepala Sekolah** | `kepsek` | `kepsek123` | Monitoring statistik sekolah & reward siswa |

---

## 🏛️ Struktur 7 Rombongan Belajar (Rombel)
1. **Kelas 1** - Wali Kelas: Rizky Yulianti, S.Pd.SD. (35 Siswa)
2. **Kelas 2A** - Wali Kelas: Elis Susilawati, S.Pd. (23 Siswa)
3. **Kelas 2B** - Wali Kelas: Ahmad, S.Pd. (23 Siswa)
4. **Kelas 3** - Wali Kelas: Nana Setiana, S.Pd. (33 Siswa)
5. **Kelas 4** - Wali Kelas: Iin Asminah, S.Pd. (40 Siswa)
6. **Kelas 5** - Wali Kelas: Gina Rahmania Sari, S.Pd. (40 Siswa)
7. **Kelas 6** - Wali Kelas: Sri Yulinawati, S.Pd. (30 Siswa)

