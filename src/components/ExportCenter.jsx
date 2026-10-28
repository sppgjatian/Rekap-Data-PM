import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { supabase } from '../lib/supabase';
import { derivePorsi, deriveJenjang } from '../utils/porsi';

const norm = (s) => String(s || '').trim().toLowerCase();

/* ---------- ambil SEMUA baris (paginasi per 1000) ---------- */
const fetchAll = async (table, columns) => {
  let out = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id')
      .range(from, from + step - 1);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < step) break;
    from += step;
  }
  return out;
};

const JENJANG_GROUPS = {
  'PAUD/TK/RA': ['PAUD', 'TK', 'RA'],
  'SD/MI': ['SD', 'MI'],
  'SMP/MTs': ['SMP', 'MTS'],
  'SMA/SMK/MA/MAK': ['SMA', 'SMK', 'MA', 'MAK'],
  'Guru/Pendukung': ['GURU'],
  'Lainnya (SLB/PKBM/SEM/PES)': ['SLB', 'PKBM', 'SEM', 'PES'],
};

const groupOf = (jenjang) => {
  for (const [g, list] of Object.entries(JENJANG_GROUPS)) {
    if (list.includes(jenjang)) return g;
  }
  return 'Lainnya (SLB/PKBM/SEM/PES)';
};

