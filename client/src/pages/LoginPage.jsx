import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import SchoolLogo from '../components/SchoolLogo';
import { apiRequest, setAuthToken, setCurrentUser } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Lengkapi nama pengguna dan kata sandi untuk melanjutkan.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Nama pengguna atau kata sandi tidak cocok.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8F9FA] text-[#1A202C]">
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Kolom Kiri: Visual Classroom & Quote (PERSIS SEPERTI GAMBAR) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-10 xl:p-14 overflow-hidden">
          {/* Background image & gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-left z-0"
            style={{
              backgroundImage: "url('/classroom_bg.jpg')",
              filter: "brightness(0.92) contrast(1.05)"
            }}
          ></div>
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/60 z-0"></div>

          {/* Header Kiri: Logo + Nama Sekolah + Pill Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-md shrink-0 flex items-center justify-center border border-white/20 bg-black">
                <SchoolLogo className="w-full h-full" />
              </div>
              <div className="text-white drop-shadow-sm">
                <div className="font-bold text-base leading-tight">SDN Pengampon 3</div>
                <div className="text-xs text-white/80 font-medium">Kota Cirebon</div>
              </div>
            </div>

            {/* Pill Badge Glassmorphism */}
            <div className="px-4 py-1.5 rounded-full border border-white/25 bg-black/40 backdrop-blur-md text-xs font-medium text-white tracking-wide shadow-xs">
              Sistem Kehadiran Digital
            </div>
          </div>

          {/* Bawah Kiri: Headline Quote Serif Elegan & Deskripsi */}
          <div className="relative z-10 max-w-xl text-white">
            {/* Garis Aksen Emas */}
            <div className="w-12 h-0.5 bg-[#C5A880] mb-5"></div>

            <h2 className="font-serif-display text-3xl xl:text-4xl 2xl:text-5xl font-medium tracking-tight leading-[1.18] text-white drop-shadow-md">
              Kehadiran yang tertata,<br />
              hari belajar yang lebih<br />
              bermakna.
            </h2>

            <p className="mt-5 text-sm xl:text-base text-white/90 leading-relaxed font-normal max-w-lg drop-shadow-xs">
              Satu pintu untuk mencatat kehadiran siswa dan memantau aktivitas sekolah secara ringkas, aman, dan akurat.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Form Login (PERSIS SEPERTI GAMBAR) */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 bg-white flex flex-col justify-between p-6 sm:p-12 xl:p-16 min-h-screen">
          {/* Mobile Header jika dibuka di HP */}
          <div className="lg:hidden flex items-center justify-between pb-6 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <SchoolLogo className="w-9 h-9" />
              <div>
                <div className="font-bold text-slate-900 text-sm">SDN Pengampon 3</div>
                <div className="text-[11px] text-slate-500">Kota Cirebon</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Absensi Digital
            </span>
          </div>

          {/* Konten Form Tengah */}
          <div className="my-auto max-w-md w-full mx-auto">
            {/* Sub-header aksen */}
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B89758] uppercase">
              <span className="inline-block w-5 h-0.5 bg-[#B89758]"></span>
              <span>PORTAL SEKOLAH</span>
            </div>

            {/* Judul Utama */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] mt-3 tracking-tight leading-tight">
              Selamat datang<br />kembali
            </h1>

            <p className="text-sm text-slate-500 mt-2.5 leading-relaxed font-normal">
              Masuk menggunakan akun yang telah diberikan oleh administrator sekolah.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              {/* Field: Nama Pengguna */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Nama pengguna
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan nama pengguna"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16423C] focus:ring-1 focus:ring-[#16423C] transition"
                  />
                </div>
              </div>

              {/* Field: Kata Sandi */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Kata sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16423C] focus:ring-1 focus:ring-[#16423C] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Box / Notification (Persis Kotak Pastel Merah/Pink pada Gambar) */}
              {error && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B] animate-in fade-in duration-150">
                  {error}
                </div>
              )}

              {/* Tombol Utama Hijau Hutan Gelap (Forest Green) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl bg-[#16423C] hover:bg-[#1B4D3E] active:bg-[#10342F] text-white font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-[#16423C]/20 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Memvalidasi akun...' : 'Masuk ke dashboard'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

          </div>

          {/* Footer Kanan */}
          <div className="pt-6 border-t border-slate-100 flex flex-col items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <div>
              ©️ Copyright <span className="font-bold text-slate-700">SDN PENGAMPON 3</span> All Rights Reserved
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16423C]" />
              <span>Akses aman untuk warga sekolah</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
