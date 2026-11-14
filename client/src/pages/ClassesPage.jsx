import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function ClassesPage({ userRole, selectedAY: propSelectedAY }) {
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [localAY, setLocalAY] = useState('');
  const [loading, setLoading] = useState(true);

  const activeAY = propSelectedAY || localAY;

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    academic_year_id: '',
    homeroom_teacher: ''
  });

  // Modal Detail Siswa per Rombel
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadClasses();
  }, [activeAY]);

  const loadAcademicYears = async () => {
    try {
      const res = await apiRequest('/classes/academic-years');
      setAcademicYears(res.years || []);
      const active = res.years?.find(y => y.is_active === 1);
      if (active) {
        if (!propSelectedAY) setLocalAY(active.id);
        setFormData(prev => ({ ...prev, academic_year_id: active.id }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      let url = '/classes';
      if (activeAY) url += `?academic_year_id=${activeAY}`;
      const res = await apiRequest(url);
      setClasses(res.classes || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      level: 1,
      academic_year_id: selectedAY || (academicYears[0] ? academicYears[0].id : ''),
      homeroom_teacher: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingClass(c);
    setFormData({
      name: c.name,
      level: c.level,
      academic_year_id: c.academic_year_id,
      homeroom_teacher: c.homeroom_teacher || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await apiRequest(`/classes/${editingClass.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        alert('Rombel berhasil diperbarui.');
      } else {
        await apiRequest('/classes', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        alert('Rombongan belajar berhasil ditambahkan.');
      }
      setShowModal(false);
      loadClasses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Yakin ingin menghapus ${c.name}?`)) return;
    try {
      const res = await apiRequest(`/classes/${c.id}`, { method: 'DELETE' });
      alert(res.message);
      loadClasses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenClassDetail = async (c) => {
    setSelectedClassDetail(c);
    setStudentSearch('');
    setLoadingClassStudents(true);
    try {
      const res = await apiRequest(`/students?class_id=${c.id}&status=active`);
      setClassStudents(res.students || []);
    } catch (err) {
      alert('Gagal memuat siswa: ' + err.message);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const totalSchoolStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Struktur Rombongan Belajar (Rombel)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan 7 Rombel Aktif SDN Pengampon 3: Kelas 1, Kelas 2A, Kelas 2B, Kelas 3, Kelas 4, Kelas 5, Kelas 6
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={activeAY}
              onChange={(e) => setLocalAY(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>
                  TA: {ay.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rombel</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of 7 Rombel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map(c => (
          <div
            key={c.id}
            onClick={() => handleOpenClassDetail(c)}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#16423C] hover:shadow-md transition cursor-pointer group"
            title={`Klik untuk melihat daftar seluruh siswa di ${c.name}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-[#16423C]/10 group-hover:text-[#16423C] group-hover:border-[#16423C]/20 transition">
                  Tingkat {c.level}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  ID: #{c.id}
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-[#16423C] transition flex items-center justify-between">
                <span>{c.name}</span>
                <span className="text-xs text-slate-400 font-semibold group-hover:text-[#16423C] group-hover:translate-x-0.5 transition">
                  Lihat Siswa →
                </span>
              </h2>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 group-hover:bg-slate-50/80 transition">
                <div>
                  <span className="text-slate-400 font-medium">Wali Kelas:</span>
                  <div className="font-bold text-slate-800">{c.homeroom_teacher || 'Belum ditentukan'}</div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Jumlah Anggota:</span>
                  <span className="font-black text-[#16423C] text-sm">{c.student_count || 0} Siswa</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div
                className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-1.5"
                onClick={(e) => e.stopPropagation()} // Supaya tombol edit/hapus tidak memicu modal detail
              >
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
            7
          </div>
          <div>
            <div className="font-bold text-slate-900">Total Rombongan Belajar: 7 Rombel Aktif</div>
            <div className="text-slate-500">Struktur awal tahun ajaran SDN Pengampon 3 Kota Cirebon</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-black text-blue-700">{totalSchoolStudents} Siswa</div>
          <div className="text-slate-500 font-semibold">Total Seluruh Siswa Terdaftar</div>
        </div>
      </div>

      {/* Modal Add/Edit Rombel */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4">
              {editingClass ? 'Edit Rombongan Belajar' : 'Tambah Rombel Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Rombel / Kelas:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kelas 1, Kelas 2A, Kelas 2B..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tingkat Kelas (1 - 6):</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  required
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wali Kelas:</label>
                <input
                  type="text"
                  value={formData.homeroom_teacher}
                  onChange={(e) => setFormData({ ...formData, homeroom_teacher: e.target.value })}
                  placeholder="Nama lengkap wali kelas beserta gelar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POP-UP DETAIL SISWA DALAM KELAS */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#16423C]/10 text-[#16423C] border border-[#16423C]/20">
                    Tingkat {selectedClassDetail.level}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Wali Kelas: <strong className="text-slate-800">{selectedClassDetail.homeroom_teacher || '-'}</strong>
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Daftar Siswa {selectedClassDetail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Anggota: <strong className="text-[#16423C] font-bold">{classStudents.length} Siswa Terdaftar</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedClassDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Bar dalam Modal */}
            <div className="py-3 border-b border-slate-100 bg-slate-50/50 -mx-6 px-6 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Pencarian Siswa di {selectedClassDetail.name}:
              </span>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Cari nama / NISN..."
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#16423C] w-56"
              />
            </div>

            {/* Tabel Daftar Siswa */}
            <div className="overflow-y-auto flex-1 my-3 pr-1">
              {loadingClassStudents ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  Memuat daftar siswa...
                </div>
              ) : classStudents.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  Belum ada siswa terdaftar di {selectedClassDetail.name}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">NIPD / NIS</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3 text-center">L/P</th>
                      <th className="py-2.5 px-3 text-right">No. HP Orang Tua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents
                      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.nisn.includes(studentSearch))
                      .map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{s.nisn}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{s.nis || '-'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${s.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                              {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-600">
                            {s.parent_phone || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClassDetail(null)}
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

