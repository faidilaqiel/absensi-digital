import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Users,
  Search,
  Zap,
  Volume2,
  WifiOff,
  RefreshCw,
  Keyboard,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Lock
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { playSuccessBeep, playLateWarning, playDuplicateBuzzer, playNotFoundBeep, speakAttendanceSuccess } from '../utils/audio';
import { addToOfflineQueue } from '../utils/offlineQueue';

export default function ScanPage({ isOnline, onQueueUpdate, isKioskMode, onToggleKioskMode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [modalClassFilter, setModalClassFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentForManual, setSelectedStudentForManual] = useState(null);
  const [manualReason, setManualReason] = useState('Lupa membawa kartu identitas');
  const [cameraFacing, setCameraFacing] = useState('environment'); // default back camera
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownCountdown, setCooldownCountdown] = useState(0);

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const cooldownTimerRef = useRef(null);

  // Load students & classes list for manual authorization modal
  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  // Auto start camera if Kiosk mode is activated
  useEffect(() => {
    if (isKioskMode && !isScanning) {
      const timer = setTimeout(() => {
        startScanner();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isKioskMode]);

  const loadClasses = async () => {
    try {
      const res = await apiRequest('/classes');
      setClassesList(res.classes || []);
    } catch (e) {
      console.warn('Could not load classes for modal filter', e);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await apiRequest('/students?status=active');
      setStudentsList(res.students || []);
    } catch (e) {
      console.warn('Could not load students for manual selection', e);
    }
  };

  const startScanner = async () => {
    try {
      setScanError(null);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Coba buka dengan facingMode terlebih dahulu (kamera belakang / depan)
      try {
        await html5QrCodeRef.current.start(
          { facingMode: cameraFacing },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (facingErr) {
        // Fallback: Jika facingMode gagal (biasa terjadi di beberapa webcam laptop Windows),
        // minta daftar semua video input camera devices dan pakai camera pertama
        console.warn('Facing mode start failed, falling back to camera devices list:', facingErr);
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          await html5QrCodeRef.current.start(
            cameras[0].id,
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } else {
          throw facingErr;
        }
      }

      setIsScanning(true);
    } catch (err) {
      console.error('Camera start error:', err);
      setScanError({
        errorCode: 'CAMERA_ERROR',
        message: 'Tidak dapat membuka kamera. Pastikan izin kamera telah diizinkan di browser atau gunakan kolom ketik NISN / Scanner USB di bawah.'
      });
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Stop scanner error:', err);
    }
  };

  // Toggle camera front/back
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        setCameraFacing(nextFacing);
        startScanner();
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  // Handle scanned QR Code - Fitur Scan Kilat (Multiple / Batch Scan Otomatis)
  const handleScanSuccess = async (qrCode) => {
    // Jika sedang dalam jeda 1,5 detik (cooldown), abaikan frame kamera sementara
    if (isCooldown || isProcessing) {
      return;
    }

    const now = Date.now();
    // Cegah kartu yang sama discan berkali-kali dalam 3 detik
    if (qrCode === lastScannedCodeRef.current && now - lastScanTimeRef.current < 3000) {
      return;
    }
    lastScannedCodeRef.current = qrCode;
    lastScanTimeRef.current = now;

    await processAttendanceCode(qrCode);

    // Aktifkan Jeda Scan Kilat 1.5 detik
    setIsCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

    cooldownTimerRef.current = setTimeout(() => {
      setIsCooldown(false);
      // Reset last scanned code setelah cooldown agar siap scan kartu berikutnya (atau kartu yang sama jika diperlukan)
      lastScannedCodeRef.current = '';
    }, 1500);
  };

  const processAttendanceCode = async (code) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setScanResult(null);
    setScanError(null);

    // If offline, save directly to local queue
    if (!isOnline) {
      const queued = addToOfflineQueue({ qr_code: code });
      if (soundEnabled) playSuccessBeep();
      onQueueUpdate();
      setScanResult({
        offline: true,
        message: 'Tersimpan di Penyimpanan Lokal Sementara (Mode Offline). Data akan disinkronkan otomatis saat online.',
        code
      });
      setIsProcessing(false);
      return;
    }

    try {
      const res = await apiRequest('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({ qr_code: code })
      });

      if (res.success) {
        setScanResult(res);
        if (soundEnabled) {
          if (res.data.status === 'hadir') {
            playSuccessBeep();
            // Confetti celebration if on time
            try {
              confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.6 }
              });
            } catch {}
          } else {
            playLateWarning();
          }

          // Ucapkan "Absensi berhasil" setelah nada beep
          setTimeout(() => {
            speakAttendanceSuccess();
          }, 150);
        }
      }
    } catch (err) {
      console.error('Attendance error:', err);
      const data = err.data;

      if (soundEnabled) {
        if (data?.error_code === 'DUPLICATE_SCAN') {
          playDuplicateBuzzer();
        } else {
          playNotFoundBeep();
        }
      }

      setScanError({
        errorCode: data?.error_code || 'UNKNOWN_ERROR',
        message: err.message,
        student: data?.student
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processAttendanceCode(manualInput.trim());
    setManualInput('');
  };

  const handleManualAuthorizedSubmit = async () => {
    if (!selectedStudentForManual) return;
    try {
      setIsProcessing(true);
      await apiRequest('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentForManual.id,
          status: 'hadir',
          notes: manualReason
        })
      });

      if (soundEnabled) {
        playSuccessBeep();
        setTimeout(() => {
          speakAttendanceSuccess();
        }, 150);
      }
      setSelectedStudentForManual(null);
      setScanResult({
        success: true,
        message: `Pencatatan kehadiran manual untuk ${selectedStudentForManual.name} berhasil disimpan.`,
        data: {
          name: selectedStudentForManual.name,
          nisn: selectedStudentForManual.nisn,
          class_name: selectedStudentForManual.class_name,
          time: new Date().toLocaleTimeString('id-ID'),
          status: 'hadir',
          notes: manualReason
        }
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStudents = studentsList.filter(s => {
    const matchClass = !modalClassFilter || String(s.class_id) === String(modalClassFilter) || s.class_name === modalClassFilter;
    const matchSearch = !studentSearch.trim() ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nisn.includes(studentSearch.trim()) ||
      s.class_name?.toLowerCase().includes(studentSearch.toLowerCase());
    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#16423C] to-[#11312C] text-white rounded-2xl p-4 sm:p-6 shadow-md border border-[#C5A880]/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur">
                <Camera className="w-5 h-5 text-[#C5A880]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Pemindai QR Code Absensi
              </h1>
            </div>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1">
              SDN Pengampon 3 Kota Cirebon • Pemindaian Otomatis Kedatangan Siswa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Mode Kios / Kunci Layar Fullscreen */}
            <button
              onClick={onToggleKioskMode}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                isKioskMode
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
              title={isKioskMode ? 'Keluar dari Mode Kios' : 'Kunci Layar Penuh (Kiosk Mode) Khusus Petugas Piket'}
            >
              {isKioskMode ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Keluar Mode Kios</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-[#C5A880]" />
                  <span>Mode Kios</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled ? 'bg-white/15 text-white border border-white/20' : 'bg-white/5 text-slate-300'
              }`}
              title="Aktifkan / Matikan Suara Notifikasi"
            >
              <Volume2 className="w-4 h-4" />
              <span>{soundEnabled ? 'Suara Aktif' : 'Senyap'}</span>
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#B89758] hover:bg-[#9E7D40] text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Siswa Lupa Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Scanner Viewport */}
        <div className="md:col-span-7 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Kamera Pemindai</span>
              {isScanning && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Scan Kilat Aktif
                </span>
              )}
            </span>

            {isScanning && (
              <button
                onClick={toggleCameraFacing}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Ganti Kamera ({cameraFacing === 'environment' ? 'Belakang' : 'Depan'})
              </button>
            )}
          </div>

          {/* Video Scanner Container */}
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-slate-100 shadow-inner">
            <div id="qr-reader" className="w-full h-full object-cover"></div>

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white">
                <div className="w-16 h-16 rounded-full bg-[#16423C]/40 border border-[#C5A880]/40 flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-[#C5A880]" />
                </div>
                <h3 className="font-bold text-base mb-1">Kamera Siap Digunakan</h3>
                <p className="text-xs text-slate-300 mb-4 max-w-xs">
                  Arahkan QR Code kartu siswa ke dalam kotak panduan kamera untuk pencatatan otomatis.
                </p>
                <button
                  onClick={startScanner}
                  className="px-5 py-2.5 bg-[#16423C] hover:bg-[#1B4D3E] text-white font-bold text-sm rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#C5A880]" />
                  <span>Aktifkan Kamera</span>
                </button>
              </div>
            )}

            {isScanning && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
                <button
                  onClick={stopScanner}
                  className="px-4 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-full shadow-md backdrop-blur flex items-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan Kamera</span>
                </button>
              </div>
            )}

            {/* Target Crosshair & Cooldown Indicator */}
            {isScanning && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className={`w-56 h-56 border-2 rounded-2xl relative transition-all duration-300 ${
                  isCooldown ? 'border-amber-400 bg-amber-500/10 scale-95' : 'border-emerald-400/80 animate-pulse'
                }`}>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>
                </div>

                {/* Status Badge di dalam area scanner */}
                {isCooldown ? (
                  <div className="mt-3 px-3 py-1 bg-amber-500/90 text-white text-[11px] font-bold rounded-full shadow-md backdrop-blur flex items-center gap-1.5 animate-pulse">
                    <span>⏱️ Jeda 1,5 dtk... Siapkan kartu berikutnya</span>
                  </div>
                ) : (
                  <div className="mt-3 px-3 py-1 bg-emerald-600/80 text-white text-[11px] font-bold rounded-full shadow-md backdrop-blur flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>Siap Scan Kartu Berikutnya</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barcode Gun / Manual Keyboard Input */}
          <form onSubmit={handleManualSubmit} className="w-full mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Scan dengan scanner USB / ketik NISN..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Keyboard className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !manualInput.trim()}
              className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 disabled:opacity-50"
            >
              Proses
            </button>
          </form>
        </div>

        {/* Real-time Result Card & Student Feedback */}
        <div className="md:col-span-5 flex flex-col justify-between">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs h-full flex flex-col">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Konfirmasi Kehadiran</span>
              {isProcessing && (
                <span className="text-[10px] text-blue-600 font-bold animate-pulse">
                  Memvalidasi...
                </span>
              )}
            </div>

            {/* If there is a successful scan result */}
            {scanResult && scanResult.success && (
              <div className="grow flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                    scanResult.data.status === 'hadir'
                      ? 'bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50'
                      : 'bg-amber-100 text-amber-600 ring-8 ring-amber-50'
                  }`}
                >
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide mb-2 ${
                    scanResult.data.status === 'hadir'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {scanResult.data.status === 'hadir' ? 'Hadir Tepat Waktu' : `Terlambat (${scanResult.data.late_minutes} M)`}
                </span>

                <h2 className="text-xl font-black text-slate-900 mt-1 leading-snug">
                  {scanResult.data.name}
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  NISN: {scanResult.data.nisn}
                </p>

                <div className="w-full mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rombongan Belajar:</span>
                    <span className="font-bold text-slate-800">{scanResult.data.class_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Kedatangan:</span>
                    <span className="font-extrabold text-blue-600">{scanResult.data.time} WIB</span>
                  </div>
                  {scanResult.data.notes && (
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                      <span>Catatan:</span>
                      <span className="font-medium text-right">{scanResult.data.notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Petugas:</span>
                    <span>{scanResult.data.recorded_by}</span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-600 font-semibold mt-3">
                  ✓ Data kehadiran berhasil disimpan ke database.
                </p>
              </div>
            )}

            {/* If offline stored */}
            {scanResult && scanResult.offline && (
              <div className="grow flex flex-col items-center justify-center p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <WifiOff className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white mb-2">
                  Antrean Offline Disimpan
                </span>
                <p className="text-xs text-slate-600 mt-2">
                  {scanResult.message}
                </p>
              </div>
            )}

            {/* If duplicate or error */}
            {scanError && (
              <div className="grow flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                    scanError.errorCode === 'DUPLICATE_SCAN'
                      ? 'bg-rose-100 text-rose-600 ring-8 ring-rose-50'
                      : 'bg-amber-100 text-amber-600 ring-8 ring-amber-50'
                  }`}
                >
                  {scanError.errorCode === 'DUPLICATE_SCAN' ? (
                    <XCircle className="w-10 h-10" />
                  ) : (
                    <AlertTriangle className="w-10 h-10" />
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-2 ${
                    scanError.errorCode === 'DUPLICATE_SCAN'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  {scanError.errorCode === 'DUPLICATE_SCAN' ? 'Absensi Ditolak (Ganda)' : 'Pemberitahuan'}
                </span>

                <h3 className="text-base font-bold text-slate-800 mt-1">
                  {scanError.message}
                </h3>

                {scanError.student && (
                  <div className="w-full mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 text-left text-xs space-y-1">
                    <div className="font-bold text-rose-800">{scanError.student.name}</div>
                    <div className="text-rose-600">Rombel: {scanError.student.class_name}</div>
                    <div className="text-rose-600">Sudah absen pukul: {scanError.student.recorded_time} WIB</div>
                  </div>
                )}
              </div>
            )}

            {/* Idle state */}
            {!scanResult && !scanError && (
              <div className="grow flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Clock className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                <h4 className="font-bold text-slate-600 text-sm">Menunggu Pemindaian Kartu</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Tunjukkan QR code kartu identitas siswa SDN Pengampon 3 ke arah kamera.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Authorization Modal (If student forgot card) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-800">
                  Pencatatan Kehadiran Manual (Lupa Kartu)
                </h3>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3 grow overflow-y-auto">
              <p className="text-xs text-slate-600">
                Gunakan fitur ini jika siswa lupa membawa kartu identitas. Catatan otorisasi petugas akan dicatat dalam database.
              </p>

              {/* Filter Rombel & Search Student Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={modalClassFilter}
                  onChange={(e) => setModalClassFilter(e.target.value)}
                  className="col-span-1 text-xs px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#16423C]"
                >
                  <option value="">Semua Rombel</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="col-span-1 sm:col-span-2 relative">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Cari nama siswa, NISN, atau kelas..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16423C] bg-white"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Student Results List */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50/40">
                {filteredStudents.slice(0, 20).map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudentForManual(s)}
                    className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition ${
                      selectedStudentForManual?.id === s.id
                        ? 'bg-emerald-50 border-l-4 border-[#16423C] font-bold text-[#16423C]'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-slate-500">NISN: {s.nisn}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                        {s.class_name}
                      </span>
                      {selectedStudentForManual?.id === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#16423C]" />
                      )}
                    </div>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Siswa tidak ditemukan untuk filter ini.
                  </div>
                )}
              </div>

              {selectedStudentForManual && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <div className="font-bold text-amber-900">Siswa Terpilih:</div>
                  <div className="text-amber-800">{selectedStudentForManual.name} ({selectedStudentForManual.class_name})</div>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan / Keterangan Otorisasi:
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Lupa membawa kartu / Kartu tertinggal di rumah"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedStudentForManual || isProcessing}
                onClick={handleManualAuthorizedSubmit}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                Simpan Kehadiran Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

