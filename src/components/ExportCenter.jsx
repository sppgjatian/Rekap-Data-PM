import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
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
                <button onClick={doExport} className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-6 py-3 rounded-lg font-bold transition shadow-md">
                  📤 EXPORT EXCEL
                </button>
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
