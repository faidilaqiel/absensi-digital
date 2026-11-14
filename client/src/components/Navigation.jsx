import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Users,
  GraduationCap,
  CreditCard,
  CalendarCheck,
  FileQuestion,
  Award,
  UserCog,
  Settings as SettingsIcon
} from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, userRole }) {
  const role = userRole || 'petugas';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'petugas', 'guru', 'kepsek']
    },
    {
      id: 'scan',
      label: 'Scan QR Barcode',
      icon: QrCode,
      roles: ['admin', 'petugas']
    },
    {
      id: 'attendance',
      label: 'Data Kehadiran',
      icon: CalendarCheck,
      roles: ['admin', 'petugas', 'guru', 'kepsek']
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      roles: ['admin', 'petugas', 'guru', 'kepsek']
    },
    {
      id: 'classes',
      label: 'Data Rombel',
      icon: GraduationCap,
      roles: ['admin', 'petugas', 'kepsek']
    },
    {
      id: 'cards',
      label: 'Cetak Kartu Siswa',
      icon: CreditCard,
      roles: ['admin']
    },
    {
      id: 'permits',
      label: 'Izin & Sakit',
      icon: FileQuestion,
      roles: ['admin', 'petugas', 'guru']
    },
    {
      id: 'reports',
      label: 'Laporan & Reward',
      icon: Award,
      roles: ['admin', 'petugas', 'guru', 'kepsek']
    },
    {
      id: 'users',
      label: 'Manajemen Akun',
      icon: UserCog,
      roles: ['admin']
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: SettingsIcon,
      roles: ['admin']
    }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Desktop Sidebar Elegan */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
        <div className="flex items-center gap-1.5 px-3 mb-3 text-[11px] font-bold text-[#B89758] uppercase tracking-wider">
          <span className="w-2.5 h-0.5 bg-[#B89758]"></span>
          <span>MENU UTAMA</span>
        </div>

        <nav className="space-y-1">
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#16423C] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A880]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#16423C]/10 text-[#16423C]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

    </>
  );
}
