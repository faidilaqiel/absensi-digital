import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarCheck,
  Search,
  Filter,
  Calendar,
  Download,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  HeartPulse,
  FileText,
  AlertOctagon,
  RefreshCw,
  QrCode,
  ShieldCheck,
  WifiOff,
  UserPlus,
  X
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AttendanceHistoryPage({ userRole, selectedAY }) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit/Correction Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('hadir');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Reset / Delete All Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState('date'); // 'date' | 'all'
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const isAdminOrPetugas = ['admin', 'petugas', 'guru'].includes(userRole);

  useEffect(() => {
    loadClasses();
  }, [selectedAY]);

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedClass, selectedStatus, selectedAY]);

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

  const loadAttendance = async () => {
    try {
      setLoading(true);
      let url = `/attendance/history?date=${selectedDate}`;
      if (selectedClass) url += `&class_id=${selectedClass}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      if (selectedAY) url += `&academic_year_id=${selectedAY}`;
      const res = await apiRequest(url);
      setRecords(res.records || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditTime(rec.time);
    setEditNotes(rec.notes || '');
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/attendance/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: editStatus,
          time: editTime,
          notes: editNotes
        })
      });
      alert('Data absensi berhasil dikoreksi.');
      setEditingRecord(null);
      loadAttendance();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus catatan absensi ini?')) return;
    try {
      await apiRequest(`/attendance/${id}`, { method: 'DELETE' });
      loadAttendance();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetAttendance = async (e) => {
    e.preventDefault();
    if (resetMode === 'all' && resetConfirmText !== 'HAPUS SEMUA') {
      alert('Ketik "HAPUS SEMUA" untuk konfirmasi reset seluruh data!');
      return;
    }

    const confirmMsg = resetMode === 'date'
      ? `Apakah Anda yakin ingin menghapus seluruh data kehadiran pada tanggal ${selectedDate}?`
      : 'PERINGATAN TINGGI! Seluruh riwayat absensi siswa di semua tanggal akan dihapus permanen. Lanjutkan?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsResetting(true);
      const res = await apiRequest('/attendance/reset', {
        method: 'DELETE',
        body: JSON.stringify({
          mode: resetMode,
          date: selectedDate,
          academic_year_id: selectedAY
        })
      });
      alert(res.message || 'Data absensi berhasil direset!');
      setShowResetModal(false);
      setResetConfirmText('');
      loadAttendance();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredRecords.map((r, i) => ({
      No: i + 1,
      Tanggal: r.date,
      Waktu: `${r.time} WIB`,
      NISN: r.nisn,
      'Nama Siswa': r.student_name,
      Rombel: r.class_name,
      Status: r.status.toUpperCase(),
      Metode: (r.method === 'qr' || r.method === 'qr_scan') ? 'Scan QR Code' : 'Manual / Petugas',
      Catatan: r.notes || '-',
      'Dicatat Oleh': r.recorded_by_name || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Absensi_${selectedDate}`);
    XLSX.writeFile(wb, `Data_Kehadiran_SDNP3_${selectedDate}.xlsx`);
  };

  const filteredRecords = records.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.nisn.includes(search)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <span>Data & Riwayat Kehadiran Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau kehadiran harian siswa SDN Pengampon 3 Kota Cirebon
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={() => {
                setResetMode('date');
                setResetConfirmText('');
                setShowResetModal(true);
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua / Reset</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Rombel</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir Tepat Waktu</option>
              <option value="terlambat">Terlambat</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NISN..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3.5">No</th>
                <th className="py-3 px-3.5">Tanggal & Waktu</th>
                <th className="py-3 px-3.5">Nama Siswa</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Rombel</th>
                <th className="py-3 px-3.5 text-center">Status Kehadiran</th>
                <th className="py-3 px-3.5">Metode</th>
                <th className="py-3 px-3.5">Catatan / Keterangan</th>
                <th className="py-3 px-3.5">Pencatat</th>
                {isAdminOrPetugas && <th className="py-3 px-3.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdminOrPetugas ? 9 : 8} className="py-8 text-center text-slate-400">
                    Memuat catatan absensi...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrPetugas ? 9 : 8} className="py-8 text-center text-slate-400">
                    Tidak ada catatan kehadiran untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800">{r.date}</div>
                      <div className="text-[11px] font-mono text-slate-500">{r.time} WIB</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{r.student_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">NISN: {r.nisn}</div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="inline-block font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap">
                        {r.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'sakit'
                            ? 'bg-rose-100 text-rose-800'
                            : r.status === 'izin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status === 'hadir' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {r.status === 'terlambat' && <Clock className="w-3 h-3 text-amber-600" />}
                        {r.status === 'sakit' && <HeartPulse className="w-3 h-3 text-rose-600" />}
                        {r.status === 'izin' && <FileText className="w-3 h-3 text-purple-600" />}
                        {r.status === 'alpa' && <AlertOctagon className="w-3 h-3 text-slate-500" />}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                        {(r.method === 'qr' || r.method === 'qr_scan') ? (
                          <>
                            <QrCode className="w-3 h-3 text-blue-600" />
                            <span className="font-semibold text-blue-700">Scan QR Code</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Manual Guru/Admin</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={r.notes || '-'}>
                      {r.notes || '-'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      {r.recorded_by_name || '-'}
                    </td>
                    {isAdminOrPetugas && (
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Koreksi Kehadiran"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Hapus Absensi"
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4">
              Koreksi Data Absensi
            </h3>

            <div className="mb-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">{editingRecord.student_name}</div>
              <div className="text-slate-500">{editingRecord.class_name} • {editingRecord.date}</div>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Kehadiran:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="hadir">Hadir (Tepat Waktu)</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                  <option value="alpa">Alpa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Waktu Kedatangan (HH:MM:SS):</label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Koreksi / Keterangan:</label>
                <input
                  type="text"
                  required
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Misal: Salah deteksi, siswa telah membawa surat dokter"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Reset / Hapus Semua */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-slate-900 text-base">Hapus / Reset Data Kehadiran</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetAttendance} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">Pilih Jangkauan Hapus:</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    resetMode === 'date' ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-400' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resetMode"
                      value="date"
                      checked={resetMode === 'date'}
                      onChange={() => setResetMode('date')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Hanya Tanggal Terpilih</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Menghapus seluruh absensi pada tanggal <span className="font-bold text-rose-700">{selectedDate}</span>.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    resetMode === 'all' ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-400' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resetMode"
                      value="all"
                      checked={resetMode === 'all'}
                      onChange={() => setResetMode('all')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-rose-700">Reset Seluruh Data Kehadiran (Semua Tanggal)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Menghapus semua rekam jejak absensi siswa dari awal hingga saat ini.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {resetMode === 'all' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                    Ketik kata <span className="font-black text-rose-700 underline">HAPUS SEMUA</span> di bawah ini untuk mengonfirmasi tindakan ini:
                  </div>
                  <input
                    type="text"
                    required
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="HAPUS SEMUA"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-bold text-rose-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetting || (resetMode === 'all' && resetConfirmText !== 'HAPUS SEMUA')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Menghapus...' : 'Ya, Hapus Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
