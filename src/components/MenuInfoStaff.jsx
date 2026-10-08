import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImageToCloudinary, validateImageFile, optimizedUrl } from '../utils/cloudinary';

const SESSION_KEY = 'menu_staff_auth';

export default function MenuInfoStaff({ onNavigate }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [checking, setChecking] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [fileError, setFileError] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const loadList = async () => {
    setLoadingList(true);
    const { data } = await supabase.from('menu_info').select('*').order('uploaded_at', { ascending: false });
    setItems(data || []);
    setLoadingList(false);
  };

  useEffect(() => { if (authed) loadList(); }, [authed]);

  const login = async (e) => {
    e.preventDefault();
    setChecking(true); setPwError('');
    try {
      const { data, error } = await supabase.rpc('verify_staff_menu_password', { input_password: pw });
      if (error) throw error;
      if (data === true) { sessionStorage.setItem(SESSION_KEY, '1'); setAuthed(true); }
      else setPwError('❌ Password salah!');
    } catch (err) { setPwError('Gagal memverifikasi: ' + err.message); }
    setChecking(false);
  };

  const logout = () => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPw(''); };

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFileError('');
    if (!f) { setFile(null); setPreview(''); return; }
    const v = validateImageFile(f);
    if (!v.ok) { setFileError(v.error); setFile(null); setPreview(''); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const doUpload = async () => {
    if (!file) { setFileError('Pilih gambar terlebih dahulu.'); return; }
    setUploading(true); setMsg('');
    try {
      const up = await uploadImageToCloudinary(file, 'sppg-jatian/informasi-menu');
      const { error } = await supabase.from('menu_info').insert({
        image_url: up.url,
        cloudinary_public_id: up.publicId,
        caption: caption.trim() || null,
        uploaded_by: 'staff',
      });
      if (error) throw error;
      setMsg('✅ Flyer berhasil diunggah dan tampil di halaman Informasi Menu.');
      setFile(null); setPreview(''); setCaption('');
      loadList();
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
    setUploading(false);
  };

  const copyLink = async (url) => {
    try { await navigator.clipboard.writeText(url); setMsg('🔗 Link disalin: ' + url); }
    catch { prompt('Salin link ini:', url); }
  };

  const removeItem = async (it) => {
    const ok = window.confirm(`Hapus flyer tanggal ${new Date(it.uploaded_at).toLocaleDateString('id-ID')}?\nRecord database akan dihapus. File di Cloudinary dapat dibersihkan manual bila perlu.`);
    if (!ok) return;
    const { error } = await supabase.from('menu_info').delete().eq('id', it.id);
    if (error) setMsg('❌ Gagal menghapus: ' + error.message);
    else { setMsg('🗑️ Flyer dihapus dari daftar.'); loadList(); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwMsg('');
    const { data, error } = await supabase.rpc('update_staff_menu_password', { old_password: oldPw, new_password: newPw });
    if (error) { setPwMsg('❌ ' + error.message); return; }
    setPwMsg(data === true ? '✅ Password berhasil diganti.' : '❌ Password lama salah.');
    setOldPw(''); setNewPw('');
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none';

  /* ---------- LOGIN ---------- */
  if (!authed) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-md animate-fade-in">
        <button onClick={() => onNavigate('/informasimenu')} className="text-sm text-[#2E7D32] font-semibold mb-4">← Kembali ke Informasi Menu</button>
        <form onSubmit={login} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔐</div>
            <h2 className="text-xl font-bold text-[#1B5E20]">Panel Staff Informasi Menu</h2>
            <p className="text-xs text-gray-500 mt-1">Masukkan password staff untuk mengelola flyer.</p>
          </div>
          <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password staff" required />
          {pwError && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-sm text-center">{pwError}</div>}
          <button type="submit" disabled={checking} className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
            {checking ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    );
  }

  /* ---------- DASHBOARD STAFF ---------- */
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1B5E20]">🔐 Panel Staff — Informasi Menu</h1>
          <p className="text-sm text-gray-500">Upload flyer menu. Tanggal otomatis tercatat.</p>
        </div>
        <button onClick={logout} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-lg transition">🚪 Keluar</button>
      </div>

      {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-[#F1F8E9] text-[#1B5E20]">{msg}</div>}

      {/* Upload */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3 mb-6">
        <h3 className="font-bold text-[#1B5E20]">📤 Upload Flyer</h3>
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onFileChange} className="block w-full text-sm text-gray-500 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#E8F5E9] file:text-[#1B5E20] file:font-semibold file:cursor-pointer" />
        {fileError && <p className="text-xs text-red-600">⚠️ {fileError}</p>}
        <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Keterangan (opsional), contoh: Menu Rabu Minggu 2" />
        {preview && <img src={preview} alt="Preview" className="h-40 rounded-lg border border-gray-200 object-cover" />}
        <button onClick={doUpload} disabled={uploading} className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 text-white font-bold py-3 rounded-lg transition">
          {uploading ? 'Mengunggah...' : '⬆️ Upload Flyer'}
        </button>
      </div>

      {/* Daftar */}
      <div className="bg-white rounded-2xl shadow p-5 mb-6">
        <h3 className="font-bold text-[#1B5E20] mb-3">🗂️ Daftar Flyer ({items.length})</h3>
        {loadingList && <p className="text-sm text-gray-500">Memuat...</p>}
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 items-center border border-gray-100 rounded-xl p-3">
              <img src={optimizedUrl(it.image_url, { width: 200 })} alt="Flyer" loading="lazy" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{new Date(it.uploaded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-gray-400 truncate">{it.caption || 'Tanpa keterangan'}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => copyLink(it.image_url)} title="Salin link gambar" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1976D2] hover:bg-[#0D47A1] text-white text-sm transition">🔗</button>
                <a href={it.image_url} target="_blank" rel="noreferrer" title="Buka gambar" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm transition">👁</a>
                <button onClick={() => removeItem(it)} title="Hapus" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm transition">🗑️</button>
              </div>
            </div>
          ))}
          {!loadingList && items.length === 0 && <p className="text-sm text-gray-400">Belum ada flyer.</p>}
        </div>
      </div>

      {/* Ganti password */}
      <form onSubmit={changePw} className="bg-white rounded-2xl shadow p-5 space-y-3">
        <h3 className="font-bold text-[#1B5E20]">🔑 Ganti Password Staff</h3>
        <input type="password" className={inputCls} value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="Password lama" required />
        <input type="password" className={inputCls} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Password baru (min 4 karakter)" minLength={4} required />
        {pwMsg && <p className="text-sm">{pwMsg}</p>}
        <button type="submit" className="bg-[#F9A825] hover:bg-[#F57F17] text-[#1B5E20] font-semibold px-5 py-2 rounded-lg transition">💾 Simpan Password Baru</button>
      </form>
    </div>
  );
}
