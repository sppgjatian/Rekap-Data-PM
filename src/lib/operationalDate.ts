// =====================================================
//  TANGGAL OPERASIONAL SPPG JATIAN
//  Aturan: pergantian album terjadi jam 09:00 WIB
//  - Jepret 09:00-23:59  → album tanggal HARI ITU
//  - Jepret 00:00-08:59  → album tanggal KEMARIN
//    (bahan susulan pagi untuk porsi hari sebelumnya)
// =====================================================

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Date operasional dari waktu jepret */
export function getOperationalDate(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < 9) d.setDate(d.getDate() - 1);
  return d;
}

/** Date → 'YYYY-MM-DD' (format kolom date Supabase & folder Cloudinary) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Kunci album untuk waktu jepret sekarang */
export function operationalDateKey(now: Date = new Date()): string {
  return toDateKey(getOperationalDate(now));
}

/** 'YYYY-MM-DD' → 'Senin, 23 Okt 2026' */
export function formatKeyPretty(key: string): string {
  const [y, m, dd] = key.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  return `${HARI[d.getDay()]}, ${dd} ${BULAN[d.getMonth()]} ${y}`;
}

/** Date → 'Senin, 23 Okt 2026' */
export function formatOperational(d: Date): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Date → '20:15' */
export function formatJam(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Geser kunci tanggal: shiftDateKey('2026-10-23', -1) → '2026-10-22' */
export function shiftDateKey(key: string, delta: number): string {
  const [y, m, dd] = key.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

/** Baris timestamp yang DIBAKAR ke foto (2 baris) */
export function stampLines(now: Date = new Date()): { line1: string; line2: string } {
  return {
    line1: `SPPG JATIAN - BAHAN BAKU`,
    line2: `${formatOperational(getOperationalDate(now))} | Jepret ${formatJam(now)} WIB`,
  };
}
