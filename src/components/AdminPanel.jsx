import { useState } from 'react';
import { supabase } from '../lib/supabase';

const InfoBlock = ({ info }) => (
  <div className="text-xs text-gray-600 space-y-0.5">
    <p>🏫 {info.tingkat_sekolah || '-'}</p>
    <p>🆔 {info.tipe_identitas || '-'}: <b>{info.kode_identitas || '-'}</b></p>
    <p>👤 Kepsek: {info.nama_kepsek || '-'}</p>
    <p>📞 {info.no_telepon || '-'}</p>
  </div>
);

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
      `HAPUS data "${row.nama_sekolah}" (${row.kategori_form})?\nFile di storage juga akan dihapus permanen.\nTindakan ini TIDAK bisa dibatalkan.`
    );
    if (!ok) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_submission', {
        p_id: row.id,
        p_pin_admin: pin,
      });
      if (error) throw error;
      if (data === true) {
        setActionMsg('🗑️ Data & file berhasil dihapus permanen.');
        loadData(tab);
      } else {
        setActionMsg('❌ Gagal menghapus: PIN admin tidak valid.');
      }
    } catch (err) {
      setActionMsg('❌ Gagal menghapus: ' + err.message);
    }
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
            <span className="bg-[#F9A825] text-[#1B5E20] px-3 py-1 rounded-full text-xs font-bold">ADMIN MODE</span>
          </div>

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
                        <button onClick={() => deleteRow(r)} title="Hapus data & file permanen"
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

          <p className="text-xs text-gray-500 mt-4">Total: {filtered.length} dokumen · 🗑️ menghapus data juga menghapus file di storage secara permanen.</p>
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
