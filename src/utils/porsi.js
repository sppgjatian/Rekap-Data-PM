// Ambil angka kelas dari sub_kategori ("Kelas 3" / "SD - Kelas 3" -> 3)
export const parseKelas = (sub) => {
  const m = String(sub || '').match(/kelas\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
};

export const deriveJenjang = (kategoriForm, kategori) => {
  if (kategoriForm === 'Guru') return 'GURU';
  return String(kategori || '').trim().toUpperCase();
};

// Porsi default untuk penerima TANPA kelas (SLB/PKBM/SEM/PES/Santri)
// Ubah ke 'KECIL' jika aturan Anda berbeda
export const PORSI_TANPA_KELAS = 'BESAR';

export const derivePorsi = (kategoriForm, kategori, subKategori) => {
  if (kategoriForm === 'Guru') return 'BESAR';
  const k = deriveJenjang(kategoriForm, kategori);
  if (['PAUD', 'TK', 'RA'].includes(k)) return 'KECIL';
  const kelas = parseKelas(subKategori);
  if (kelas !== null) return kelas <= 3 ? 'KECIL' : 'BESAR';
  return PORSI_TANPA_KELAS;
};
