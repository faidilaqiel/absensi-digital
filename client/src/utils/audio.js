// Web Audio API Synthesizer - tidak membutuhkan file audio eksternal
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSuccessBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Suara Beep singkat renyah & bersih seperti scanner kasir minimarket modern (1760 Hz / A6)
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // Frekuensi 1760 Hz (khas scanner barcode kasir)

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Bunyi sangat singkat & renyah (80ms)

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

export function playLateWarning() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.linearRampToValueAtTime(330, now + 0.25); // E4
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

export function playDuplicateBuzzer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

export function playNotFoundBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(250, now + i * 0.12);
      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.08);
    }
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Text-to-Speech (TTS) Bahasa Indonesia
 * Menyuarakan status "Absensi berhasil" secara ringkas & jelas
 * (Tidak mengeja nama siswa agar tidak terdengar per-huruf di perangkat)
 */
export function speakAttendanceSuccess() {
  try {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported by this browser.');
      return;
    }

    // Batalkan suara yang sedang berjalan sebelumnya agar tidak bertumpuk
    window.speechSynthesis.cancel();

    const textToSpeak = 'Absensi berhasil';
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Konfigurasi bahasa Indonesia
    utterance.lang = 'id-ID';
    utterance.rate = 1.0; // Kecepatan jelas dan tegas
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Cari suara bahasa Indonesia jika tersedia di browser pengguna
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(v => v.lang === 'id-ID' || v.lang.startsWith('id'));
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    // Eksekusi pengucapan suara
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
