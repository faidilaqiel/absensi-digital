import React, { useState, useEffect } from 'react';
import {
  UserCog,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Phone,
  Key,
  GraduationCap
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function UsersPage({ onCurrentUserUpdate }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'petugas',
    assigned_class_id: '',
    phone: ''
  });

  useEffect(() => {
    loadUsers();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await apiRequest('/classes');
      setClasses(res.classes || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/users');
      setUsers(res.users || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'admin',
      assigned_class_id: null,
      phone: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '', // leave empty if not changing
      name: u.name,
      role: u.role,
      assigned_class_id: u.assigned_class_id || null,
      phone: u.phone || ''
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        assigned_class_id: formData.role === 'guru' && formData.assigned_class_id ? Number(formData.assigned_class_id) : null
      };

      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert('Data akun pengguna berhasil diperbarui.');
        if (onCurrentUserUpdate) {
          onCurrentUserUpdate({ id: editingUser.id, ...payload });
        }
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert('Pengguna baru berhasil ditambahkan.');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Yakin ingin menghapus akun ${u.name}?`)) return;
    try {
      const res = await apiRequest(`/users/${u.id}`, { method: 'DELETE' });
      alert(res.message);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const roleBadges = {
    admin: { label: 'Administrator', bg: 'bg-purple-100 text-purple-700' },
    petugas: { label: 'Petugas Piket', bg: 'bg-emerald-100 text-emerald-700' },
    guru: { label: 'Guru / Wali Kelas', bg: 'bg-blue-100 text-blue-700' },
    kepsek: { label: 'Kepala Sekolah', bg: 'bg-amber-100 text-amber-700' }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            <span>Manajemen Pengguna & Hak Akses</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun Admin, Petugas Piket Pagi, Guru / Wali Kelas, dan Kepala Sekolah
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-3.5">No</th>
                <th className="py-3 px-3.5">Username</th>
                <th className="py-3 px-3.5">Nama Lengkap</th>
                <th className="py-3 px-3.5">Role / Peran</th>
                <th className="py-3 px-3.5">Tugas Rombel</th>
                <th className="py-3 px-3.5">No HP</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800">{u.username}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadges[u.role]?.bg || 'bg-slate-100'}`}>
                        {roleBadges[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-blue-700 font-semibold">
                      {u.class_name ? `Wali ${u.class_name}` : '-'}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{u.phone || '-'}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-200 mb-4">
              {editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Login:</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  placeholder="admin / petugas / guru / kepsek"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password {editingUser ? '(Kosongkan jika tidak diubah)' : '(Wajib)'}:
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  placeholder="Contoh: Ibu Ratna, S.Pd"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role / Peran Hak Akses:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="admin">Admin (Akses Penuh)</option>
                  <option value="petugas">Petugas Piket Pagi (Scan Barcode & Absensi)</option>
                  <option value="guru">Guru / Wali Kelas (Pantau Rombel Sendiri)</option>
                  <option value="kepsek">Kepala Sekolah (Pantau Seluruh Laporan)</option>
                </select>
              </div>

              {formData.role === 'guru' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tugas Rombel / Wali Kelas:</label>
                  <select
                    value={formData.assigned_class_id}
                    onChange={(e) => setFormData({ ...formData, assigned_class_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="">-- Pilih Kelas Yang Diampu --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">No HP / WhatsApp:</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  placeholder="08xxxxxxxxxx"
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
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

