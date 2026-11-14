import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function StudentsPage({ userRole, selectedAY }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nisn: '',
    nis: '',
    name: '',
    gender: 'L',
    class_id: '',
    parent_phone: ''
  });

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadClasses();
  }, [selectedAY]);

  useEffect(() => {
    loadStudents();
  }, [selectedClass, statusFilter, selectedAY]);

  const loadClasses = async () => {
    try {
      let url = '/classes';
      if (selectedAY) url += `?academic_year_id=${selectedAY}`;
      const res = await apiRequest(url);
      setClasses(res.classes || []);
      if (res.classes && res.classes.length > 0 && !formData.class_id) {
        setFormData(prev => ({ ...prev, class_id: res.classes[0].id }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      let url = `/students?status=${statusFilter}`;
      if (selectedClass) url += `&class_id=${selectedClass}`;
      if (selectedAY) url += `&academic_year_id=${selectedAY}`;
      const res = await apiRequest(url);
      setStudents(res.students || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nisn: '',
      nis: '',
      name: '',
      gender: 'L',
      class_id: classes[0] ? classes[0].id : '',
      parent_phone: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStudent(s);
    setFormData({
      nisn: s.nisn,
      nis: s.nis || '',
      name: s.name,
      gender: s.gender,
      class_id: s.class_id,
      parent_phone: s.parent_phone || ''
    });
    setShowAddModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await apiRequest(`/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        alert('Data siswa berhasil diperbarui.');
      } else {
        await apiRequest('/students', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        alert('Siswa berhasil ditambahkan.');
      }
      setShowAddModal(false);
      loadStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Yakin ingin menghapus siswa ${student.name}?`)) return;
    try {
      const res = await apiRequest(`/students/${student.id}`, { method: 'DELETE' });
      alert(res.message);
      loadStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredStudents.map((s, idx) => ({
      No: idx + 1,
      NISN: s.nisn,
      NIS: s.nis || '-',
      'Nama Siswa': s.name,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      Rombel: s.class_name,
      'No HP Orang Tua': s.parent_phone || '-',
      Status: s.status === 'active' ? 'Aktif' : 'Nonaktif',
      'QR Code': s.qr_code
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, `Data_Siswa_SDN_Pengampon_3_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle File Upload for Import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Normalize keys
        const formatted = data.map(item => ({
          nisn: item['NISN'] || item['nisn'],
          nis: item['NIS'] || item['nis'],
          name: item['Nama Siswa'] || item['Nama'] || item['name'],
          gender: item['Jenis Kelamin'] || item['gender'] || 'L',
          class_name: item['Rombel'] || item['Kelas'] || item['class_name'],
          parent_phone: item['No HP Orang Tua'] || item['HP'] || item['parent_phone']
        })).filter(x => x.nisn && x.name);

        setImportData(formatted);
      } catch (err) {
        alert('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessImport = async () => {
    if (importData.length === 0) return;
    try {
      const res = await apiRequest('/students/import', {
        method: 'POST',
        body: JSON.stringify({ students: importData })
      });
      alert(res.message);
      setShowImportModal(false);
      setImportData([]);
      loadStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn.includes(search) ||
    s.class_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen Data Siswa SDN Pengampon 3</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data siswa, penempatan rombel (7 kelas), QR code, dan impor/ekspor data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Impor Excel</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Class */}
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

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa atau NISN..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Table Data Siswa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3.5">No</th>
                <th className="py-3 px-3.5">NISN / NIS</th>
                <th className="py-3 px-3.5">Nama Siswa</th>
                <th className="py-3 px-3.5">L/P</th>
                <th className="py-3 px-3.5">Rombel</th>
                <th className="py-3 px-3.5">Kode Barcode (QR)</th>
                <th className="py-3 px-3.5">No HP Ortu</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                {isAdmin && <th className="py-3 px-3.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">
                      <div className="font-bold text-slate-900">{s.nisn}</div>
                      {s.nis && <div className="text-[10px] text-slate-400">NIS: {s.nis}</div>}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-800">{s.name}</td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                        s.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {s.gender === 'L' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-blue-700">{s.class_name}</td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {s.qr_code}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      {s.parent_phone ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{s.parent_phone}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit data siswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus / Nonaktifkan"
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NISN (10 Digit Wajib):</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="Contoh: 0142123401"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIS Sekolah (Opsional):</label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Contoh: 2301"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama sesuai akta kelahiran / ijazah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rombel / Kelas:</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No HP Orang Tua / Wali:</label>
                <input
                  type="text"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Impor Data Siswa Massal (Excel / CSV)</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-800">
                Format kolom yang didukung: <strong>NISN, NIS, Nama Siswa, Jenis Kelamin, Rombel, No HP Orang Tua</strong>.
              </div>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="w-full p-2 border border-slate-300 rounded-xl"
              />

              {importData.length > 0 && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  ✓ Siap mengimpor <strong>{importData.length}</strong> siswa. Barcode QR Code akan dibuat secara otomatis untuk setiap siswa.
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => { setShowImportModal(false); setImportData([]); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImport}
                  disabled={importData.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  Mulai Impor Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

