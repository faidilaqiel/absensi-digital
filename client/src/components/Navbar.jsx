import React, { useState } from 'react';
import SchoolLogo from './SchoolLogo';
import {
  Wifi, WifiOff, RefreshCw, LogOut, Moon, Sun, Calendar, Menu, X,
  LayoutDashboard, QrCode, Users, GraduationCap, CreditCard,
  CalendarCheck, FileQuestion, Award, UserCog, Settings as SettingsIcon, ChevronDown
} from 'lucide-react';

export default function Navbar({
  currentUser,
  onLogout,
  isOnline,
  offlineCount,
  onSyncOffline,
  isSyncing,
  darkMode,
  onToggleDarkMode,
  academicYears = [],
  selectedAY,
  onSelectAY,
  // Props baru untuk Mobile Sidebar
  activeTab,
  setActiveTab,
  userRole,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleLabels = {
    admin: { label: 'Administrator', bg: 'bg-[#16423C]/10 text-[#16423C] border-[#16423C]/20' },
    petugas: { label: 'Petugas Piket', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    guru: { label: 'Wali Kelas', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    kepsek: { label: 'Kepala Sekolah', bg: 'bg-[#B89758]/15 text-[#8C6D37] border-[#B89758]/30' },
  };
  const roleInfo = roleLabels[currentUser?.role] || { label: currentUser?.role, bg: 'bg-slate-100 text-slate-700' };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'petugas', 'guru', 'kepsek'] },
    { id: 'scan', label: 'Scan QR Barcode', icon: QrCode, roles: ['admin', 'petugas'] },
    { id: 'attendance', label: 'Data Kehadiran', icon: CalendarCheck, roles: ['admin', 'petugas', 'guru', 'kepsek'] },
    { id: 'students', label: 'Data Siswa', icon: Users, roles: ['admin', 'petugas', 'guru', 'kepsek'] },
    { id: 'classes', label: 'Data Rombel', icon: GraduationCap, roles: ['admin', 'petugas', 'kepsek'] },
    { id: 'cards', label: 'Cetak Kartu Siswa', icon: CreditCard, roles: ['admin'] },
    { id: 'permits', label: 'Izin & Sakit', icon: FileQuestion, roles: ['admin', 'petugas', 'guru'] },
    { id: 'reports', label: 'Laporan & Reward', icon: Award, roles: ['admin', 'petugas', 'guru', 'kepsek'] },
    { id: 'users', label: 'Manajemen Akun', icon: UserCog, roles: ['admin'] },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole || 'petugas'));

  const handleMenuClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* Row 1: Logo + Judul + Hamburger (Mobile) | Logo + semua kontrol (Desktop) */}
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & School Identity */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-300 shadow-xs shrink-0 flex items-center justify-center bg-black">
                <SchoolLogo className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#111827] text-base tracking-tight leading-none">
                    SDN Pengampon 3
                  </span>
                  <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#16423C]/10 text-[#16423C] border border-[#16423C]/20">
                    Kota Cirebon
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 hidden sm:block">
                  Portal Sistem Kehadiran Siswa Digital
                </p>
              </div>
            </div>

            {/* Desktop: Right Controls (TA, Dark Mode, Online, User, Logout) */}
            <div className="hidden lg:flex items-center gap-2 sm:gap-3">
              {/* Dropdown Tahun Ajaran */}
              {academicYears && academicYears.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#16423C]/10 border border-[#16423C]/20 px-2.5 py-1 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#16423C] shrink-0" />
                  <select
                    value={selectedAY}
                    onChange={(e) => onSelectAY(e.target.value)}
                    className="bg-transparent font-bold text-[#16423C] focus:outline-none cursor-pointer text-xs"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id} className="text-slate-800 bg-white">{ay.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dark Mode Toggle */}
              <button onClick={onToggleDarkMode} className={`p-2 rounded-xl border transition-all cursor-pointer ${darkMode ? 'bg-amber-500/15 border-amber-400/30 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}>
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Online/Offline */}
              <div className="flex items-center gap-1.5 text-xs">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[#16423C] font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 animate-pulse">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Offline</span>
                  </span>
                )}
                {offlineCount > 0 && (
                  <button onClick={onSyncOffline} disabled={!isOnline || isSyncing}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#B89758] text-white hover:bg-[#9E7D40] disabled:opacity-50 cursor-pointer">
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{offlineCount} Antrean</span>
                  </button>
                )}
              </div>

              {/* User + Logout */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                    <span className={`text-[10px] font-bold px-2 rounded-full border ${roleInfo.bg}`}>{roleInfo.label}</span>
                  </div>
                  <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: Tombol Hamburger di pojok kanan */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2 (Mobile Only): TA + Refresh + Online Badge sejajar dalam 1 baris */}
          <div className="lg:hidden flex items-center justify-between gap-2 pb-2 -mt-0.5">
            <div className="flex items-center gap-2">
              {/* Dropdown Tahun Ajaran */}
              {academicYears && academicYears.length > 0 && (
                <div className="flex items-center gap-1 bg-[#16423C]/10 border border-[#16423C]/20 px-2 py-1 rounded-lg text-[11px]">
                  <Calendar className="w-3 h-3 text-[#16423C] shrink-0" />
                  <select
                    value={selectedAY}
                    onChange={(e) => onSelectAY(e.target.value)}
                    className="bg-transparent font-bold text-[#16423C] focus:outline-none cursor-pointer text-[11px] max-w-[80px]"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id} className="text-slate-800 bg-white">{ay.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#16423C] shrink-0" />
                </div>
              )}

              {/* Tombol Refresh */}
              <button onClick={onSyncOffline ? onSyncOffline : () => window.location.reload()}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Online/Offline indicator */}
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-[#16423C] font-semibold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-full border border-rose-200 animate-pulse text-[11px]">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </span>
              )}
            </div>

            {/* Administrator Mobile */}
            {currentUser && (
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-800 leading-tight">{currentUser.name}</div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleInfo.bg}`}>{roleInfo.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3 (Mobile Only): Active Page Indicator */}
        {activeTab && (
          <div className="lg:hidden px-3 pb-2.5">
            <div className="flex items-center gap-2 bg-[#16423C] text-white px-3.5 py-2 rounded-xl w-full">
              {(() => {
                const activeItem = menuItems.find(m => m.id === activeTab);
                if (!activeItem) return null;
                const Icon = activeItem.icon;
                return (
                  <>
                    <Icon className="w-4 h-4 text-[#C5A880] shrink-0" />
                    <span className="font-semibold text-sm">{activeItem.label}</span>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </header>

      {/* ===================== Mobile Sidebar Overlay ===================== */}
      {sidebarOpen && (
        <>
          {/* Overlay Gelap Transparan */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar Sliding dari Kiri */}
          <div className="fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-left duration-250">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-[#16423C]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 shrink-0 bg-black">
                  <SchoolLogo className="w-full h-full" />
                </div>
                <div>
                  <span className="font-extrabold text-white text-sm leading-none block">SDN Pengampon 3</span>
                  <span className="text-[10px] text-emerald-200/80 font-medium">Portal Absensi Digital</span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info di Sidebar */}
            {currentUser && (
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.bg}`}>{roleInfo.label}</span>
              </div>
            )}

            {/* Menu Label */}
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#B89758] uppercase tracking-wider">
                <span className="w-2.5 h-0.5 bg-[#B89758]"></span>
                <span>MENU UTAMA</span>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#16423C] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C5A880]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer Sidebar: Dark Mode + Logout */}
            <div className="border-t border-slate-200 px-3 py-3 flex items-center justify-between gap-2">
              <button onClick={onToggleDarkMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${darkMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              </button>
              <button onClick={() => { setSidebarOpen(false); onLogout(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold cursor-pointer hover:bg-rose-100 transition">
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
