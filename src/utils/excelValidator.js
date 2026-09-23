import * as XLSX from 'xlsx';

// Header PERSIS sesuai template Excel Anda
const EXPECTED_HEADER_SISWA = [
  'nama_lengkap', 'tanggal_lahir', 'gender', 'nik',
  'type', 'identity_code', 'kategori', 'sub_kategori'
];

const EXPECTED_HEADER_GURU = [
  'nama sekolah', 'nama_lengkap', 'tanggal_lahir',
  'gender', 'nik', 'sub_kategori'
];

const VALID_GENDER = ['L', 'P', 'Laki-laki', 'Perempuan'];
const VALID_SUB_KATEGORI_GURU = [
  'Kepala Sekolah', 'Guru Mapel', 'Guru Kelas', 'Guru BK',
  'Tenaga Kependidikan', 'Petugas Kebersihan', 'Petugas Keamanan',
  'Petugas Penyaji Makanan', 'Pendamping'
];

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // header: 1 → baca sebagai array baris
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        resolve(rows);
      } catch (err) {
        reject('File Excel tidak dapat dibaca: ' + err.message);
      }
    };
    reader.onerror = () => reject('Gagal membaca file');
    reader.readAsArrayBuffer(file);
  });
}

const norm = (s) => String(s ?? '').trim().toLowerCase();

export function validateExcel(rows, kategori) {
  const errors = [];

  // Cek file tidak kosong (minimal: header + baris panduan + 1 data)
  if (!rows || rows.length < 3) {
    return { ok: false, errors: ['File kosong atau tidak berisi data.'], data: [] };
  }

  // ===== 1. VALIDASI HEADER (Baris 1) =====
  const headerRaw = rows[0].map(norm);
  const expected = kategori === 'Siswa' ? EXPECTED_HEADER_SISWA : EXPECTED_HEADER_GURU;

  // Cek jumlah kolom
  if (headerRaw.length < expected.length) {
    errors.push(
      `Jumlah kolom header kurang. Diharapkan ${expected.length} kolom, ditemukan ${headerRaw.length}.`
    );
    return { ok: false, errors, data: [] };
  }

  // Cek urutan & nama kolom satu per satu
  for (let i = 0; i < expected.length; i++) {
    if (headerRaw[i] !== expected[i]) {
      errors.push(
        `Header Excel tidak sesuai template resmi. Kolom ke-${i + 1} harus "${expected[i]}", ditemukan "${headerRaw[i] || '(kosong)'}".`
      );
      break; // cukup error pertama agar pesan jelas
    }
  }

  if (errors.length) return { ok: false, errors, data: [] };

  // ===== 2. SKIP BARIS 2 (PANDUAN) =====
  // Baris index 1 adalah instruksi kuning → kita lewati
  const dataRows = rows.slice(2); // mulai dari index 2 (baris ke-3)

  const valid = [];
  const dateRe = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  const nikRe = /^\d{16}$/;

  dataRows.forEach((row, idx) => {
    // Skip baris kosong total
    const nonEmpty = row.filter((c) => c !== '' && c !== null && c !== undefined).length;
    if (nonEmpty === 0) return;

    // Mapping ke object berdasarkan header
    const obj = {};
    headerRaw.forEach((h, i) => { obj[h] = row[i]; });
    obj._row = idx + 3; // nomor baris asli di Excel (1-indexed)

    // ===== 3. VALIDASI FORMAT DATA =====

    // Tanggal lahir: DD/MM/YYYY
    if (obj.tanggal_lahir && !dateRe.test(String(obj.tanggal_lahir).trim())) {
      errors.push(`Baris ${obj._row}: Format tanggal_lahir salah. Harus DD/MM/YYYY (contoh: 01/01/2000). Ditemukan: "${obj.tanggal_lahir}"`);
    }

    // NIK: 16 digit angka
    if (obj.nik && !nikRe.test(String(obj.nik).trim())) {
      errors.push(`Baris ${obj._row}: NIK harus 16 digit angka. Ditemukan: "${obj.nik}" (${String(obj.nik).length} digit)`);
    }

    // Gender: L / P
    if (obj.gender && !VALID_GENDER.includes(String(obj.gender).trim())) {
      errors.push(`Baris ${obj._row}: gender tidak valid. Harus "L" atau "P". Ditemukan: "${obj.gender}"`);
    }

    // Sub kategori (hanya untuk guru)
    if (kategori === 'Guru' && obj.sub_kategori && !VALID_SUB_KATEGORI_GURU.includes(String(obj.sub_kategori).trim())) {
      errors.push(`Baris ${obj._row}: sub_kategori "${obj.sub_kategori}" tidak dikenal. Pilih dari dropdown template.`);
    }

    valid.push(obj);
  });

  if (valid.length === 0 && errors.length === 0) {
    errors.push('Tidak ada data yang ditemukan setelah baris panduan.');
  }

  return { ok: errors.length === 0, errors, data: valid };
}