import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertCircle,
  Check,
  GraduationCap,
  FileText,
  FileCheck,
  Image,
  Package
} from 'lucide-react';
import SchoolLogo from '../components/SchoolLogo';
import { apiRequest, getAuthToken } from '../services/api';

export default function CardsPage({ selectedAY }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrCodeUrls, setQrCodeUrls] = useState({});
  const [regeneratingId, setRegeneratingId] = useState(null);

  useEffect(() => {
    loadClasses();
  }, [selectedAY]);

  useEffect(() => {
    loadStudents();
  }, [selectedClass, selectedAY]);

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
      setLoading(true);
      let url = '/students?status=active';
      if (selectedClass) {
        url += `&class_id=${selectedClass}`;
      } else if (selectedAY) {
        url += `&academic_year_id=${selectedAY}`;
      }
      const res = await apiRequest(url);
      setStudents(res.students || []);

      // Generate QR codes for all students
      generateQRCodes(res.students || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async (studentsList) => {
    const urls = {};
    for (const s of studentsList) {
      try {
        const url = await QRCode.toDataURL(s.qr_code, {
          width: 280,
          margin: 0,
          color: {
            dark: '#111827',
            light: '#00000000' // transparent background
          }
        });
        urls[s.id] = url;
      } catch (err) {
        console.error('QR generate error', err);
      }
    }
    setQrCodeUrls(urls);
  };

  // Regenerate QR Code for lost or damaged card
  const handleRegenerateQR = async (student) => {
    if (!window.confirm(`Yakin ingin membuat QR Code baru untuk ${student.name}? Kartu lama yang hilang otomatis tidak akan berlaku lagi di sistem scanner.`)) {
      return;
    }

    try {
      setRegeneratingId(student.id);
      const res = await apiRequest(`/students/${student.id}/regenerate-qr`, { method: 'POST' });
      alert(res.message);
      loadStudents();
    } catch (err) {
      alert(err.message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const [exportingType, setExportingType] = useState(null);
  const [downloadingPngId, setDownloadingPngId] = useState(null);

  const handlePrint = () => {
    window.print();
  };

  // Download single card as PNG
  const handleDownloadPng = async (student) => {
    try {
      setDownloadingPngId(student.id);
      const token = getAuthToken();
      const res = await fetch(`/api/cards/download-png/${student.id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal mengunduh kartu PNG');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = student.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
      a.download = `Kartu_${safeName}_${student.nisn}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloadingPngId(null);
    }
  };

  // Download all filtered cards as ZIP of PNGs
  const handleDownloadPngBulk = async () => {
    try {
      setExportingType('png');
      const token = getAuthToken();
      let url = '/api/cards/download-png-bulk';
      const params = [];
      if (selectedClass) params.push(`class_id=${selectedClass}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal mengunduh kartu PNG');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Kartu_Siswa_PNG_SDN_Pengampon_3_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportDocx = async () => {
    try {
      setExportingType('docx');
      const token = getAuthToken();
      let url = '/api/cards/export-docx';
      const params = [];
      if (selectedClass) params.push(`class_id=${selectedClass}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal mengekspor file Word');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Kartu_Siswa_SDN_Pengampon_3_F4_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      const token = getAuthToken();
      let url = '/api/cards/export-pdf';
      const params = [];
      if (selectedClass) params.push(`class_id=${selectedClass}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal mengekspor file PDF');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Kartu_Siswa_SDN_Pengampon_3_F4_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportingType(null);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn.includes(search) ||
    s.class_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Controls Header - Hidden during print */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>Kartu Identitas Siswa Ber-Barcode (QR Code)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cetak kartu fisik siswa SDN Pengampon 3 Kota Cirebon secara massal atau perorangan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="">Semua Rombel (7 Kelas)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.student_count || 0} siswa)
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa / NISN..."
              className="text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Download PNG (ZIP) Button - NEW */}
          <button
            onClick={handleDownloadPngBulk}
            disabled={exportingType !== null || filteredStudents.length === 0}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Download semua kartu sebagai gambar PNG resolusi tinggi (dalam file ZIP). Bisa langsung di-edit di Canva / Word"
          >
            <Image className={`w-4 h-4 ${exportingType === 'png' ? 'animate-spin' : ''}`} />
            <span>{exportingType === 'png' ? 'Mengunduh...' : 'Download PNG (ZIP)'}</span>
          </button>

          {/* Export Word (DOCX) Button */}
          <button
            onClick={handleExportDocx}
            disabled={exportingType !== null || filteredStudents.length === 0}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Download file Word (.docx) dengan layout F4 (12 kartu per lembar)"
          >
            <FileText className={`w-4 h-4 ${exportingType === 'docx' ? 'animate-spin' : ''}`} />
            <span>{exportingType === 'docx' ? 'Membuat Word...' : 'Format Word (F4)'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={exportingType !== null || filteredStudents.length === 0}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Download file PDF siap cetak dengan ukuran kertas F4 / Folio Landscape"
          >
            <Download className={`w-4 h-4 ${exportingType === 'pdf' ? 'animate-spin' : ''}`} />
            <span>{exportingType === 'pdf' ? 'Membuat PDF...' : 'Format PDF (F4)'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#16423C] hover:bg-[#1B4D3E] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C5A880]" />
            <span>Cetak Langsung ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="no-print p-3 bg-purple-50/60 text-purple-900 rounded-xl border border-purple-200 text-xs flex items-start gap-2">
        <Image className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <span>
          <strong>Download PNG untuk Canva / Word:</strong> Klik tombol ungu <strong>"Download PNG (ZIP)"</strong> untuk mengunduh seluruh kartu sebagai gambar PNG beresolusi tinggi.
          File PNG bisa langsung dimasukkan ke <strong>Canva</strong>, <strong>Microsoft Word</strong>, atau <strong>Photoshop</strong> dan ukurannya dapat disesuaikan sesuai kebutuhan cetak.
          Atau klik tombol <strong>"↓ PNG"</strong> di bawah setiap kartu siswa untuk mendownload satu per satu.
        </span>
      </div>

      {/* Cards Printable Area */}
      <div className="print-area">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Menyiapkan kartu siswa...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="group relative flex flex-col items-center"
              >
                {/* ID Card Portrait View */}
                <div
                  className="relative rounded-2xl shadow-md overflow-hidden select-none break-inside-avoid border border-slate-200/80 bg-white"
                  style={{
                    width: '280px',
                    height: '476px', // matches 591 x 1004 aspect ratio
                  }}
                >
                  {/* Background Template Graphic */}
                  <img
                    src="/card_template_clean.png"
                    alt="Template Kartu"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />

                  {/* Dynamic QR Code inside the blue framed container */}
                  <div
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{
                      left: '26.5%',
                      top: '25.0%',
                      width: '47.0%',
                      height: '28.5%',
                    }}
                  >
                    {qrCodeUrls[student.id] ? (
                      <img
                        src={qrCodeUrls[student.id]}
                        alt={`QR ${student.name}`}
                        className="w-[88%] h-[88%] object-contain"
                      />
                    ) : (
                      <div className="w-[80%] h-[80%] bg-slate-100 animate-pulse rounded"></div>
                    )}
                  </div>

                  {/* Dynamic Student Name (Only Name, no Class, no NISN) */}
                  <div
                    className="absolute flex flex-col items-center justify-center text-center px-4 pointer-events-none"
                    style={{
                      left: '4%',
                      right: '4%',
                      top: '58.0%',
                      height: '14.5%',
                    }}
                  >
                    <div
                      className="font-black text-[#2D3748] tracking-normal uppercase leading-tight"
                      style={{
                        fontSize: student.name.length > 30 ? '11.5px' : (student.name.length > 20 ? '13px' : '15px'),
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        wordBreak: 'normal',
                        overflowWrap: 'break-word',
                        maxWidth: '100%'
                      }}
                    >
                      {student.name}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Below Card (Hidden on print) */}
                <div className="no-print mt-2 flex items-center justify-between w-full max-w-[280px] px-1 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">
                    {student.class_name}
                  </span>

                  <div className="flex items-center gap-3">
                    {/* Download PNG per siswa */}
                    <button
                      onClick={() => handleDownloadPng(student)}
                      disabled={downloadingPngId === student.id}
                      title={`Download kartu ${student.name} sebagai PNG`}
                      className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 hover:underline text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-3 h-3 ${downloadingPngId === student.id ? 'animate-spin' : ''}`} />
                      <span>PNG</span>
                    </button>

                    {/* Regenerate QR for lost card */}
                    <button
                      onClick={() => handleRegenerateQR(student)}
                      disabled={regeneratingId === student.id}
                      title="Buat ulang QR Code jika kartu fisik hilang"
                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline text-[11px] cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${regeneratingId === student.id ? 'animate-spin' : ''}`} />
                      <span>Kartu Hilang?</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
