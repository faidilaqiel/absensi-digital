import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Plus,
  HeartPulse,
  FileText,
  AlertOctagon,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Phone
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function PermitsPage({ userRole, selectedAY }) {
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [modalFilterClass, setModalFilterClass] = useState('');
  const [modalSearchStudent, setModalSearchStudent] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    date: getLocalDateString(),
    status: 'sakit',
    notes: ''
  });

  useEffect(() => {
    loadClasses();
    loadStudents();
  }, [selectedAY]);

  useEffect(() => {
    loadPermits();
  }, [selectedClass, selectedStatus, selectedAY]);

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

  const loadStudents = async () => {
    try {
      let url = '/students?status=active';
      if (selectedAY) url += `&academic_year_id=${selectedAY}`;
      const res = await apiRequest(url);
      setStudents(res.students || []);
      if (res.students && res.students.length > 0 && !formData.student_id) {
        setFormData(prev => ({ ...prev, student_id: res.students[0].id }));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadPermits = async () => {
    try {
      setLoading(true);
      let url = '/permits?';
      if (selectedClass) url += `&class_id=${selectedClass}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      const res = await apiRequest(url);
      setRecords(res.records || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermit = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    try {
      const res = await apiRequest('/permits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      alert(res.message);
      setShowModal(false);
      setFormData(prev => ({ ...prev, notes: '' }));
      loadPermits();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredRecords = records.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.nisn.includes(search)
  );

  const matchingStudents = students
    .filter(s => !modalFilterClass || s.class_id.toString() === modalFilterClass.toString())
    .filter(s => !modalSearchStudent || s.name.toLowerCase().includes(modalSearchStudent.toLowerCase()) || s.nisn.includes(modalSearchStudent));

  const selectedStudentObj = students.find(s => s.id.toString() === formData.student_id?.toString());

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-600" />
            <span>Pencatatan Izin, Sakit & Alpa Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data ketidakhadiran siswa SDN Pengampon 3 dengan surat keterangan / keterangan orang tua
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Izin / Sakit</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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
              <option value="">Semua Ketidakhadiran</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
        </div>

        {/* Search */}
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

      {/* Table Permits */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3.5">No</th>
                <th className="py-3 px-3.5">Tanggal</th>
                <th className="py-3 px-3.5">Nama Siswa</th>
                <th className="py-3 px-3.5">Rombel</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5">Keterangan / Alasan Ketidakhadiran</th>
                <th className="py-3 px-3.5">Pencatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data izin/sakit...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada siswa izin, sakit, atau alpa.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-800">{r.date}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{r.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NISN: {r.nisn}</div>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-blue-700">{r.class_name}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        r.status === 'sakit'
                          ? 'bg-rose-100 text-rose-700'
                          : r.status === 'izin'
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status === 'sakit' && <HeartPulse className="w-3 h-3" />}
                        {r.status === 'izin' && <FileText className="w-3 h-3" />}
                        {r.status === 'alpa' && <AlertOctagon className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">
                      {r.notes || '-'}
                    </td>
                    <td className="py-3 px-3.5 text-[11px] text-slate-500">
                      {r.recorded_by_name || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Izin / Sakit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4">
              Pencatatan Status Ketidakhadiran
            </h3>

            <form onSubmit={handleSavePermit} className="space-y-3 text-xs">
              {/* Section Pemilihan Siswa Ringkas dengan Filter Rombel & Ketik Nama */}
              <div className="space-y-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    Pilih Siswa:
                  </label>
                  {selectedStudentObj && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Terpilih: {selectedStudentObj.name}
                    </span>
                  )}
                </div>

                {/* Filter Rombel & Input Pencarian Nama Langsung */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <select
                      value={modalFilterClass}
                      onChange={(e) => {
                        setModalFilterClass(e.target.value);
                        // If current selected student is not in new class filter, reset
                        if (formData.student_id) {
                          const curr = students.find(s => s.id.toString() === formData.student_id.toString());
                          if (curr && e.target.value && curr.class_id.toString() !== e.target.value.toString()) {
                            setFormData(prev => ({ ...prev, student_id: '' }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 text-xs focus:outline-none focus:border-[#16423C]"
                    >
                      <option value="">Semua Rombel (7 Kelas)</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={modalSearchStudent}
                      onChange={(e) => setModalSearchStudent(e.target.value)}
                      placeholder="Ketik nama siswa..."
                      className="w-full pl-7 pr-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#16423C]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Daftar Siswa Pilihan Berdasarkan Filter & Ketikan Nama (Langsung klik tanpa dropdown bertumpuk) */}
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  {matchingStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Tidak ada siswa ditemukan
                    </div>
                  ) : (
                    matchingStudents.slice(0, 15).map(s => (
                      <div
                        key={s.id}
                        onClick={() => setFormData({ ...formData, student_id: s.id })}
                        className={`p-2 px-3 text-xs flex items-center justify-between cursor-pointer transition ${
                          formData.student_id.toString() === s.id.toString()
                            ? 'bg-emerald-50 text-[#16423C] font-bold border-l-4 border-l-[#16423C]'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600">
                          {s.class_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin</option>
                    <option value="alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Alasan:</label>
                <textarea
                  rows={3}
                  required
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Demam berdarah (Surat dokter terlampir) / Menghadiri pernikahan keluarga"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
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
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

