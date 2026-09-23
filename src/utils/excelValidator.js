import * as XLSX from 'xlsx';

// Header PERSIS sesuai template Excel Anda
const EXPECTED_HEADER_SISWA = [
  'nama_lengkap', 'tanggal_lahir', 'gender', 'nik',
  'type', 'identity_code', 'kategori', 'sub_kategori'
];

const EXPECTED_HEADER_GURU = [
  'nama_lengkap', 'tanggal_lahir',
  'gender', 'nik', 'sub_kategori'
];

const VALID_GENDER = ['L', 'P', 'Laki-laki', 'Perempuan'];
const VALID_SUB_KATEGORI_GURU = [
  'Guru', 'Satpam', 'Tenaga Kependidikan', 'Lainnya'
];

const pad = (n) => String(n).padStart(2, '0');

// Objek Date (dari Excel) -> "DD/MM/YYYY"
const dateToDDMMYYYY = (d) =>
  `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

// Angka serial Excel (mis. 43624) -> "DD/MM/YYYY"
const serialToDDMMYYYY = (serial) => {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return dateToDDMMYYYY(new Date(ms));
};

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // cellDates: true -> sel tanggal Excel dibaca sebagai objek Date, bukan angka serial
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Cari indeks kolom tanggal_lahir dari header (baris 1)
        const header = rows[0] || [];
        const dateCol = header.findIndex(
          (h) => String(h).trim().toLowerCase() === 'tanggal_lahir'
        );

        // Normalisasi: objek Date & angka serial -> teks "DD/MM/YYYY"
        const normalized = rows.map((row) =>
          row.map((cell, cIdx) => {
            if (cell instanceof Date && !isNaN(cell.getTime())) {
              return dateToDDMMYYYY(cell);
            }
            if (
              cIdx === dateCol &&
              typeof cell === 'number' &&
              cell >= 20000 && cell <= 80000
            ) {
              return serialToDDMMYYYY(cell);
            }
            return cell;
          })
        );

        resolve(normalized);
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

  if (!rows || rows.length < 3) {
    return { ok: false, errors: ['File kosong atau tidak berisi data.'], data: [] };
  }

  const headerRaw = rows[0].map(norm);
  const expected = kategori === 'Siswa' ? EXPECTED_HEADER_SISWA : EXPECTED_HEADER_GURU;

  if (headerRaw.length < expected.length) {
    errors.push(`Jumlah kolom header kurang. Diharapkan ${expected.length} kolom, ditemukan ${headerRaw.length}.`);
    return { ok: false, errors, data: [] };
  }

  for (let i = 0; i < expected.length; i++) {
    if (headerRaw[i] !== expected[i]) {
      errors.push(`Header Excel tidak sesuai template resmi. Kolom ke-${i + 1} harus "${expected[i]}", ditemukan "${headerRaw[i] || '(kosong)'}".`);
      break;
    }
  }

  if (errors.length) return { ok: false, errors, data: [] };

  // Baris 2 = petunjuk -> dilewati, data mulai baris 3
  const dataRows = rows.slice(2);
  const valid = [];
  const dateRe = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  const nikRe = /^\d{16}$/;

  dataRows.forEach((row, idx) => {
    const nonEmpty = row.filter((c) => c !== '' && c !== null && c !== undefined).length;
    if (nonEmpty === 0) return;

    const obj = {};
    headerRaw.forEach((h, i) => { obj[h] = row[i]; });
    obj._row = idx + 3;

    if (obj.tanggal_lahir && !dateRe.test(String(obj.tanggal_lahir).trim())) {
      errors.push(`Baris ${obj._row}: Format tanggal_lahir salah. Harus DD/MM/YYYY. Ditemukan: "${obj.tanggal_lahir}"`);
    }
    if (obj.nik && !nikRe.test(String(obj.nik).trim())) {
      errors.push(`Baris ${obj._row}: NIK harus 16 digit angka. Ditemukan: "${obj.nik}"`);
    }
    if (obj.gender && !VALID_GENDER.includes(String(obj.gender).trim())) {
      errors.push(`Baris ${obj._row}: gender tidak valid. Harus "L" atau "P". Ditemukan: "${obj.gender}"`);
    }
    if (kategori === 'Guru' && obj.sub_kategori && !VALID_SUB_KATEGORI_GURU.includes(String(obj.sub_kategori).trim())) {
      errors.push(`Baris ${obj._row}: sub_kategori "${obj.sub_kategori}" tidak dikenal.`);
    }

    valid.push(obj);
  });

  if (valid.length === 0 && errors.length === 0) {
    errors.push('Tidak ada data yang ditemukan setelah baris panduan.');
  }

  return { ok: errors.length === 0, errors, data: valid };
}
