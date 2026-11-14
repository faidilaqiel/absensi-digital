const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');

async function convertHeic() {
  const heicPath = 'C:/Users/HYPE AMD/.gemini/antigravity/brain/8c80e7da-63c5-4183-86bd-211895944d30/.user_uploaded/media_1794490644115_652a3281.heic';
  const outPath = path.join(__dirname, 'client', 'public', 'classroom_bg.jpg');

  console.log('Membaca file HEIC dari:', heicPath);
  const inputBuffer = fs.readFileSync(heicPath);
  console.log('Ukuran file HEIC:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  console.log('Mengonversi HEIC ke JPEG...');
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92
  });

  fs.writeFileSync(outPath, outputBuffer);
  console.log('Berhasil mengonversi dan menyimpan ke:', outPath);
  console.log('Ukuran file JPEG baru:', (outputBuffer.length / 1024 / 1024).toFixed(2), 'MB');
}

convertHeic().catch(err => {
  console.error('Konversi gagal:', err);
  process.exit(1);
});

