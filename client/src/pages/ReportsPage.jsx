import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  Award,
  Calendar,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Trophy,
  Medal,
  Clock,
  Sparkles,
  ChevronRight,
  UserCheck,
  Search
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function ReportsPage({ userRole, selectedAY }) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const [activeReportTab, setActiveReportTab] = useState('student_monthly'); // 'student_monthly', 'recap', or 'reward'
  const [selectedMonth, setSelectedMonth] = useState(todayStr.substring(0, 7));
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Data
  const [rewardData, setRewardData] = useState([]);
  const [recapData, setRecapData] = useState([]);
  const [studentMonthlyData, setStudentMonthlyData] = useState([]);

  useEffect(() => {
    loadClasses();
  }, [selectedAY]);

  useEffect(() => {
    if (activeReportTab === 'student_monthly') {
      loadStudentMonthlyReport();
    } else if (activeReportTab === 'reward') {
      loadRewardReport();
    } else {
      loadRecapReport();
    }
  }, [activeReportTab, selectedMonth, startDate, endDate, selectedClass, searchStudent, selectedAY]);

  const loadClasses = async () => {
    try {
      let url = '/classes';
      if (selectedAY) url += `?academic_year_id=${selectedAY}`;
      const res = await apiRequest(url);
      setClasses(res.classes || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadStudentMonthlyReport = async () => {
    try {
      setLoading(true);
      let url = `/reports/monthly-students?month=${selectedMonth}`;
      if (selectedClass) url += `&class_id=${selectedClass}`;
      if (searchStudent) url += `&search=${encodeURIComponent(searchStudent)}`;
      const res = await apiRequest(url);
      setStudentMonthlyData(res.students || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRewardReport = async () => {
    try {
      setLoading(true);
      let url = `/reports/monthly-reward?month=${selectedMonth}`;
      if (selectedClass) url += `&class_id=${selectedClass}`;
      const res = await apiRequest(url);
      setRewardData(res.candidates || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecapReport = async () => {
    try {
      setLoading(true);
      let url = `/reports/recap?start_date=${startDate}&end_date=${endDate}`;
      if (selectedClass) url += `&class_id=${selectedClass}`;
      const res = await apiRequest(url);
      setRecapData(res.recap || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export Student Monthly to Excel
  const handleExportStudentMonthlyExcel = () => {
    const rows = studentMonthlyData.map((s, idx) => ({
      No: idx + 1,
      Rombel: s.class_name,
      NISN: s.nisn,
      'Nama Siswa': s.name,
      'L/P': s.gender || '-',
      'Hadir Tepat Waktu (H)': s.hadir,
      'Terlambat (T)': s.terlambat,
      'Sakit (S)': s.sakit,
      'Izin (I)': s.izin,
      'Alpa (A)': s.alpa,
      'Total Kehadiran': s.total_kehadiran,
      'Persentase Kehadiran': `${s.persentase}%`
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Siswa Bulanan');
    XLSX.writeFile(wb, `Rekap_Absensi_Siswa_SDNP3_${selectedMonth}.xlsx`);
  };

  // Export Reward to Excel
  const handleExportRewardExcel = () => {
    const rows = rewardData.map(c => ({
      Peringkat: c.rank,
      'Nama Siswa': c.student_name,
      NISN: c.nisn,
      Rombel: c.class_name,
      'Wali Kelas': c.homeroom_teacher || '-',
      'Jumlah Hadir Tepat Waktu (Hari)': c.ontime_days,
      'Jam Tercepat': c.earliest_time,
      'Rata-rata Jam Kedatangan': c.avg_arrival_time,
      'Gelar / Penghargaan': c.reward_badge
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reward Kedisiplinan');
    XLSX.writeFile(wb, `Reward_Siswa_Terajin_SDNP3_${selectedMonth}.xlsx`);
  };

  // Export Recap to Excel
  const handleExportRecapExcel = () => {
    const rows = recapData.map(r => ({
      Rombel: r.class_name,
      'Wali Kelas': r.homeroom_teacher || '-',
      'Total Siswa': r.total_students,
      'Hadir Tepat Waktu': r.hadir,
      Terlambat: r.terlambat,
      Sakit: r.sakit,
      Izin: r.izin,
      Alpa: r.alpa,
      'Total Kehadiran': r.total_attended,
      'Persentase Kehadiran': `${r.percentage}%`
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran Rombel');
    XLSX.writeFile(wb, `Rekap_Kehadiran_SDNP3_${startDate}_sd_${endDate}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: activeReportTab === 'student_monthly' ? 'landscape' : 'portrait' });
    doc.setFontSize(14);
    doc.text('SDN PENGAMPON 3 KOTA CIREBON', 14, 15);
    doc.setFontSize(10);

    if (activeReportTab === 'student_monthly') {
      doc.text(`Rekapitulasi Kehadiran Siswa Per Bulan - Periode: ${selectedMonth}`, 14, 22);
      const tableData = studentMonthlyData.map((s, idx) => [
        idx + 1,
        s.class_name,
        s.nisn,
        s.name,
        s.gender || '-',
        s.hadir,
        s.terlambat,
        s.sakit,
        s.izin,
        s.alpa,
        s.total_kehadiran,
        `${s.persentase}%`
      ]);

      doc.autoTable({
        head: [['No', 'Rombel', 'NISN', 'Nama Siswa', 'L/P', 'Hadir', 'Tlt', 'Skt', 'Izn', 'Alp', 'Total', '%']],
        body: tableData,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [22, 66, 60] },
        styles: { fontSize: 8 }
      });
      doc.save(`Laporan_Rekap_Siswa_Bulanan_SDNP3_${selectedMonth}.pdf`);
    } else if (activeReportTab === 'reward') {
      doc.text(`Papan Reward Kedisiplinan Siswa - Periode: ${selectedMonth}`, 14, 22);
      const tableData = rewardData.map(c => [
        c.rank,
        c.student_name,
        c.nisn,
        c.class_name,
        `${c.ontime_days} hari`,
        c.earliest_time,
        c.reward_badge
      ]);

      doc.autoTable({
        head: [['Rank', 'Nama Siswa', 'NISN', 'Rombel', 'Hadir Pagi', 'Paling Awal', 'Kategori Reward']],
        body: tableData,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [184, 151, 88] }
      });
      doc.save(`Laporan_Reward_Siswa_SDNP3_${selectedMonth}.pdf`);
    } else {
      doc.text(`Rekapitulasi Kehadiran Per Rombel - Periode: ${startDate} s/d ${endDate}`, 14, 22);
      const tableData = recapData.map(r => [
        r.class_name,
        r.homeroom_teacher || '-',
        r.total_students,
        r.hadir,
        r.terlambat,
        r.sakit,
        r.izin,
        r.alpa,
        `${r.percentage}%`
      ]);

      doc.autoTable({
        head: [['Rombel', 'Wali Kelas', 'Siswa', 'Hadir', 'Tlt', 'Skt', 'Izn', 'Alp', '%']],
        body: tableData,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [22, 66, 60] }
      });
      doc.save(`Laporan_Rekap_Kehadiran_SDNP3_${startDate}_sd_${endDate}.pdf`);
    }
  };

  const handleExportExcelCurrent = () => {
    if (activeReportTab === 'student_monthly') {
      handleExportStudentMonthlyExcel();
    } else if (activeReportTab === 'reward') {
      handleExportRewardExcel();
    } else {
      handleExportRecapExcel();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Laporan & Papan Reward Kedisiplinan Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi kehadiran siswa bulanan, rekap rombel, & reward siswa datang paling awal SDN Pengampon 3
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcelCurrent}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Selection: 3 Pilihan */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('student_monthly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportTab === 'student_monthly'
              ? 'bg-[#16423C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Rekapan Absen Siswa Per Bulan</span>
        </button>

        <button
          onClick={() => setActiveReportTab('recap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportTab === 'recap'
              ? 'bg-[#16423C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Rekapitulasi Kehadiran Per Rombel</span>
        </button>

        <button
          onClick={() => setActiveReportTab('reward')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportTab === 'reward'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Reward Siswa Datang Paling Awal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {activeReportTab === 'student_monthly' || activeReportTab === 'reward' ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Pilih Bulan:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700"
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700"
            />
          </div>
        )}

        {/* Filter Rombel & Search Siswa */}
        <div className="flex flex-wrap items-center gap-2">
          {activeReportTab === 'student_monthly' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Nama / NISN Siswa..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700 w-48 sm:w-56"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Rombel (7 Kelas)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: REKAPAN ABSEN SISWA PER BULAN */}
      {activeReportTab === 'student_monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-black text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>Rekapitulasi Kehadiran Siswa Per Bulan:</span>
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                Bulan: {selectedMonth}
              </span>
            </div>
            <span className="text-slate-400 font-normal">
              Total Siswa Terdaftar: {studentMonthlyData.length} Anak
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-3.5">Rombel</th>
                  <th className="py-3 px-3.5">NISN</th>
                  <th className="py-3 px-3.5">Nama Siswa</th>
                  <th className="py-3 px-3 text-center">L/P</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Hadir (H)</th>
                  <th className="py-3 px-3 text-center text-amber-700">Terlambat (T)</th>
                  <th className="py-3 px-3 text-center text-blue-700">Sakit (S)</th>
                  <th className="py-3 px-3 text-center text-purple-700">Izin (I)</th>
                  <th className="py-3 px-3 text-center text-rose-700">Alpa (A)</th>
                  <th className="py-3 px-3 text-center font-black">Total Masuk</th>
                  <th className="py-3 px-3.5 text-center font-black">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Memuat rekapan absen siswa per bulan...
                    </td>
                  </tr>
                ) : studentMonthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa ditemukan untuk kriteria ini.
                    </td>
                  </tr>
                ) : (
                  studentMonthlyData.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]">
                          {s.class_name}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{s.nisn}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-600">{s.gender || '-'}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">
                        {s.hadir}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600 bg-amber-50/30">
                        {s.terlambat}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600 bg-blue-50/30">
                        {s.sakit}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-purple-600 bg-purple-50/30">
                        {s.izin}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30">
                        {s.alpa}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-800">
                        {s.total_kehadiran}
                      </td>
                      <td className="py-3 px-3.5 text-center font-black">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            s.persentase >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.persentase >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : s.persentase > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.persentase}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REKAPITULASI KEHADIRAN PER ROMBEL */}
      {activeReportTab === 'recap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-black text-xs text-slate-800 flex items-center justify-between">
            <span>Rekapitulasi Kehadiran 7 Rombel SDN Pengampon 3:</span>
            <span className="text-slate-400 font-normal">{startDate} s/d {endDate}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3.5">Rombel / Kelas</th>
                  <th className="py-3 px-3.5">Wali Kelas</th>
                  <th className="py-3 px-3.5 text-center">Total Siswa</th>
                  <th className="py-3 px-3.5 text-center text-emerald-700">Hadir</th>
                  <th className="py-3 px-3.5 text-center text-amber-700">Terlambat</th>
                  <th className="py-3 px-3.5 text-center text-rose-700">Sakit</th>
                  <th className="py-3 px-3.5 text-center text-cyan-700">Izin</th>
                  <th className="py-3 px-3.5 text-center text-slate-600">Alpa</th>
                  <th className="py-3 px-3.5 text-center">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Menghitung rekapitulasi rombel...
                    </td>
                  </tr>
                ) : (
                  recapData.map((r) => (
                    <tr key={r.class_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3.5 font-bold text-slate-900">{r.class_name}</td>
                      <td className="py-3 px-3.5 text-slate-600">{r.homeroom_teacher || '-'}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-800">{r.total_students} siswa</td>
                      <td className="py-3 px-3.5 text-center font-bold text-emerald-600">{r.hadir}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-amber-600">{r.terlambat}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-rose-600">{r.sakit}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-cyan-600">{r.izin}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-500">{r.alpa}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-extrabold text-blue-700">{r.percentage}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REWARD BULANAN */}
      {activeReportTab === 'reward' && (
        <div className="space-y-4">
          {/* Top 3 Podium Cards */}
          {rewardData.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* Rank 2 */}
              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex flex-col items-center text-center order-2 md:order-1 relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-lg mb-2 shadow-inner">
                  2
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mb-1">
                  Juara 2 (Perak)
                </span>
                <h3 className="font-black text-sm text-slate-900 mt-1">{rewardData[1].student_name}</h3>
                <div className="text-xs text-blue-700 font-bold">{rewardData[1].class_name}</div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  Kedatangan Tercepat: <span className="font-bold text-emerald-600">{rewardData[1].earliest_time} WIB</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {rewardData[1].ontime_days} hari hadir tepat waktu
                </div>
              </div>

              {/* Rank 1 - Center Gold */}
              <div className="bg-linear-to-b from-amber-50 to-amber-100/60 rounded-2xl p-6 border-2 border-amber-400 shadow-md flex flex-col items-center text-center order-1 md:order-2 scale-105 z-10 relative">
                <div className="w-16 h-16 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl mb-2 shadow-md ring-4 ring-amber-200">
                  👑
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-300 px-3 py-0.5 rounded-full mb-1">
                  Juara 1 (Emas) - Siswa Terajin
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">{rewardData[0].student_name}</h3>
                <div className="text-xs text-blue-800 font-extrabold">{rewardData[0].class_name}</div>
                <div className="text-xs text-slate-700 mt-2 font-mono">
                  Kedatangan Tercepat: <span className="font-extrabold text-emerald-700">{rewardData[0].earliest_time} WIB</span>
                </div>
                <div className="mt-1 text-xs text-amber-900 font-bold">
                  {rewardData[0].ontime_days} hari hadir tepat waktu
                </div>
              </div>

              {/* Rank 3 */}
              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex flex-col items-center text-center order-3 relative">
                <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-lg mb-2 shadow-inner">
                  3
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                  Juara 3 (Perunggu)
                </span>
                <h3 className="font-black text-sm text-slate-900 mt-1">{rewardData[2].student_name}</h3>
                <div className="text-xs text-blue-700 font-bold">{rewardData[2].class_name}</div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  Kedatangan Tercepat: <span className="font-bold text-emerald-600">{rewardData[2].earliest_time} WIB</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {rewardData[2].ontime_days} hari hadir tepat waktu
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-black text-xs text-slate-800 flex items-center justify-between">
              <span>Daftar Peringkat Siswa Datang Paling Awal Bulan Ini:</span>
              <span className="text-slate-400 font-normal">Batas Jam Masuk: 07.00 WIB</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3.5 text-center">Peringkat</th>
                    <th className="py-3 px-3.5">Nama Siswa</th>
                    <th className="py-3 px-3.5">NISN</th>
                    <th className="py-3 px-3.5">Rombel</th>
                    <th className="py-3 px-3.5 text-center">Hadir Tepat Waktu</th>
                    <th className="py-3 px-3.5 text-center">Jam Paling Awal</th>
                    <th className="py-3 px-3.5 text-center">Rata-rata Datang</th>
                    <th className="py-3 px-3.5 text-right">Kategori Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Menghitung rekor kehadiran siswa...
                      </td>
                    </tr>
                  ) : rewardData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada data kehadiran di bulan {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    rewardData.map((c) => (
                      <tr key={c.student_id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-3.5 text-center font-black">
                          <span
                            className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs ${
                              c.rank === 1
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : c.rank === 2
                                ? 'bg-slate-300 text-slate-900 font-black'
                                : c.rank === 3
                                ? 'bg-amber-600 text-white font-black'
                                : 'text-slate-400'
                            }`}
                          >
                            #{c.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{c.student_name}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">{c.nisn}</td>
                        <td className="py-3 px-3.5 font-semibold text-blue-700">{c.class_name}</td>
                        <td className="py-3 px-3.5 text-center font-bold text-emerald-600">
                          {c.ontime_days} Hari
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-extrabold text-blue-700">
                          {c.earliest_time} WIB
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-slate-600">
                          {c.avg_arrival_time} WIB
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              c.rank === 1
                                ? 'bg-amber-400 text-amber-950'
                                : c.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : c.rank === 3
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.reward_badge}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
