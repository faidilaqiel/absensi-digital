const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  WidthType,
  AlignmentType,
  PageOrientation
} = require('docx');
const db = require('../db');
const { authenticateToken } = require('../auth');

const templatePath = path.join(__dirname, '../../client/public/card_template_clean.png');

// Helper function to render a single student card to Buffer (PNG/JPEG)
async function renderCardImage(student) {
  // Generate QR Code with 100% TRANSPARENT background (light: '#00000000') and margin 0
  // so it never overlaps or clashes with the card frame!
  const qrBuf = await QRCode.toBuffer(student.qr_code || student.nisn, {
    width: 250,
    margin: 0,
    color: {
      dark: '#111827',
      light: '#00000000' // Fully transparent background
    }
  });

  const nameUpper = (student.name || '').toUpperCase().trim();

  // Smart multiline wrapping for long names so words wrap to next line cleanly
  const words = nameUpper.split(/\s+/);
  const lines = [];
  let currentLine = '';
  const maxChars = nameUpper.length > 30 ? 21 : 18;

  for (const w of words) {
    if (!currentLine) {
      currentLine = w;
    } else if ((currentLine + ' ' + w).length <= maxChars) {
      currentLine += ' ' + w;
    } else {
      lines.push(currentLine);
      currentLine = w;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Font size adjusted by character length & number of lines
  let fontSize = 28;
  if (lines.length >= 3) {
    fontSize = 22;
  } else if (lines.length === 2) {
    fontSize = nameUpper.length > 30 ? 23 : 26;
  } else {
    fontSize = nameUpper.length > 20 ? 27 : 30;
  }

  const lineHeight = fontSize + 8;
  const totalBlockHeight = lines.length * lineHeight;
  // Box center vertical is around Y = 640. Baseline adjusted:
  const startY = 640 - (totalBlockHeight / 2) + (fontSize * 0.85);

  const tspanLines = lines.map((line, idx) => {
    const yPos = Math.round(startY + (idx * lineHeight));
    return `<text x="301" y="${yPos}" font-size="${fontSize}" class="name" text-anchor="middle" letter-spacing="0.5">${escapeXml(line)}</text>`;
  }).join('\n');

  // Card template is 602 x 1024, Center X is 301
  const svgText = `
    <svg width="602" height="1024" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { font-family: 'Arial Black', Arial, Helvetica, sans-serif; font-weight: 900; fill: #2D3748; }
      </style>
      ${tspanLines}
    </svg>
  `;

  const compositeBuf = await sharp(templatePath)
    .composite([
      { input: qrBuf, top: 276, left: 176 },
      { input: Buffer.from(svgText), top: 0, left: 0 }
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  return compositeBuf;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function getStudentsList(req) {
  const { class_id, search, ids } = req.query;
  let query = `
    SELECT s.*, c.name as class_name, c.level as class_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.status = 'active'
  `;
  const params = [];

  if (ids) {
    const idList = ids.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    if (idList.length > 0) {
      query += ` AND s.id IN (${idList.map(() => '?').join(',')})`;
      params.push(...idList);
    }
  } else {
    if (req.user.role === 'guru' && req.user.assigned_class_id) {
      query += ` AND s.class_id = ?`;
      params.push(req.user.assigned_class_id);
    } else if (class_id) {
      query += ` AND s.class_id = ?`;
      params.push(class_id);
    }
    if (search) {
      query += ` AND (s.name LIKE ? OR s.nisn LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
  }

  query += ` ORDER BY c.level, c.name, s.name ASC`;
  return db.prepare(query).all(...params);
}

// GET /api/cards/export-pdf - Export cards in F4 Landscape (12 cards per page: 6 cols x 2 rows)
router.get('/export-pdf', authenticateToken, async (req, res) => {
  try {
    const students = getStudentsList(req);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data siswa untuk diekspor' });
    }

    // F4 / Folio: 330mm x 215mm = [935.43, 609.45] points
    const doc = new PDFDocument({
      size: [935.43, 609.45],
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      autoFirstPage: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Kartu_Siswa_SDN_Pengampon_3_F4.pdf"');
    doc.pipe(res);

    const cardW = 142; // ~5.0cm
    const cardH = 241; // ~8.5cm
    const startX = 25;
    const startY = 35;
    const gapX = 7.5;
    const gapY = 25;
    const cardsPerPage = 12;

    for (let i = 0; i < students.length; i++) {
      const pageIndex = Math.floor(i / cardsPerPage);
      const indexInPage = i % cardsPerPage;

      if (indexInPage === 0) {
        doc.addPage();
      }

      const row = Math.floor(indexInPage / 6);
      const col = indexInPage % 6;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      const cardBuf = await renderCardImage(students[i]);
      doc.image(cardBuf, x, y, { width: cardW, height: cardH });
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/cards/export-docx - Export cards in F4 Landscape (12 cards per page: 6 cols x 2 rows)
router.get('/export-docx', authenticateToken, async (req, res) => {
  try {
    const students = getStudentsList(req);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data siswa untuk diekspor' });
    }

    const cardsPerPage = 12;
    const totalPages = Math.ceil(students.length / cardsPerPage);
    const sections = [];

    for (let p = 0; p < totalPages; p++) {
      const pageStudents = students.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
      const rows = [];

      // Split into 2 rows of up to 6 cards
      for (let r = 0; r < 2; r++) {
        const rowStudents = pageStudents.slice(r * 6, (r + 1) * 6);
        if (rowStudents.length === 0) break;

        const cells = [];
        for (let c = 0; c < 6; c++) {
          if (c < rowStudents.length) {
            const cardBuf = await renderCardImage(rowStudents[c]);
            cells.push(new TableCell({
              width: { size: 16.66, type: WidthType.PERCENTAGE },
              margins: { top: 30, bottom: 30, left: 25, right: 25 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: cardBuf,
                      transformation: {
                        width: 146,
                        height: 247
                      }
                    })
                  ]
                })
              ]
            }));
          } else {
            // Empty cell to preserve 6-column grid
            cells.push(new TableCell({
              width: { size: 16.66, type: WidthType.PERCENTAGE },
              children: [new Paragraph({})]
            }));
          }
        }

        rows.push(new TableRow({ children: cells }));
      }

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        rows: rows
      });

      sections.push({
        properties: {
          page: {
            size: {
              width: 18711, // F4 / Folio 330mm
              height: 11907, // 210-215mm
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 450,
              bottom: 450,
              left: 450,
              right: 450
            }
          }
        },
        children: [table]
      });
    }

    const doc = new Document({ sections });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="Kartu_Siswa_SDN_Pengampon_3_F4.docx"');
    res.send(buffer);
  } catch (err) {
    console.error('DOCX export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/cards/download-png/:studentId - Download single student card as high-res PNG (or JPEG for Canva/Word)
router.get('/download-png/:studentId', authenticateToken, async (req, res) => {
  try {
    const student = db.prepare(`
      SELECT s.*, c.name as class_name, c.level as class_level
      FROM students s JOIN classes c ON s.class_id = c.id
      WHERE s.id = ? AND s.status = 'active'
    `).get(req.params.studentId);

    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    const cardBuf = await renderCardImage(student);
    const safeName = student.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="Kartu_${safeName}_${student.nisn}.jpg"`);
    res.send(cardBuf);
  } catch (err) {
    console.error('PNG download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/cards/download-png-bulk - Download all filtered cards as individual images in a ZIP
router.get('/download-png-bulk', authenticateToken, async (req, res) => {
  try {
    req.socket.setTimeout(0);
    const students = getStudentsList(req);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data siswa untuk diekspor.' });
    }

    const archiver = require('archiver');
    const archive = archiver.ZipArchive
      ? new archiver.ZipArchive({ zlib: { level: 0 } })
      : (typeof archiver === 'function' ? archiver('zip', { zlib: { level: 0 } }) : new archiver.Archiver({ zlib: { level: 0 } }));

    const className = req.query.class_id
      ? (db.prepare('SELECT name FROM classes WHERE id = ?').get(req.query.class_id)?.name || 'Kelas')
      : 'Semua_Kelas';
    const safeFolderName = className.replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Kartu_Siswa_Gambar_${safeFolderName}_SDN_Pengampon_3.zip"`);

    archive.pipe(res);

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const cardBuf = await renderCardImage(s);
      const safeName = s.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
      const fileName = `${String(i + 1).padStart(3, '0')}_${safeName}_${s.nisn}.jpg`;
      archive.append(cardBuf, { name: `${safeFolderName}/${fileName}` });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Bulk PNG ZIP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;

