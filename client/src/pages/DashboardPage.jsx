import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  CheckCircle,
  Clock,
  HeartPulse,
  FileText,
  AlertOctagon,
  Calendar,
  Award,
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function DashboardPage({ setActiveTab, selectedAY: propSelectedAY, onSelectAY }) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [academicYears, setAcademicYears] = useState([]);
  const [localAY, setLocalAY] = useState('');

  const activeAYId = propSelectedAY || localAY;
  const [selectedRombelModal, setSelectedRombelModal] = useState(null);
  const [rombelStudents, setRombelStudents] = useState([]);
  const [loadingRombelStudents, setLoadingRombelStudents] = useState(false);

  // Status Detail Modal State
  const [statusModal, setStatusModal] = useState(null); // { type, title, subtitle, badgeColor }
  const [statusStudents, setStatusStudents] = useState([]);
  const [loadingStatusStudents, setLoadingStatusStudents] = useState(false);
  const [statusFilterClass, setStatusFilterClass] = useState('');
  const [statusSearch, setStatusSearch] = useState('');

  // Live Real-Time Indonesian Clock (WIB - Waktu Indonesia Barat)
  const [currentTimeWIB, setCurrentTimeWIB] = useState('');
  const [currentDateWIB, setCurrentDateWIB] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format Jam WIB: HH:mm:ss WIB
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      // Format Hari & Tanggal: Kamis, 12 November 2026
      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setCurrentTimeWIB(`${timeStr} WIB`);
      setCurrentDateWIB(dateStr);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (propSelectedAY) {
      setLocalAY('');
    }
    loadDashboard();
  }, [selectedDate, activeAYId]);

  const loadAcademicYears = async () => {
    try {
      const res = await apiRequest('/classes/academic-years');
      setAcademicYears(res.years || []);
      if (res.years && res.years.length > 0 && !propSelectedAY) {
        const active = res.years.find(y => y.is_active === 1);
        if (active) {
          setLocalAY(String(active.id));
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/dashboard?date=${selectedDate}`;
      if (activeAYId) url += `&academic_year_id=${activeAYId}`;
      const res = await apiRequest(url);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRombelDetail = async (rombel) => {
    setSelectedRombelModal(rombel);
    setLoadingRombelStudents(true);
    try {
      const res = await apiRequest(`/dashboard/rombel/${rombel.id}/students?date=${selectedDate}`);
      setRombelStudents(res.students || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingRombelStudents(false);
    }
  };

  const handleOpenStatusDetail = async (config) => {
    setStatusModal(config);
    setStatusFilterClass('');
    setStatusSearch('');
    setLoadingStatusStudents(true);
    try {
      let url = `/dashboard/status-students?status=${config.statusType}&date=${selectedDate}`;
      if (activeAYId) url += `&academic_year_id=${activeAYId}`;
      const res = await apiRequest(url);
      setStatusStudents(res.students || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingStatusStudents(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-[#16423C] mb-3" />
        <p className="text-xs font-semibold">Memuat data kehadiran SDN Pengampon 3...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-xs">
        Gagal memuat dashboard: {error}
      </div>
    );
  }

  const { summary, rombel_stats, recent_scans, early_birds, late_today } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Dashboard Senada Portal */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B89758] uppercase">
            <span className="inline-block w-4 h-0.5 bg-[#B89758]"></span>
            <span>RINGKASAN KEHADIRAN HARIAN</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111827] mt-1 tracking-tight">
            Dashboard Statistik & Rombongan Belajar
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            SDN Pengampon 3 Kota Cirebon • Tahun Ajaran: {data.academic_year || '2024/2025'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker Tanggal Dashboard */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={loadDashboard}
            title="Muat Ulang Data"
            className="p-2.5 text-slate-600 hover:text-[#16423C] bg-[#F8F9FA] hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bagian A — Statistik Utama Hari Ini */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#16423C]"></span>
            <span>Bagian A — Statistik Utama Hari Ini</span>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Standar Jam Masuk: <span className="font-bold text-[#16423C]">07.00 WIB</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Siswa */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'total',
              title: 'Daftar Seluruh Siswa Terdaftar',
              subtitle: 'Semua rombel aktif SDN Pengampon 3',
              badgeColor: 'bg-slate-100 text-slate-800'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#16423C] hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat daftar seluruh siswa"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 group-hover:text-[#16423C] transition">Total Siswa</span>
              <span className="p-1.5 rounded-lg bg-[#16423C]/10 text-[#16423C] group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-[#16423C] transition">{summary.total_students}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Siswa Terdaftar</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#16423C] transition" />
            </div>
          </div>

          {/* Total 7 Rombel Aktif */}
          <div
            onClick={() => {
              const el = document.getElementById('rombel-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#B89758] hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat statistik seluruh rombel belajar"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 group-hover:text-[#8C6D37] transition">Total Rombel</span>
              <span className="p-1.5 rounded-lg bg-[#B89758]/15 text-[#8C6D37] group-hover:scale-110 transition">
                <GraduationCap className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-[#16423C]">{summary.total_rombel}</div>
            <div className="text-[10px] text-[#B89758] font-bold mt-0.5 flex items-center justify-between">
              <span>Kelas 1 - Kelas 6</span>
              <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Hadir Tepat Waktu */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'hadir',
              title: 'Daftar Siswa Hadir Pagi (Tepat Waktu)',
              subtitle: 'Siswa yang hadir ≤ 07.00 WIB pada tanggal terpilih',
              badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat siswa yang hadir tepat waktu"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-800">Hadir Pagi</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                <CheckCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700">{summary.hadir}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center justify-between">
              <span>≤ 07.00 WIB</span>
              <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Terlambat */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'terlambat',
              title: 'Daftar Siswa Terlambat Masuk',
              subtitle: 'Siswa yang scan kehadiran > 07.00 WIB',
              badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-500 hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat siswa yang terlambat hari ini"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-800">Terlambat</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-600">{summary.terlambat}</div>
            <div className="text-[10px] text-amber-600 font-bold mt-0.5 flex items-center justify-between">
              <span>&gt; 07.00 WIB</span>
              <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Sakit */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'sakit',
              title: 'Daftar Siswa Sakit Hari Ini',
              subtitle: 'Ketidakhadiran dengan keterangan sakit / surat dokter',
              badgeColor: 'bg-rose-50 text-rose-800 border-rose-200'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-rose-500 hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat siswa yang sakit hari ini"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-800">Sakit</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 group-hover:scale-110 transition">
                <HeartPulse className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600">{summary.sakit}</div>
            <div className="text-[10px] text-rose-400 mt-0.5 flex items-center justify-between">
              <span>Surat Keterangan</span>
              <ChevronRight className="w-3 h-3 text-rose-300 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Izin */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'izin',
              title: 'Daftar Siswa Izin Hari Ini',
              subtitle: 'Ketidakhadiran dengan izin resmi orang tua / wali',
              badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat siswa yang berizin hari ini"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-cyan-800">Izin</span>
              <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 group-hover:scale-110 transition">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-cyan-700">{summary.izin}</div>
            <div className="text-[10px] text-cyan-500 mt-0.5 flex items-center justify-between">
              <span>Izin Orang Tua</span>
              <ChevronRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Alpa / Belum Absen */}
          <div
            onClick={() => handleOpenStatusDetail({
              statusType: 'alpa_or_belum',
              title: 'Daftar Siswa Alpa / Belum Hadir',
              subtitle: 'Siswa yang belum melakukan presensi atau tercatat alpa',
              badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
            })}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1 hover:border-slate-500 hover:shadow-md transition cursor-pointer group"
            title="Klik untuk melihat siswa yang alpa / belum hadir"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500">Alpa / Belum</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:scale-110 transition">
                <AlertOctagon className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-700">
              {summary.alpa} <span className="text-xs text-slate-400 font-normal">({summary.belum_hadir} blm)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Tanpa Kabar</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Bagian B — Statistik Rombongan Belajar (Rombel) */}
      <div id="rombel-section" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B89758] uppercase">
              <span className="inline-block w-3.5 h-0.5 bg-[#B89758]"></span>
              <span>STRUKTUR ROMBEL</span>
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>Bagian B — Statistik Rombongan Belajar ({summary.total_rombel} Kelas)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Klik rombel untuk melihat daftar detail nama siswa dan status kehadirannya hari ini
            </p>
          </div>
          <div className="text-xs font-bold text-[#16423C] bg-[#16423C]/10 px-3 py-1.5 rounded-xl border border-[#16423C]/20 self-start sm:self-auto">
            Tingkat Kehadiran Sekolah: {summary.attendance_rate}%
          </div>
        </div>

        {/* Tabel Interaktif Rombel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Rombel / Kelas</th>
                <th className="py-2.5 px-3">Wali Kelas</th>
                <th className="py-2.5 px-3 text-center">Total Anggota</th>
                <th className="py-2.5 px-3 text-center text-emerald-800">Hadir</th>
                <th className="py-2.5 px-3 text-center text-amber-800">Terlambat</th>
                <th className="py-2.5 px-3 text-center text-rose-800">Sakit</th>
                <th className="py-2.5 px-3 text-center text-cyan-800">Izin</th>
                <th className="py-2.5 px-3 text-center text-slate-600">Alpa</th>
                <th className="py-2.5 px-3 text-center">Persentase</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rombel_stats.map(r => (
                <tr
                  key={r.id}
                  onClick={() => handleOpenRombelDetail(r)}
                  className="hover:bg-slate-50/80 cursor-pointer transition"
                >
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16423C]"></span>
                    <span>{r.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{r.homeroom_teacher || '-'}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">{r.total_students} siswa</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">{r.hadir}</td>
                  <td className="py-3 px-3 text-center font-bold text-amber-600">{r.terlambat}</td>
                  <td className="py-3 px-3 text-center font-bold text-rose-600">{r.sakit}</td>
                  <td className="py-3 px-3 text-center font-bold text-cyan-700">{r.izin}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-400">{r.alpa}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#16423C] h-full rounded-full transition-all"
                          style={{ width: `${r.percentage}%` }}
                        ></div>
                      </div>
                      <span className="font-extrabold text-[11px] text-[#16423C]">{r.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16423C] hover:text-[#1B4D3E]">
                      <span>Lihat Siswa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                <td className="py-3 px-3" colSpan="2">
                  Total Seluruh Rombel ({rombel_stats.length})
                </td>
                <td className="py-3 px-3 text-center">{summary.total_students} siswa</td>
                <td className="py-3 px-3 text-center text-emerald-700">{summary.hadir}</td>
                <td className="py-3 px-3 text-center text-amber-600">{summary.terlambat}</td>
                <td className="py-3 px-3 text-center text-rose-600">{summary.sakit}</td>
                <td className="py-3 px-3 text-center text-cyan-700">{summary.izin}</td>
                <td className="py-3 px-3 text-center text-slate-400">{summary.alpa}</td>
                <td className="py-3 px-3 text-center text-[#16423C]">{summary.attendance_rate}%</td>
                <td className="py-3 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Visual Bar Distribution */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
            <span>Distribusi Anggota per Rombel:</span>
            <span className="text-[11px] text-slate-400">Total: {summary.total_students} Siswa</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {rombel_stats.map(r => (
              <div key={r.id} className="bg-[#F8F9FA] p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div className="text-[11px] font-bold text-slate-800">{r.name}</div>
                <div className="text-lg font-black text-[#16423C] my-0.5">{r.total_students}</div>
                <div className="text-[10px] text-slate-500">
                  {summary.total_students > 0 ? Math.round((r.total_students / summary.total_students) * 100) : 0}% siswa
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bagian C — Aktivitas Scan & Papan Reward Datang Paling Awal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Papan Penghargaan Siswa Datang Paling Awal (Monthly Early Birds) */}
        <div className="lg:col-span-6 bg-linear-to-br from-[#B89758]/10 via-amber-50/40 to-white rounded-2xl p-5 border border-[#B89758]/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#B89758] text-white rounded-xl shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Siswa Datang Paling Awal (Kandidat Reward)
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Siswa terajin bulan ini yang konsisten hadir sebelum pukul 07.00 WIB
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#B89758]/20 text-[#8C6D37]">
                Reward Bulanan
              </span>
            </div>

            <div className="space-y-2 mt-3">
              {early_birds && early_birds.length > 0 ? (
                early_birds.map((eb, idx) => (
                  <div
                    key={eb.id}
                    className="p-3 bg-white/90 backdrop-blur rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? 'bg-[#B89758] text-white shadow-xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{eb.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {eb.class_name} • NISN: {eb.nisn}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-[#16423C]">
                        {eb.fastest_time} WIB
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {eb.early_count}x Hadir Pagi
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-white/60 rounded-xl">
                  Belum ada data kedatangan bulan ini.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#16423C]/5 border border-[#16423C]/15 text-[11px] text-[#16423C] font-medium">
            💡 Penghargaan bulanan diberikan kepada siswa terdisiplin oleh Kepala Sekolah SDN Pengampon 3.
          </div>
        </div>

        {/* Live Feed Aktivitas Scan Terbaru Hari Ini */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B89758] uppercase">
                <span className="inline-block w-3 h-0.5 bg-[#B89758]"></span>
                <span>AKTIVITAS GERBANG</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-[#16423C]" />
                <span>Aktivitas Scan Terbaru Hari Ini</span>
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#16423C] bg-[#16423C]/10 px-2.5 py-1 rounded-full">
              {recent_scans ? recent_scans.length : 0} Terakhir
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {recent_scans && recent_scans.length > 0 ? (
              recent_scans.map(scan => (
                <div
                  key={scan.id}
                  className="p-2.5 bg-[#F8F9FA] hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        scan.status === 'hadir' ? 'bg-[#16423C]' : 'bg-amber-500'
                      }`}
                    ></div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{scan.student_name}</div>
                      <div className="text-[10px] text-slate-500">
                        {scan.class_name} • NISN: {scan.nisn}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        scan.status === 'hadir'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {scan.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                    </span>
                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      {scan.time} WIB
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada aktivitas scan pada tanggal ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detail Rombel */}
      {selectedRombelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Daftar Siswa {selectedRombelModal.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Wali Kelas: {selectedRombelModal.homeroom_teacher || '-'} • Total: {selectedRombelModal.total_students} Siswa
                </p>
              </div>
              <button
                onClick={() => setSelectedRombelModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grow overflow-y-auto py-3">
              {loadingRombelStudents ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Memuat data siswa...
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">NISN</th>
                      <th className="py-2 px-3">Nama Lengkap</th>
                      <th className="py-2 px-3">L/P</th>
                      <th className="py-2 px-3 text-center">Status Hari Ini</th>
                      <th className="py-2 px-3 text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rombelStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{s.nisn}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{s.name}</td>
                        <td className="py-2 px-3 text-slate-500">{s.gender}</td>
                        <td className="py-2 px-3 text-center">
                          {s.attendance_status ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.attendance_status === 'hadir'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : s.attendance_status === 'terlambat'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : s.attendance_status === 'sakit'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : s.attendance_status === 'izin'
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {s.attendance_status}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Belum Hadir</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 font-mono text-[11px]">
                          {s.attendance_time ? `${s.attendance_time}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRombelModal(null)}
                className="px-4 py-2 bg-[#16423C] text-white rounded-xl text-xs font-bold hover:bg-[#1B4D3E] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DRILL-DOWN STATISTIK UTAMA (Saat Kartu Bagian A Diklik) */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${statusModal.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                    {statusModal.statusType.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Tanggal: {selectedDate}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {statusModal.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {statusModal.subtitle} • Total: <strong className="text-slate-900 font-bold">{statusStudents.length} siswa</strong>
                </p>
              </div>

              <button
                onClick={() => setStatusModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar Dalam Modal */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 -mx-6 px-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Filter Rombel:</span>
                <select
                  value={statusFilterClass}
                  onChange={(e) => setStatusFilterClass(e.target.value)}
                  className="bg-white text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-[#16423C]"
                >
                  <option value="">Semua Rombel (7 Kelas)</option>
                  {['Kelas 1', 'Kelas 2A', 'Kelas 2B', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value)}
                  placeholder="Cari nama / NISN..."
                  className="text-xs pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#16423C] w-48 sm:w-60"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Tabel Siswa */}
            <div className="overflow-y-auto flex-1 my-3 pr-1">
              {loadingStatusStudents ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#16423C] mb-2" />
                  <span>Memuat daftar siswa...</span>
                </div>
              ) : statusStudents.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Tidak ada data siswa untuk status ini pada tanggal {selectedDate}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Rombel</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Waktu Presensi</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statusStudents
                      .filter(s => !statusFilterClass || s.class_name === statusFilterClass)
                      .filter(s => !statusSearch || s.name.toLowerCase().includes(statusSearch.toLowerCase()) || s.nisn.includes(statusSearch))
                      .map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                              {s.class_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{s.nisn}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 text-center">
                            {s.attendance_status ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  s.attendance_status === 'hadir'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : s.attendance_status === 'terlambat'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : s.attendance_status === 'sakit'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : s.attendance_status === 'izin'
                                    ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {s.attendance_status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {s.attendance_time || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={s.notes || '-'}>
                            {s.notes || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                SDN Pengampon 3 Kota Cirebon
              </span>
              <button
                onClick={() => setStatusModal(null)}
                className="px-5 py-2 bg-[#16423C] hover:bg-[#1B4D3E] text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
