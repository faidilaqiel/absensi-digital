import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  School,
  Database,
  Download,
  Save,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  PlusCircle,
  Check,
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function SettingsPage({ onAcademicYearCreated }) {
  const [settings, setSettings] = useState({
    school_name: 'SDN Pengampon 3 Kota Cirebon',
    school_address: 'Jl. Pengampon No. 3, Lemahwungkuk, Kota Cirebon, Jawa Barat',
    school_npsn: '20222123',
    school_email: 'sdnpengampon3cirebon@gmail.com',
    school_phone: '(0231) 203894',
    school_headmaster: 'NONI RISANTO, M.Pd.I',
    check_in_start: '06:00',
    check_in_ontime_limit: '07:00',
    check_in_end: '11:00',
    active_academic_year: '2025/2026'
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [newAYName, setNewAYName] = useState('');
  const [copyClasses, setCopyClasses] = useState(true);
  const [creatingAY, setCreatingAY] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAcademicYears();
  }, []);

  const loadAcademicYears = async () => {
    try {
      const res = await apiRequest('/classes/academic-years');
      setAcademicYears(res.years || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    if (!newAYName.trim()) {
      alert('Masukkan nama tahun ajaran baru (contoh: 2026/2027 atau 2027/2028).');
      return;
    }

    if (!window.confirm(`Yakin ingin membuat dan mengaktifkan Tahun Ajaran Baru "${newAYName.trim()}"?\n\nDashboard kehadiran harian akan kembali bersih dari angka 0 untuk memulai tahun ajaran baru.`)) {
      return;
    }

    try {
      setCreatingAY(true);
      const res = await apiRequest('/classes/academic-years', {
        method: 'POST',
        body: JSON.stringify({
          name: newAYName.trim(),
          copy_classes: copyClasses,
          set_active: true
        })
      });

      alert(res.message);
      setNewAYName('');
      loadAcademicYears();
      loadSettings();
      if (onAcademicYearCreated) onAcademicYearCreated();
    } catch (err) {
      alert('Gagal membuat tahun ajaran: ' + err.message);
    } finally {
      setCreatingAY(false);
    }
  };

  const handleActivateAcademicYear = async (ay) => {
    if (ay.is_active) return;
    if (!window.confirm(`Aktifkan "${ay.name}" sebagai Tahun Ajaran aktif saat ini?`)) return;

    try {
      await apiRequest(`/classes/academic-years/${ay.id}/activate`, {
        method: 'PUT'
      });
      alert(`Tahun ajaran aktif diubah ke ${ay.name}`);
      loadAcademicYears();
      loadSettings();
      if (onAcademicYearCreated) onAcademicYearCreated();
    } catch (err) {
      alert(err.message);
    }
  };

  const [promoting, setPromoting] = useState(false);

  const handlePromoteClasses = async () => {
    if (!window.confirm("PERINGATAN: Jalankan Proses Kenaikan Kelas Massal?\n\n- Siswa Kelas 6 akan otomatis berstatus 'Lulus'.\n- Siswa Kelas 5 naik ke Kelas 6, Kelas 4 ke 5, Kelas 3 ke 4, Kelas 2 ke 3, dan Kelas 1 ke Kelas 2.\n\nData historis lama tetap tersimpan aman. Lanjutkan?")) {
      return;
    }

    try {
      setPromoting(true);
      const res = await apiRequest('/classes/promote-classes', {
        method: 'POST',
        body: JSON.stringify({})
      });
      alert(res.message);
      loadAcademicYears();
      if (onAcademicYearCreated) onAcademicYearCreated();
    } catch (err) {
      alert('Gagal memproses kenaikan kelas: ' + err.message);
    } finally {
      setPromoting(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/settings');
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSaving(true);
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSavedSuccess(true);
      alert('Pengaturan sekolah berhasil disimpan!');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/settings/backup-db', '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <span>Pengaturan Sistem & Konfigurasi Sekolah</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur jam masuk, batas keterlambatan, identitas sekolah SDN Pengampon 3, dan backup database
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Tersimpan!</span>
          </div>
        )}
      </div>

      {/* Panel Buat Tahun Ajaran Baru */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Tahun Ajaran & Periode Akademik
              </h2>
              <p className="text-[11px] text-slate-500">
                Buat tahun ajaran baru (misal: 2026/2027 atau 2027/2028). Dashboard akan bersih dari angka 0 dan petugas mulai scan dari awal.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#16423C]/10 text-[#16423C] border border-[#16423C]/20">
            Tahun Ajaran Aktif: {settings.active_academic_year}
          </span>
        </div>

        {/* Form Tambah Tahun Ajaran */}
        <form onSubmit={handleCreateAcademicYear} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5">
          <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-[#16423C]" />
            <span>Form Buat Tahun Ajaran Baru</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Nama Tahun Ajaran Baru:
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 2026/2027 atau 2027/2028"
                value={newAYName}
                onChange={(e) => setNewAYName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#16423C]"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={creatingAY}
                className="w-full py-2 px-4 bg-[#16423C] hover:bg-[#1B4D3E] text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-[#C5A880]" />
                <span>{creatingAY ? 'Memproses...' : 'Buat & Aktifkan'}</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600">
            <input
              type="checkbox"
              id="copyClasses"
              checked={copyClasses}
              onChange={(e) => setCopyClasses(e.target.checked)}
              className="rounded text-[#16423C] focus:ring-[#16423C] cursor-pointer"
            />
            <label htmlFor="copyClasses" className="cursor-pointer">
              Otomatis salin struktur 7 rombel kelas (Kelas 1 s/d Kelas 6) dari tahun ajaran sebelumnya
            </label>
          </div>
        </form>

        {/* Fitur Kenaikan Kelas Massal */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          {(() => {
            const currentActiveAY = academicYears.find(ay => ay.is_active === 1) || { name: settings.active_academic_year, is_promoted: 0 };
            const isAlreadyPromoted = currentActiveAY.is_promoted === 1 || currentActiveAY.is_promoted === true;

            if (isAlreadyPromoted) {
              return (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-900">Kenaikan Kelas Telah Selesai</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Kenaikan kelas untuk tahun ajaran {currentActiveAY.name} sudah selesai diproses.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs text-blue-900">Proses Kenaikan Kelas Massal (Otomatis)</h4>
                  </div>
                  <p className="text-[11px] text-blue-700/80 mt-0.5 max-w-xl">
                    Otomatis menaikkan kelas siswa (Kelas 1 s/d 5 naik ke tingkat berikutnya) dan menetapkan siswa Kelas 6 menjadi status <strong>'Lulus'</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePromoteClasses}
                  disabled={promoting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{promoting ? 'Memproses...' : 'Proses Naik Kelas'}</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Aturan Jam Masuk & Batas Keterlambatan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Aturan Absensi Pagi & Penentuan Keterlambatan
            </h2>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Standar Operasional SDN Pengampon 3:</span>
            </div>
            <div>• Kedatangan <strong>sebelum atau tepat pukul 07.00</strong> (06.00 – 07.00) = <strong>Hadir</strong></div>
            <div>• Kedatangan <strong>setelah pukul 07.00</strong> (07.01 dan seterusnya) = <strong>Terlambat</strong></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jam Buka Scan Pagi (WIB):
              </label>
              <input
                type="time"
                required
                value={settings.check_in_start}
                onChange={(e) => setSettings({ ...settings, check_in_start: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Mulai scan gerbang sekolah</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Batas Jam Tepat Waktu (WIB):
              </label>
              <input
                type="time"
                required
                value={settings.check_in_ontime_limit}
                onChange={(e) => setSettings({ ...settings, check_in_ontime_limit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-400 bg-blue-50/50 font-mono font-black text-blue-700"
              />
              <span className="text-[10px] text-blue-600 font-semibold mt-1 block">&gt; Jam ini otomatis TERLAMBAT</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Batas Akhir Scan (WIB):
              </label>
              <input
                type="time"
                required
                value={settings.check_in_end}
                onChange={(e) => setSettings({ ...settings, check_in_end: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Penutupan gerbang / sesi pagi</span>
            </div>
          </div>
        </div>

        {/* Profil Sekolah */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <School className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Identitas Sekolah SDN Pengampon 3
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Resmi Sekolah:</label>
              <input
                type="text"
                required
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">NPSN Sekolah:</label>
              <input
                type="text"
                value={settings.school_npsn}
                onChange={(e) => setSettings({ ...settings, school_npsn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Alamat Sekolah:</label>
              <input
                type="text"
                value={settings.school_address}
                onChange={(e) => setSettings({ ...settings, school_address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kepala Sekolah:</label>
              <input
                type="text"
                value={settings.school_headmaster}
                onChange={(e) => setSettings({ ...settings, school_headmaster: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Sekolah:</label>
              <input
                type="email"
                value={settings.school_email}
                onChange={(e) => setSettings({ ...settings, school_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#16423C] hover:bg-[#1B4D3E] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 text-[#C5A880] ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* Backup Database Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
          <Database className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-black text-slate-900 tracking-tight">
            Pencadangan (Backup) Database SQLite
          </h2>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          Unduh salinan berkas database absensi digital (.db) secara langsung untuk pengarsipan berkala atau pemindahan ke server baru.
        </p>

        <button
          onClick={handleDownloadBackup}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download File Database (attendance.db)</span>
        </button>
      </div>
    </div>
  );
}

