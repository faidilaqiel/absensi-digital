import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Paperclip,
  Mic,
  QrCode,
  Users,
  BarChart3,
  HelpCircle,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputPesan, setInputPesan] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatusText, setTypingStatusText] = useState('Mengetik...');
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl, base64 }

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Format pesan agar markdown **bold** atau simbol berantakan bersih dan ramah di mata
  const formatMessageText = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages, isTyping]);

  // Handler memilih file gambar (Accept image/*)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);

    // Reset input value agar file yang sama bisa dipilih ulang jika dihapus
    e.target.value = '';
  };

  // Hapus preview gambar terpilih
  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
  };

  // Fungsi pengiriman pesan chat
  const handleSendMessage = async (textToSend) => {
    const pesanTeks = (textToSend || inputPesan || '').trim();
    const imagePayload = selectedImage?.base64 || null;
    const imagePreviewUrl = selectedImage?.previewUrl || null;

    if ((!pesanTeks && !imagePayload) || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: pesanTeks,
      image: imagePreviewUrl // simpan preview gambar di bubble user
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPesan('');
    setSelectedImage(null);
    setIsTyping(true);

    if (imagePayload) {
      setTypingStatusText('Menganalisis gambar...');
    } else {
      setTypingStatusText('Mengetik...');
    }

    try {
      // Jeda natural untuk UX
      const [response] = await Promise.all([
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pesan: pesanTeks,
            gambar: imagePayload
          })
        }).then((r) => r.json()),
        new Promise((resolve) => setTimeout(resolve, imagePayload ? 1200 : 800))
      ]);

      const botReply = response?.jawaban || 'Maaf, saya tidak dapat merespons saat ini.';

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: botReply
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Maaf, terjadi kendala saat menghubungkan ke server PresensiAI. Silakan coba kembali.'
        }
      ]);
    } finally {
      setIsTyping(false);
      setTypingStatusText('Mengetik...');
    }
  };

  // 4 Kartu Menu Cepat (Quick Actions)
  const quickActions = [
    {
      id: 'scan',
      title: 'Cara Scan Kartu',
      subtitle: 'Panduan scan kehadiran',
      icon: QrCode,
      prompt: 'Bagaimana cara scan kartu QR presensi siswa?'
    },
    {
      id: 'cek_absen',
      title: 'Cek Kehadiran',
      subtitle: 'Lihat siswa belum absen',
      icon: Users,
      prompt: 'Siapa yang belum absen hari ini?'
    },
    {
      id: 'statistik',
      title: 'Statistik Hari Ini',
      subtitle: 'Ringkasan kehadiran',
      icon: BarChart3,
      prompt: 'Bagaimana ringkasan statistik kehadiran hari ini?'
    },
    {
      id: 'bantuan',
      title: 'Bantuan Lainnya',
      subtitle: 'Panduan penggunaan aplikasi',
      icon: HelpCircle,
      prompt: 'Panduan dan bantuan penggunaan aplikasi presensi digital SDN Pengampon 3.'
    }
  ];

  // Reset chat ke tampilan awal
  const handleResetChat = () => {
    handleRemoveImage();
    setMessages([]);
    setInputPesan('');
  };

  const isChatEmpty = messages.length === 0;

  return (
    <>
      {/* 1. Tampilan Gelembung Avatar Bubble di Pojok Kanan Bawah */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
        {/* Chat Window Popup Responsive */}
        {isOpen && (
          <div
            className={`
              fixed inset-0 sm:static sm:inset-auto
              w-full h-full sm:w-[380px] sm:h-[530px]
              mb-0 sm:mb-3
              bg-white sm:rounded-2xl rounded-none
              shadow-2xl border border-slate-200/90
              flex flex-col overflow-hidden
              transition-all duration-300 ease-out
              animate-in fade-in zoom-in-95
            `}
            style={{
              boxShadow: '0 20px 40px -15px rgba(22, 66, 60, 0.25)'
            }}
          >
            {/* Header Kotak Chat */}
            <div className="bg-[#1A4731] text-white px-4 py-3 sm:py-3.5 flex items-center justify-between border-b border-[#C5A880]/30 shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/20 p-0.5 shadow-xs">
                    <img
                      src="/presensiai_avatar.png"
                      alt="PresensiAI Avatar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1A4731] rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5 leading-tight tracking-wide">
                    <span>PresensiAI</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </h3>
                  <p className="text-[10px] text-emerald-100/80 font-normal">
                    Pintu gerbang absensi digital SDN Pengampon 3
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Tombol Refresh / Bersihkan Chat */}
                {!isChatEmpty && (
                  <button
                    onClick={handleResetChat}
                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Mulai Percakapan Baru"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Tombol Tutup Chat */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title="Tutup Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Area Konten Chat */}
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto bg-slate-50/70 text-xs flex flex-col justify-between">
              {/* STATE KOSONG: Judul Besar + Sub-teks + 4 Kartu Menu Cepat */}
              {isChatEmpty ? (
                <div className="my-auto py-2 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-300">
                  {/* Judul Besar & Subteks */}
                  <div className="mb-4 text-left">
                    <h1 className="text-[17px] sm:text-[19px] font-black text-[#1A4731] leading-snug tracking-tight">
                      Halo! Ada yang bisa PresensiAI bantu?
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Layanan absensi digital resmi SDN Pengampon 3.
                    </p>
                  </div>

                  {/* 4 Kartu Menu Cepat (Grid 2x2) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {quickActions.map((card) => {
                      const IconComponent = card.icon;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleSendMessage(card.prompt)}
                          className="group p-3 bg-white border border-slate-200/80 rounded-[12px] text-left hover:bg-emerald-50/60 hover:border-emerald-300 transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between min-h-[90px]"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100/80 flex items-center justify-center transition-colors mb-1.5">
                            <IconComponent className="w-4 h-4 text-[#1A4731]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[11px] text-slate-800 group-hover:text-[#1A4731] leading-tight">
                              {card.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 group-hover:text-emerald-800/70 mt-0.5 leading-tight">
                              {card.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* STATE AKTIF: Riwayat Percakapan Chat */
                <div className="space-y-3 animate-in fade-in duration-300">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-slate-200 shadow-2xs">
                          <img
                            src="/presensiai_avatar.png"
                            alt="Bot"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-2xs leading-relaxed whitespace-pre-wrap ${
                          msg.sender === 'user'
                            ? 'bg-[#1A4731] text-white rounded-br-xs font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        }`}
                      >
                        {/* Jika ada lampiran gambar dari user */}
                        {msg.image && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-white/20 max-w-[200px] shadow-xs">
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="w-full max-h-44 object-cover"
                            />
                          </div>
                        )}
                        {msg.text && <div>{formatMessageText(msg.text)}</div>}
                      </div>
                    </div>
                  ))}

                  {/* Animasi Mengetik / Menganalisis Gambar... */}
                  {isTyping && (
                    <div className="flex gap-2 justify-start items-center">
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src="/presensiai_avatar.png"
                          alt="Bot"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></span>
                        <span className="text-[11px] text-slate-500 font-medium ml-1">
                          {typingStatusText}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 2. Desain Kolom Input (Bawah) */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              {/* Preview Gambar Kecil di Atas Input (jika user memilih gambar) */}
              {selectedImage && (
                <div className="mb-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={selectedImage.previewUrl}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-300"
                    />
                    <div className="truncate">
                      <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[200px]">
                        {selectedImage.file.name}
                      </p>
                      <p className="text-[9px] text-emerald-700 font-medium">
                        Gambar siap dianalisis AI
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-lg transition cursor-pointer"
                    title="Hapus gambar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input File Tersembunyi (accept="image/*") */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Kolom Input Membulat Panjang dengan Ikon Lampiran & Mikrofon */}
                <div className="flex-1 flex items-center bg-white border border-slate-300/80 hover:border-slate-400 focus-within:border-[#1A4731] focus-within:ring-2 focus-within:ring-[#1A4731]/10 rounded-full px-2.5 py-1.5 transition-all shadow-2xs">
                  {/* Ikon Lampiran/Kertas Terhubung ke File Picker */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 text-slate-400 hover:text-[#1A4731] transition rounded-full cursor-pointer hover:bg-emerald-50"
                    title="Unggah Gambar"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>

                  {/* Input Teks */}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedImage ? 'Ketik pertanyaan tentang gambar ini...' : 'Tanyakan sesuatu ke PresensiAI...'}
                    value={inputPesan}
                    onChange={(e) => setInputPesan(e.target.value)}
                    className="flex-1 text-xs px-2 py-0.5 bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
                  />

                  {/* Ikon Mikrofon */}
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer"
                    title="Pesan Suara"
                    onClick={() => {}}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tombol Kirim (Paper Plane) Hijau */}
                <button
                  type="submit"
                  disabled={(!inputPesan.trim() && !selectedImage) || isTyping}
                  className="w-8 h-8 rounded-full bg-[#1A4731] hover:bg-[#133625] disabled:bg-slate-300 text-white flex items-center justify-center transition-all duration-200 shadow-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title="Kirim Pesan"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. Gelembung Avatar Tombol Trigger (Bounce & Hover Scale) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group relative rounded-full p-0.5 shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
            !isOpen ? 'animate-bounce hover:animate-none' : ''
          } hover:scale-110 active:scale-95`}
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #1A4731 0%, #10B981 100%)',
            boxShadow:
              '0 10px 25px -3px rgba(26, 71, 49, 0.4), 0 4px 6px -2px rgba(26, 71, 49, 0.2)'
          }}
          title={isOpen ? 'Tutup PresensiAI' : 'Buka Chatbot PresensiAI'}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5 flex items-center justify-center">
            <img
              src="/presensiai_avatar.png"
              alt="PresensiAI"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* Indikator Online Hijau */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full shadow-xs"></span>
        </button>
      </div>
    </>
  );
}