const safeSheet = (name, used) => {
  let s = String(name).replace(/[\\/*?:[\]]/g, '-').slice(0, 31);
  if (!s) s = 'Sheet';
  let final = s;
  let i = 2;
  while (used[final]) { final = `${s.slice(0, 28)} (${i})`; i++; }
  used[final] = true;
  return final;
};

/* ========== KONFIGURASI TEMPLATE REQUEST DISPENDIK ========== */
const DISPENDIK_TITLE = 'SAMPEL PM SPPG JEMBER PAKUSARI JATIAN';
const NPSN_MAP = {
  'MI PONPES NURURROHMAN': '60715647', 'MTS PONPES NURURROHMAN': '20581524',
  'PONPES MIFTAHUL HASAN': '69950049', 'SDN PAKUSARI 02': '20523670',
  'TK AL-HIKMAH': '20559350', 'TK BINA TUNAS BANGSA': '20559458',
  'PONPES NURURROHMAN': '69745157', 'PONPES HABIBURRAHMAN': '69975761',
  'SPS SEDAP MALAM': '69896780', 'HABIBURRAHMAN': '20581525',
  'TK PGRI BHAKTI LESTARI': '20559672', 'SDN PAKUSARI 01': '20549705',
  'TK AL-HAMID': '69894443', 'SDN JATIAN 03': '20549703',
  'SDN JATIAN 01': '20524721', 'KB MUTIARA HATI': '69777459',
  'PONPES MIFTAHUL HASAN (2)': '69882324', 'TK AL-KHOIRIYAH': '69896765',
  'TK SUAKA ANAK NEGERI': '20559722', 'SDN KERTOSARI 3': '20523615',
  'SDN KERTOSARI 2': '20523600', 'HABIBURRAHMAN (2)': '69894852',
  'PONPES HABIBURRAHMAN (2)': '69745155', 'PONPES NURURROHMAN (2)': '69894851',
};
const ADDRESS_MAP = {};

const JENIS_PREF = ['SPS', 'PAUD', 'RA', 'TK', 'MI', 'SD', 'SMP', 'MTS', 'MA', 'SMK', 'SMA', 'SLB', 'LAIN'];

// Ponpes dengan jenjang dalam kurung → masuk ke jenjangnya, bukan PONDOK
const getJenis = (name) => {
  const n = String(name).toUpperCase().trim();
  const inParen = n.match(/\((MA|MTS|MI|RA|SMP|SD|TK|SMK|SMA|SLB)\)/);
  if (inParen) return inParen[1];
  if (n.startsWith('SPS')) return 'SPS';
  if (n.startsWith('PAUD') || n.startsWith('KB')) return 'PAUD';
  if (n.startsWith('RA')) return 'RA';
  if (n.startsWith('TK')) return 'TK';
  if (n.startsWith('MI')) return 'MI';
  if (n.startsWith('SD')) return 'SD';
  if (n.startsWith('SMP')) return 'SMP';
  if (n.startsWith('MTS')) return 'MTS';
  if (n.startsWith('MA')) return 'MA';
  if (n.startsWith('SMK')) return 'SMK';
  if (n.startsWith('SMA')) return 'SMA';
  if (n.startsWith('SLB')) return 'SLB';
  return 'LAIN';
};

export default function ExportCenter({ onClose }) {
  const [meta, setMeta] = useState([]);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const [source, setSource] = useState('Semua');
  const [schoolScope, setSchoolScope] = useState('all');
  const [picked, setPicked] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [porsiFilter, setPorsiFilter] = useState('SEMUA');
  const [groups, setGroups] = useState([]);
  const [layout, setLayout] = useState('gabungan');
  const [includeInfo, setIncludeInfo] = useState(true);
  const [includeRekap, setIncludeRekap] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [m, d] = await Promise.all([
          fetchAll('submission_metadata', '*'),
          fetchAll('penerima_manfaat_detail', '*'),
        ]);
        setMeta(m);
        setDetails(d);
      } catch (e) {
        setMsg('❌ Gagal memuat data: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metaById = useMemo(() => Object.fromEntries(meta.map((m) => [m.id, m])), [meta]);

  const guruMap = useMemo(() => {
    const map = {};
    meta
      .filter((m) => m.kategori_form === 'Guru')
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .forEach((g) => {
        const k = norm(g.nama_sekolah);
        if (!map[k]) map[k] = g;
      });
    return map;
  }, [meta]);

  const rows = useMemo(() => {
    return details
      .map((d) => {
        const m = metaById[d.submission_id];
        if (!m) return null;
        const jenjang = deriveJenjang(m.kategori_form, d.kategori);
        return {
          sekolah: m.nama_sekolah,
          kategoriForm: m.kategori_form,
          jenjang,
          group: groupOf(jenjang),
          kelasLabel: d.sub_kategori || (m.kategori_form === 'Guru' ? 'Guru/Pendukung' : '-'),
          nama: d.nama_lengkap || '-',
          tgl: d.tanggal_lahir || '-',
          gender: d.gender || '-',
          nik: d.nik || '-',
          type: d.type || '-',
          identity: d.identity_code || '-',
          kategori: d.kategori || (m.kategori_form === 'Guru' ? 'GURU' : '-'),
          subKategori: d.sub_kategori || '-',
          porsi: derivePorsi(m.kategori_form, d.kategori, d.sub_kategori),
          info: m.kategori_form === 'Guru' ? m : (guruMap[norm(m.nama_sekolah)] || null),
        };
      })
      .filter(Boolean);
  }, [details, metaById, guruMap]);

  const schools = useMemo(() => [...new Set(meta.map((m) => m.nama_sekolah))].sort(), [meta]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (source !== 'Semua' && r.kategoriForm !== source) return false;
    if (schoolScope === 'picked' && !picked.includes(r.sekolah)) return false;
    if (porsiFilter !== 'SEMUA' && r.porsi !== porsiFilter) return false;
    if (groups.length > 0 && !groups.includes(r.group)) return false;
    return true;
  }), [rows, source, schoolScope, picked, porsiFilter, groups]);

  const countKecil = filtered.filter((r) => r.porsi === 'KECIL').length;
  const countBesar = filtered.filter((r) => r.porsi === 'BESAR').length;

  const header = () => {
    const h = ['No', 'Nama Sekolah', 'Jenjang', 'Kelas / Sub', 'Nama Lengkap', 'Tanggal Lahir', 'Gender', 'NIK', 'Type', 'Identity Code', 'Kategori', 'Sub Kategori', 'Keterangan Porsi'];
    if (includeInfo) h.push('Tingkat Sekolah', 'Kode Identitas', 'Kepala Sekolah', 'No. Telepon');
    return h;
  };

  const toRow = (r, i) => {
    const base = [i + 1, r.sekolah, r.jenjang, r.kelasLabel, r.nama, r.tgl, r.gender, r.nik, r.type, r.identity, r.kategori, r.subKategori, r.porsi === 'KECIL' ? 'PORSI KECIL' : 'PORSI BESAR'];
    if (includeInfo) {
      const inf = r.info || {};
      base.push(inf.tingkat_sekolah || '-', inf.kode_identitas || '-', inf.nama_kepsek || '-', inf.no_telepon || '-');
    }
    return base;
  };

  const rekapAoa = () => {
    const bySchool = {};
    filtered.forEach((r) => {
      if (!bySchool[r.sekolah]) bySchool[r.sekolah] = { kecil: 0, besar: 0 };
      bySchool[r.sekolah][r.porsi === 'KECIL' ? 'kecil' : 'besar']++;
    });
    const aoa = [['Nama Sekolah', 'Porsi Kecil', 'Porsi Besar', 'Total']];
    Object.keys(bySchool).sort().forEach((s) => {
      aoa.push([s, bySchool[s].kecil, bySchool[s].besar, bySchool[s].kecil + bySchool[s].besar]);
    });
    aoa.push(['TOTAL KESELURUHAN', countKecil, countBesar, countKecil + countBesar]);
    return aoa;
  };

  const doExport = () => {
    if (filtered.length === 0) { setMsg('❌ Tidak ada data sesuai filter.'); return; }
    const wb = XLSX.utils.book_new();
    const used = {};
    const addSheet = (name, aoa) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = header().map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, ws, safeSheet(name, used));
    };

    if (layout === 'gabungan') {
      addSheet('GABUNGAN', [header(), ...filtered.map(toRow)]);
    } else if (layout === 'per-sekolah') {
      [...new Set(filtered.map((r) => r.sekolah))].sort().forEach((s) => {
        addSheet(s, [header(), ...filtered.filter((r) => r.sekolah === s).map(toRow)]);
      });
    } else if (layout === 'per-porsi') {
      ['KECIL', 'BESAR'].forEach((p) => {
        const rs = filtered.filter((r) => r.porsi === p);
        if (rs.length) addSheet(`PORSI ${p}`, [header(), ...rs.map(toRow)]);
      });
    } else if (layout === 'per-kelas') {
      [...new Set(filtered.map((r) => `${r.jenjang} - ${r.kelasLabel}`))].sort().forEach((k) => {
        addSheet(k, [header(), ...filtered.filter((r) => `${r.jenjang} - ${r.kelasLabel}` === k).map(toRow)]);
      });
    }

    if (includeRekap) {
      const ws = XLSX.utils.aoa_to_sheet(rekapAoa());
      ws['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, safeSheet('REKAP', used));
    }

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `MBG_Export_${layout}_${stamp}.xlsx`);
    setMsg(`✅ Export berhasil: ${filtered.length} baris (🥣 ${countKecil} kecil, 🍛 ${countBesar} besar).`);
  };

  /* ========== EXPORT TEMPLATE REQUEST DISPENDIK ========== */
  const exportDispendik = () => {
    if (filtered.length === 0) { setMsg('❌ Tidak ada data untuk template Dispendik.'); return; }

    const bySchool = {};
    filtered.forEach((r) => {
      if (!bySchool[r.sekolah]) bySchool[r.sekolah] = { kecil: 0, besar: 0, guru: 0 };
      if (r.kategoriForm === 'Guru') bySchool[r.sekolah].guru++;
      else if (r.porsi === 'KECIL') bySchool[r.sekolah].kecil++;
      else bySchool[r.sekolah].besar++;
    });

    const groupsMap = {};
    Object.keys(bySchool).forEach((s) => {
      const j = getJenis(s);
      (groupsMap[j] = groupsMap[j] || []).push(s);
    });
    const jenisList = [
      ...JENIS_PREF.filter((j) => groupsMap[j]),
      ...Object.keys(groupsMap).filter((j) => !JENIS_PREF.includes(j)),
    ];

    const aoa = [[DISPENDIK_TITLE], [], ['JENIS', 'NO', 'NAMA', 'ALAMAT', 'NPSN', 'SISWA/SANTRI', 'GURU', 'TOTAL']];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    let rowIdx = 3;
    let no = 1;
    let sumSiswa = 0, sumGuru = 0;
    const groupTotals = {};

    jenisList.forEach((j) => {
      const schools = groupsMap[j].sort();
      const startRow = rowIdx;
      let gTot = 0;
      schools.forEach((s) => {
        const d = bySchool[s];
        const siswa = d.kecil + d.besar;
        if (j === 'MI' || j === 'SD') {
          aoa.push([null, null, s, ADDRESS_MAP[s] || '', NPSN_MAP[s] || '', null, null, null]);
          rowIdx++;
          aoa.push([null, no, 'KELAS 1-3', '', '', d.kecil, d.guru, null]);
          rowIdx++;
          aoa.push([null, null, 'KELAS 4-6', '', '', d.besar, 0, null]);
          rowIdx++;
          gTot += d.kecil + d.guru + d.besar;
        } else {
          aoa.push([null, no, s, ADDRESS_MAP[s] || '', NPSN_MAP[s] || '', siswa, d.guru, null]);
          rowIdx++;
          gTot += siswa + d.guru;
        }
        sumSiswa += siswa;
        sumGuru += d.guru;
        no++;
      });
      const endRow = rowIdx - 1;
      aoa[startRow][0] = j;
      aoa[startRow][7] = gTot;
      groupTotals[j] = gTot;
      if (endRow > startRow) {
        merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
        merges.push({ s: { r: startRow, c: 7 }, e: { r: endRow, c: 7 } });
      }
    });

    const grand = sumSiswa + sumGuru;
    aoa.push([null, null, 'TOTAL', null, null, sumSiswa, sumGuru, grand]);

    const g = (keys) => keys.reduce((a, k) => a + (groupTotals[k] || 0), 0);
    aoa.push([], ['RINGKAS:'], []);
    aoa.push(['Kelompok Penerima Manfaat', 'Satuan Pendidikan/Posyandu/Lokasi', 'Jumlah']);
    aoa.push(['PAUD/TK/RA', 'Satuan Pendidikan', g(['SPS', 'PAUD', 'RA', 'TK'])]);
    aoa.push(['SD/MI', 'Satuan Pendidikan', g(['SD', 'MI'])]);
    aoa.push(['SMP/MTS', 'Satuan Pendidikan', g(['SMP', 'MTS'])]);
    aoa.push(['SMA/SMK/MA', 'Satuan Pendidikan', g(['SMA', 'SMK', 'MA'])]);
    aoa.push(['Sekolah Luar Biasa', 'Satuan Pendidikan', g(['SLB'])]);
    aoa.push(['Ibu Hamil', 'Posyandu', 0]);
    aoa.push(['Ibu Menyusui', 'Posyandu', 0]);
    aoa.push(['Balita', 'Posyandu', 0]);
    aoa.push(['Kelompok Lain Sesuai Ketentuan', '', g(['LAIN'])]);
    const ringkasTotalRow = aoa.length;
    aoa.push(['Jumlah Penerima Manfaat', '', grand]);
    merges.push({ s: { r: ringkasTotalRow, c: 0 }, e: { r: ringkasTotalRow, c: 1 } });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 10 }, { wch: 5 }, { wch: 38 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'SAMPEL PM');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Template_Request_Dispendik_${stamp}.xlsx`);
    setMsg(`✅ Template Request Dispendik berhasil diunduh (${no - 1} satuan, total ${grand} penerima).`);
  };
  /* ========== REKAP JUMLAH P/L PER KELAS (BERGAYA) ========== */
  const exportGenderPerKelas = () => {
    if (filtered.length === 0) { setMsg('❌ Tidak ada data untuk rekap P/L.'); return; }

    const bySchool = {};
    filtered.forEach((r) => {
      const kelas = r.kelasLabel || '-';
      if (!bySchool[r.sekolah]) bySchool[r.sekolah] = {};
      if (!bySchool[r.sekolah][kelas]) bySchool[r.sekolah][kelas] = { jenjang: r.jenjang, p: 0, l: 0 };
      const g = String(r.gender).toUpperCase();
      if (g === 'P') bySchool[r.sekolah][kelas].p++;
      else if (g === 'L') bySchool[r.sekolah][kelas].l++;
    });

    const BORDER = {
      top: { style: 'thin', color: { rgb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
      left: { style: 'thin', color: { rgb: 'BFBFBF' } },
      right: { style: 'thin', color: { rgb: 'BFBFBF' } },
    };
    const S_TITLE = { font: { bold: true, sz: 14, color: { rgb: '1B5E20' } }, alignment: { horizontal: 'center', vertical: 'center' } };
    const S_HEADER = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C00000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER };
    const S_DATA = { alignment: { vertical: 'center' }, border: BORDER };
    const S_DATA_C = { alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
    const S_SUB = { font: { bold: true, color: { rgb: '9C0006' } }, fill: { fgColor: { rgb: 'FFC7CE' } }, alignment: { vertical: 'center' }, border: BORDER };
    const S_SUB_C = { font: { bold: true, color: { rgb: '9C0006' } }, fill: { fgColor: { rgb: 'FFC7CE' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
    const S_GRAND = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C00000' } }, alignment: { vertical: 'center' }, border: BORDER };
    const S_GRAND_C = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C00000' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };

    const aoa = [];
    const types = [];
    const push = (cells, type) => { aoa.push(cells); types.push(type); };

    push(['REKAP JUMLAH SISWA P & L PER KELAS - SPPG JATIAN PAKUSARI'], 'title');
    push([], 'blank');
    push(['Nama Sekolah', 'Jenjang', 'Kelas / Sub', 'Jumlah P', 'Jumlah L', 'Total'], 'header');

    let TP = 0, TL = 0;
    Object.keys(bySchool).sort((a, b) => a.localeCompare(b, 'id')).forEach((school) => {
      const classes = bySchool[school];
      const classKeys = Object.keys(classes).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
      let sp = 0, sl = 0;
      classKeys.forEach((k) => {
        const x = classes[k];
        push([school, x.jenjang, k, x.p, x.l, x.p + x.l], 'data');
        sp += x.p; sl += x.l;
      });
      push([`Subtotal ${school}`, '', '', sp, sl, sp + sl], 'sub');
      TP += sp; TL += sl;
      push([], 'blank'); // jarak pemisah antar sekolah
    });
    push(['TOTAL KESELURUHAN', '', '', TP, TL, TP + TL], 'grand');

    const wb = XLSXStyle.utils.book_new();
    const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 8 }];
    ws['!rows'] = types.map((t) => (t === 'title' ? { hpt: 26 } : t === 'header' ? { hpt: 22 } : t === 'blank' ? { hpt: 8 } : { hpt: 18 }));

    const styleFor = (type, c) => {
      if (type === 'title') return S_TITLE;
      if (type === 'header') return S_HEADER;
      if (type === 'sub') return c >= 3 ? S_SUB_C : S_SUB;
      if (type === 'grand') return c >= 3 ? S_GRAND_C : S_GRAND;
      if (type === 'data') return c >= 3 ? S_DATA_C : S_DATA;
      return null;
    };
    types.forEach((type, r) => {
      if (type === 'blank') return;
      for (let c = 0; c < 6; c++) {
        const addr = XLSXStyle.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = styleFor(type, c);
      }
    });

    XLSXStyle.utils.book_append_sheet(wb, ws, 'REKAP P-L PER KELAS');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSXStyle.writeFile(wb, `Rekap_PL_per_Kelas_${stamp}.xlsx`);
    setMsg('✅ Rekap P/L per kelas (bergaya) berhasil diunduh.');
  };

  const filteredMeta = meta.filter((m) => {
    if (source !== 'Semua' && m.kategori_form !== source) return false;
    if (schoolScope === 'picked' && !picked.includes(m.nama_sekolah)) return false;
    return true;
  });

  const shownSchools = schools.filter((s) => s.toLowerCase().includes(schoolSearch.toLowerCase()));
  const btn = (active) => `px-4 py-2 rounded-lg text-sm font-medium border transition ${active ? 'bg-[#2E7D32] text-white border-[#2E7D32]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 animate-slide-up">
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-[#1B5E20]">📤 Export Center</h3>
              <p className="text-sm text-gray-500">Pilih lingkup, filter porsi/jenjang, dan layout sheet sesuai kebutuhan dapur.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {loading ? <p className="text-sm text-gray-500">Memuat data...</p> : (
            <>
              <div>
                <p className="text-sm font-semibold text-[#1B5E20] mb-2">1️⃣ Sumber Data</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSource('Semua')} className={btn(source === 'Semua')}>🌐 Semua (Siswa + Guru)</button>
                  <button onClick={() => setSource('Siswa')} className={btn(source === 'Siswa')}>📘 Siswa</button>
                  <button onClick={() => setSource('Guru')} className={btn(source === 'Guru')}>📕 Guru & Pendukung</button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1B5E20] mb-2">2️⃣ Lingkup Sekolah</p>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setSchoolScope('all')} className={btn(schoolScope === 'all')}>Semua Sekolah ({schools.length})</button>
                  <button onClick={() => setSchoolScope('picked')} className={btn(schoolScope === 'picked')}>Pilih Sekolah ({picked.length})</button>
                </div>
                {schoolScope === 'picked' && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <input value={schoolSearch} onChange={(e)=>setSchoolSearch(e.target.value)} placeholder="Cari sekolah..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2" />
                    <div className="flex gap-3 mb-2">
                      <button onClick={() => setPicked([...new Set([...picked, ...shownSchools])])} className="text-xs text-[#2E7D32] underline">Pilih semua hasil pencarian</button>
                      <button onClick={() => setPicked([])} className="text-xs text-red-600 underline">Kosongkan</button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {shownSchools.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={picked.includes(s)} onChange={(e) => setPicked(e.target.checked ? [...picked, s] : picked.filter((p) => p !== s))} />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#1B5E20] mb-2">3️⃣ Filter Porsi</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPorsiFilter('SEMUA')} className={btn(porsiFilter === 'SEMUA')}>Semua</button>
                    <button onClick={() => setPorsiFilter('KECIL')} className={btn(porsiFilter === 'KECIL')}>🥣 Kecil</button>
                    <button onClick={() => setPorsiFilter('BESAR')} className={btn(porsiFilter === 'BESAR')}>🍛 Besar</button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1B5E20] mb-2">4️⃣ Filter Jenjang (kosong = semua)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(JENJANG_GROUPS).map((g) => (
                      <label key={g} className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1 cursor-pointer">
                        <input type="checkbox" checked={groups.includes(g)} onChange={(e) => setGroups(e.target.checked ? [...groups, g] : groups.filter((x) => x !== g))} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1B5E20] mb-2">5️⃣ Layout Sheet Excel</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {[
                    ['gabungan', '📄 1 sheet gabungan (semua baris)'],
                    ['per-sekolah', '🏫 1 sheet per sekolah (dalam 1 file)'],
                    ['per-porsi', '🍱 Sheet terpisah PORSI KECIL & PORSI BESAR'],
                    ['per-kelas', '🎓 1 sheet per jenjang-kelas (SD-Kelas 1, dst)'],
                  ].map(([v, label]) => (
                    <label key={v} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${layout === v ? 'border-[#2E7D32] bg-[#E8F5E9]' : 'border-gray-200'}`}>
                      <input type="radio" name="layout" checked={layout === v} onChange={() => setLayout(v)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeInfo} onChange={(e)=>setIncludeInfo(e.target.checked)} />
                  Sertakan info sekolah (tingkat, kode identitas, kepsek, telepon)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeRekap} onChange={(e)=>setIncludeRekap(e.target.checked)} />
                  Sertakan sheet REKAP (jumlah kecil/besar per sekolah)
                </label>
              </div>

              <div className="bg-[#F1F8E9] border border-[#4CAF50]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#1B5E20]">
                  Siap diekspor: <b>{filtered.length} baris</b> · 🥣 Kecil: <b>{countKecil}</b> · 🍛 Besar: <b>{countBesar}</b>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={doExport} className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-6 py-3 rounded-lg font-bold transition shadow-md">
                    📤 EXPORT EXCEL
                  </button>
                  <button onClick={exportDispendik} className="bg-[#7B1FA2] hover:bg-[#4A148C] text-white px-6 py-3 rounded-lg font-bold transition shadow-md">
                    📋 Template Request Dispendik
                  </button>
                                    <button onClick={exportGenderPerKelas} className="bg-[#0288D1] hover:bg-[#01579B] text-white px-6 py-3 rounded-lg font-bold transition shadow-md">
                    👥 Rekap P/L per Kelas
                  </button>
                </div>
              </div>
              {msg && <p className="text-sm font-medium text-[#1B5E20]">{msg}</p>}

              <div>
                <p className="text-sm font-semibold text-[#1B5E20] mb-2">📦 File Asli Pengiriman (sesuai lingkup)</p>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredMeta.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{m.nama_sekolah} <span className="text-xs text-gray-400">({m.kategori_form})</span></span>
                      {m.file_url && <a href={m.file_url} target="_blank" rel="noreferrer" download className="text-xs bg-[#2E7D32] text-white px-2 py-1 rounded">📥 Unduh</a>}
                    </div>
                  ))}
                  {filteredMeta.length === 0 && <p className="p-3 text-sm text-gray-400">Tidak ada file.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
