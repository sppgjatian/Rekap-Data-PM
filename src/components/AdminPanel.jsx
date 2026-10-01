import { useState } from 'react';
import { supabase } from '../lib/supabase';
import ExportCenter from './ExportCenter';
import { derivePorsi } from '../utils/porsi';

const InfoBlock = ({ info }) => (
  <div className="text-xs text-gray-600 space-y-0.5">
    <p>🏫 {info.tingkat_sekolah || '-'}</p>
    <p>🆔 {info.tipe_identitas || '-'}: <b>{info.kode_identitas || '-'}</b></p>
    <p>👤 Kepsek: {info.nama_kepsek || '-'}</p>
    <p>📞 {info.no_telepon || '-'}</p>
  </div>
);

/* ---------- bantuan gambar kotak membulat untuk canvas ---------- */
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

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

export default function AdminPanel({ onClose }) {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Siswa');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const loadData = async (kategori) => {
    setLoading(true);
    const { data } = await supabase
      .from('submission_metadata')
      .select('*')
      .eq('kategori_form', kategori)
      .order('submitted_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error } = await supabase.rpc('verify_admin_pin', { input_pin: pin });
      if (error) throw error;
      if (data === true) {
        setAuthenticated(true);
        loadData(tab);
      } else {
        setError('❌ PIN salah!');
      }
    } catch (err) {
      setError('Gagal memverifikasi PIN: ' + err.message);
    }
  };

  const handleTabChange = (t) => {
    setTab(t);
    loadData(t);
  };

  const openDetail = async (row) => {
    setSelected(row);
    setDetailOpen(true);
    setLoadingDetail(true);
    setDetailRows([]);
    const { data } = await supabase
      .from('penerima_manfaat_detail')
      .select('*')
      .eq('submission_id', row.id)
      .order('row_index');
    setDetailRows(data || []);
    setLoadingDetail(false);
  };

  const openEdit = (row) => {
    setEditForm({ ...row });
    setEditError('');
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const { data, error } = await supabase.rpc('admin_update_submission', {
        p_pin_admin: pin,
        p_id: editForm.id,
        p_nama_sekolah: editForm.nama_sekolah,
        p_status_validasi: editForm.status_validasi,
        p_tingkat_sekolah: editForm.tingkat_sekolah || null,
        p_tipe_identitas: editForm.tipe_identitas || null,
        p_kode_identitas: editForm.kode_identitas || null,
        p_nama_kepsek: editForm.nama_kepsek || null,
        p_no_telepon: editForm.no_telepon || null,
        p_pin: editForm.pin,
      });
      if (error) throw error;
      if (data === true) {
        setEditOpen(false);
        setActionMsg('✅ Data berhasil diperbarui.');
        loadData(tab);
      } else {
        setEditError('❌ PIN admin tidak valid atau data tidak ditemukan.');
      }
    } catch (err) {
      setEditError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    const ok = window.confirm(
      `HAPUS data "${row.nama_sekolah}" (${row.kategori_form})?\nFile Excel akan DIPINDAH ke bucket "sampah" (bisa dipulihkan).\nData di database akan dihapus.`
    );
    if (!ok) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-submission', {
        body: { id: row.id, pin },
      });
      if (error) throw error;
      if (data && data.ok === true) {
        setActionMsg(`🗑️ Data dihapus dari database.${data.moved ? ' File Excel dipindahkan ke bucket "sampah".' : ' File tidak ditemukan di storage (data tetap terhapus).'}`);
        loadData(tab);
      } else {
        setActionMsg('❌ Gagal menghapus: ' + (data?.error || 'penyebab tidak diketahui'));
      }
    } catch (err) {
      setActionMsg('❌ Gagal menghapus: ' + err.message);
    }
  };

  /* ---------- RINGKASAN PM ---------- */
  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const [m, d] = await Promise.all([
        fetchAll('submission_metadata', 'id, nama_sekolah, kategori_form'),
        fetchAll('penerima_manfaat_detail', 'submission_id, kategori, sub_kategori'),
      ]);
      const metaById = {};
      m.forEach((x) => { metaById[x.id] = x; });
      const bySchool = {};
      d.forEach((row) => {
        const meta = metaById[row.submission_id];
        if (!meta) return;
        if (!bySchool[meta.nama_sekolah]) bySchool[meta.nama_sekolah] = { besar: 0, kecil: 0 };
        const porsi = derivePorsi(meta.kategori_form, row.kategori, row.sub_kategori);
        bySchool[meta.nama_sekolah][porsi === 'KECIL' ? 'kecil' : 'besar']++;
      });
      setSummaryData(
        Object.entries(bySchool)
          .map(([sekolah, v]) => ({ sekolah, besar: v.besar, kecil: v.kecil, total: v.besar + v.kecil }))
          .sort((a, b) => a.sekolah.localeCompare(b.sekolah))
      );
    } catch (err) {
      setActionMsg('❌ Gagal memuat ringkasan: ' + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const toggleSummary = () => {
    const next = !showSummary;
    setShowSummary(next);
    if (next && !summaryData) loadSummary();
  };

  /* ---------- EXPORT GAMBAR (PNG) RINGKASAN PM ---------- */
  const exportSummaryImage = () => {
    if (!summaryData || summaryData.length === 0) {
      setActionMsg('❌ Tidak ada data ringkasan untuk diekspor.');
      return;
    }
    const pad = 24;
    const width = 920;
    const rowH = 34;
    const headH = 40;
    const titleBlock = 70;
    const cardsBlock = 96;
    const footerBlock = 44;
    const n = summaryData.length;
    const height = pad * 2 + titleBlock + cardsBlock + headH + rowH * (n + 1) + footerBlock;

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const totalKecil = summaryData.reduce((a, r) => a + r.kecil, 0);
    const totalBesar = summaryData.reduce((a, r) => a + r.besar, 0);

    ctx.fillStyle = '#F1F8E9';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Ringkasan PM - Data Penerima Manfaat', pad, pad + 26);
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Arial';
    ctx.fillText(
      `Dicetak: ${new Date().toLocaleString('id-ID')}  ·  Kecil: PAUD/TK/RA & kelas 1-3  ·  Besar: kelas 4-13, guru & pendukung`,
      pad, pad + 50
    );

    let y = pad + titleBlock;
    const cardW = (width - pad * 2 - 36) / 4;
    const cards = [
      ['Sekolah', String(n), '#1B5E20'],
      ['Porsi Kecil', String(totalKecil), '#0369A1'],
      ['Porsi Besar', String(totalBesar), '#C2410C'],
      ['Total Porsi', String(totalKecil + totalBesar), '#B45309'],
    ];
    cards.forEach((c, i) => {
      const x = pad + i * (cardW + 12);
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, x, y, cardW, 76, 10);
      ctx.fill();
      ctx.strokeStyle = '#C8E6C9';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px Arial';
      ctx.fillText(c[0], x + 12, y + 26);
      ctx.fillStyle = c[2];
      ctx.font = 'bold 26px Arial';
      ctx.fillText(c[1], x + 12, y + 58);
    });
    y += cardsBlock;

    const colName = pad;
    const colBesar = pad + 452;
    const colKecil = pad + 592;
    const colTotal = pad + 732;
    const innerW = width - pad * 2;
    const center = (text, cx, yy, font, color) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, yy);
      ctx.textAlign = 'left';
    };

    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(pad, y, innerW, headH);
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#1B5E20';
    ctx.fillText('NAMA SEKOLAH', colName + 10, y + 25);
    center('PORSI BESAR', colBesar + 70, y + 25, 'bold 13px Arial', '#1B5E20');
    center('PORSI KECIL', colKecil + 70, y + 25, 'bold 13px Arial', '#1B5E20');
    center('TOTAL PORSI', colTotal + 70, y + 25, 'bold 13px Arial', '#1B5E20');
    y += headH;

    summaryData.forEach((r, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F4FAEC';
      ctx.fillRect(pad, y, innerW, rowH);
      ctx.strokeStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.moveTo(pad, y + rowH);
      ctx.lineTo(width - pad, y + rowH);
      ctx.stroke();
      ctx.font = '13px Arial';
      ctx.fillStyle = '#111827';
      ctx.fillText(r.sekolah, colName + 10, y + 22);
      center(String(r.besar), colBesar + 70, y + 22, 'bold 13px Arial', '#C2410C');
      center(String(r.kecil), colKecil + 70, y + 22, 'bold 13px Arial', '#0369A1');
      center(String(r.total), colTotal + 70, y + 22, 'bold 13px Arial', '#111827');
      y += rowH;
    });

    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(pad, y, innerW, rowH);
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#1B5E20';
    ctx.fillText('TOTAL KESELURUHAN', colName + 10, y + 22);
    center(String(totalBesar), colBesar + 70, y + 22, 'bold 13px Arial', '#C2410C');
    center(String(totalKecil), colKecil + 70, y + 22, 'bold 13px Arial', '#0369A1');
    center(String(totalKecil + totalBesar), colTotal + 70, y + 22, 'bold 13px Arial', '#1B5E20');
    y += rowH;

    ctx.fillStyle = '#6B7280';
    ctx.font = '11px Arial';
    ctx.fillText('Sumber: Portal MBG SPPG Jatian Pakusari', pad, y + 26);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ringkasan_PM_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const filtered = rows.filter(r => {
    const s = search.toLowerCase();
    return (
      r.nama_sekolah?.toLowerCase().includes(s) ||
      r.nama_kepsek?.toLowerCase().includes(s) ||
      r.kode_identitas?.toLowerCase().includes(s) ||
      r.status_validasi?.toLowerCase().includes(s)
    );
  });

  /* ---------- LOGIN ---------- */
  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6 animate-slide-up">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-[#F9A825] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-[#1B5E20]">Akses Admin</h2>
            <p className="text-xs text-gray-500">Masukkan PIN Super User</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              required
              value={pin}
              onChange={(e)=>setPin(e.target.value)}
              placeholder="PIN Admin"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:ring-2 focus:ring-[#F9A825] outline-none"
            />
            {error && <div className="p-2 bg-red-50 text-red-800 rounded text-sm text-center">{error}</div>}
            <button type="submit" className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-lg transition">
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- PANEL ADMIN ---------- */
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl mx-4 my-8 bg-white rounded-2xl shadow-2xl animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition z-10">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1B5E20]">🔐 Panel Admin — Super User</h2>
              <p className="text-sm text-gray-500">Akses penuh: lihat, download, edit, dan hapus data</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleSummary} className="bg-[#7B1FA2] hover:bg-[#4A148C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md">
                📊 Ringkasan PM
              </button>
              <button onClick={() => setShowExport(true)} className="bg-[#1976D2] hover:bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md">
                📤 Export Center
              </button>
              <span className="bg-[#F9A825] text-[#1B5E20] px-3 py-1 rounded-full text-xs font-bold">ADMIN MODE</span>
            </div>
          </div>

          {/* ---------- RINGKASAN PM (📊) ---------- */}
          {showSummary && (
            <div className="mb-6 bg-[#F1F8E9] border-2 border-[#4CAF50]/30 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#1B5E20]">📊 Ringkasan PM — Data Penerima Manfaat</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportSummaryImage()} className="text-xs bg-[#7B1FA2] hover:bg-[#4A148C] text-white px-3 py-1.5 rounded-lg font-semibold transition">
                    🖼️ Export Gambar
                  </button>
                  <button onClick={() => loadSummary()} className="text-xs text-[#2E7D32] underline">🔄 Muat ulang</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                🥣 Kecil: PAUD/TK/RA & kelas 1–3 · 🍛 Besar: kelas 4–13, guru & pendukung · Hanya tampilan (tidak bisa diedit).
              </p>
              {loadingSummary && <p className="text-sm text-gray-500">Memuat ringkasan...</p>}
              {!loadingSummary && summaryData && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center border border-[#4CAF50]/30">
                      <p className="text-xs text-gray-500">Sekolah</p>
                      <p className="text-xl font-bold text-[#1B5E20]">{summaryData.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-sky-200">
                      <p className="text-xs text-gray-500">🥣 Porsi Kecil</p>
                      <p className="text-xl font-bold text-sky-700">{summaryData.reduce((a, r) => a + r.kecil, 0)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-orange-200">
                      <p className="text-xs text-gray-500">🍛 Porsi Besar</p>
                      <p className="text-xl font-bold text-orange-700">{summaryData.reduce((a, r) => a + r.besar, 0)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-[#F9A825]/40">
                      <p className="text-xs text-gray-500">Total Porsi</p>
                      <p className="text-xl font-bold text-[#E65100]">{summaryData.reduce((a, r) => a + r.total, 0)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-[#E8F5E9] text-[#1B5E20] uppercase text-xs">
                        <tr>
                          <th className="text-left px-3 py-2">Nama Sekolah</th>
                          <th className="text-center px-3 py-2">Porsi Besar</th>
                          <th className="text-center px-3 py-2">Porsi Kecil</th>
                          <th className="text-center px-3 py-2">Total Porsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryData.map((r) => (
                          <tr key={r.sekolah} className="border-t hover:bg-[#F1F8E9]">
                            <td className="px-3 py-2 font-medium">{r.sekolah}</td>
                            <td className="px-3 py-2 text-center text-orange-700 font-semibold">{r.besar}</td>
                            <td className="px-3 py-2 text-center text-sky-700 font-semibold">{r.kecil}</td>
                            <td className="px-3 py-2 text-center font-bold">{r.total}</td>
                          </tr>
                        ))}
                        {summaryData.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-4 text-gray-400">Belum ada data penerima manfaat.</td></tr>
                        )}
                      </tbody>
                      {summaryData.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 bg-[#FFF8E1] font-bold">
                            <td className="px-3 py-2">TOTAL KESELURUHAN</td>
                            <td className="px-3 py-2 text-center text-orange-700">{summaryData.reduce((a, r) => a + r.besar, 0)}</td>
                            <td className="px-3 py-2 text-center text-sky-700">{summaryData.reduce((a, r) => a + r.kecil, 0)}</td>
                            <td className="px-3 py-2 text-center">{summaryData.reduce((a, r) => a + r.total, 0)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 mb-4 border-b border-gray-200">
            {['Siswa','Guru'].map((t) => (
              <button key={t} onClick={()=>handleTabChange(t)}
                className={`px-4 py-2 font-medium transition ${tab===t ? 'border-b-2 border-[#2E7D32] text-[#1B5E20]' : 'text-gray-500 hover:text-gray-800'}`}>
                {t === 'Siswa' ? '📘 Data Siswa' : '📕 Data Guru / Pendukung'}
              </button>
            ))}
          </div>

          {actionMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${actionMsg.startsWith('✅') || actionMsg.startsWith('🗑') ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-red-50 text-red-800'}`}>
              {actionMsg}
            </div>
          )}

          <input
            type="text" value={search} onChange={(e)=>setSearch(e.target.value)}
            placeholder="Cari nama sekolah, kepsek, kode identitas, atau status..."
            className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E8F5E9] text-[#1B5E20] uppercase text-xs">
                <tr>
                  <th className="text-left px-3 py-3">Sekolah</th>
                  <th className="text-left px-3 py-3">Info Lengkap</th>
                  <th className="text-left px-3 py-3">Aksi</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="text-center py-6">Memuat...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Tidak ada data</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id} className="border-t hover:bg-[#F1F8E9]">
                    <td className="px-3 py-3 font-medium">{r.nama_sekolah}</td>
                    <td className="px-3 py-3">
                      {r.kategori_form === 'Guru' ? <InfoBlock info={r} /> : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => openDetail(r)} title="Lihat detail & pratinjau isi"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1976D2] hover:bg-[#0D47A1] text-white text-sm transition">👁</button>
                        {r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noreferrer" download title="Download file asli"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm transition">📥</a>
                        )}
                        <button onClick={() => openEdit(r)} title="Edit data kiriman"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F9A825] hover:bg-[#F57F17] text-white text-sm transition">✏️</button>
                        <button onClick={() => deleteRow(r)} title="Hapus data (file pindah ke bucket sampah)"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm transition">🗑️</button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {r.status_validasi === 'VALID'
                        ? <span className="px-2 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold">✅ VALID</span>
                        : <span className="px-2 py-1 rounded-full bg-red-50 text-red-800 text-xs font-semibold">❌ {r.status_validasi}</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{new Date(r.submitted_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-4">Total: {filtered.length} dokumen · 🗑️ hapus = data hilang dari database, file Excel pindah ke bucket "sampah" (bisa dipulihkan).</p>
        </div>
      </div>

      {/* ---------- MODAL DETAIL (👁) ---------- */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1B5E20]">👁 Detail: {selected.nama_sekolah}</h3>
                  <p className="text-sm text-gray-500">{selected.kategori_form} · {new Date(selected.submitted_at).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={() => setDetailOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-2 text-sm bg-[#F1F8E9] p-4 rounded-xl border border-[#4CAF50]/30 mb-4">
                <p><span className="text-gray-500">Nama Sekolah:</span> <b>{selected.nama_sekolah}</b></p>
                <p><span className="text-gray-500">Kategori:</span> <b>{selected.kategori_form}</b></p>
                {selected.kategori_form === 'Guru' && (
                  <>
                    <p><span className="text-gray-500">Tingkat:</span> <b>{selected.tingkat_sekolah || '-'}</b></p>
                    <p><span className="text-gray-500">Identitas:</span> <b>{selected.tipe_identitas || '-'} {selected.kode_identitas || '-'}</b></p>
                    <p><span className="text-gray-500">Kepala Sekolah:</span> <b>{selected.nama_kepsek || '-'}</b></p>
                    <p><span className="text-gray-500">No. Telepon:</span> <b>{selected.no_telepon || '-'}</b></p>
                  </>
                )}
                <p><span className="text-gray-500">Nama File:</span> <b>{selected.nama_file}</b></p>
                <p><span className="text-gray-500">Status:</span> <b>{selected.status_validasi}</b></p>
              </div>

              {selected.file_url && (
                <a href={selected.file_url} target="_blank" rel="noreferrer" download
                  className="inline-flex items-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-semibold transition mb-4">
                  📥 Download File Asli
                </a>
              )}

              <h4 className="font-bold text-[#1B5E20] mb-2">📋 Isi Data ({loadingDetail ? 'memuat...' : `${detailRows.length} baris`})</h4>
              {!loadingDetail && detailRows.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">Tgl Lahir</th>
                        <th className="px-3 py-2 text-left">Gender</th>
                        <th className="px-3 py-2 text-left">NIK</th>
                        {selected.kategori_form === 'Siswa' && <th className="px-3 py-2 text-left">Kategori</th>}
                        <th className="px-3 py-2 text-left">Sub Kategori</th>
                        <th className="px-3 py-2 text-left">Porsi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((d, i) => (
                        <tr key={d.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{d.nama_lengkap || '-'}</td>
                          <td className="px-3 py-2">{d.tanggal_lahir || '-'}</td>
                          <td className="px-3 py-2">{d.gender || '-'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{d.nik || '-'}</td>
                          {selected.kategori_form === 'Siswa' && <td className="px-3 py-2">{d.kategori || '-'}</td>}
                          <td className="px-3 py-2">{d.sub_kategori || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${derivePorsi(selected.kategori_form, d.kategori, d.sub_kategori) === 'KECIL' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>
                              {derivePorsi(selected.kategori_form, d.kategori, d.sub_kategori) === 'KECIL' ? '🥣 KECIL' : '🍛 BESAR'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loadingDetail && detailRows.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada data baris tersimpan untuk dokumen ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- EXPORT CENTER (📤) ---------- */}
      {showExport && <ExportCenter onClose={() => setShowExport(false)} />}

      {/* ---------- MODAL EDIT (✏️) ---------- */}
      {editOpen && editForm && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 animate-slide-up">
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#1B5E20]">✏️ Edit Data Kiriman</h3>
                  <p className="text-sm text-gray-500">{editForm.kategori_form} · dikirim {new Date(editForm.submitted_at).toLocaleString('id-ID')}</p>
                </div>
                <button type="button" onClick={() => setEditOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {editError && <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">{editError}</div>}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
                  <input type="text" required value={editForm.nama_sekolah || ''}
                    onChange={(e)=>setEditForm({...editForm, nama_sekolah: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Validasi</label>
                  <select value={editForm.status_validasi || 'VALID'}
                    onChange={(e)=>setEditForm({...editForm, status_validasi: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#4CAF50] outline-none">
                    <option value="VALID">VALID</option>
                    <option value="Template Salah">Template Salah</option>
                    <option value="Revisi">Revisi</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Akses Dokumen</label>
                  <input type="text" required value={editForm.pin || ''}
                    onChange={(e)=>setEditForm({...editForm, pin: e.target.value.replace(/\D/g,'').slice(0,8)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none tracking-widest" />
                  <p className="text-xs text-gray-500 mt-1">Gunakan untuk mereset PIN sekolah yang lupa.</p>
                </div>
                {editForm.kategori_form === 'Guru' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Sekolah</label>
                      <input type="text" value={editForm.tingkat_sekolah || ''}
                        onChange={(e)=>setEditForm({...editForm, tingkat_sekolah: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Identitas</label>
                      <select value={editForm.tipe_identitas || 'NPSN'}
                        onChange={(e)=>setEditForm({...editForm, tipe_identitas: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#4CAF50] outline-none">
                        <option value="NPSN">NPSN</option>
                        <option value="NSM">NSM</option>
                        <option value="TPK">TPK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Identitas</label>
                      <input type="text" value={editForm.kode_identitas || ''}
                        onChange={(e)=>setEditForm({...editForm, kode_identitas: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                      <input type="text" value={editForm.nama_kepsek || ''}
                        onChange={(e)=>setEditForm({...editForm, nama_kepsek: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                      <input type="text" value={editForm.no_telepon || ''}
                        onChange={(e)=>setEditForm({...editForm, no_telepon: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
                  {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
