import { useEffect, useState } from 'react';
import { supabaseQr } from '../lib/supabaseQr';

const SESSION_KEY = 'menu_staff_auth';
const STAFF_PASSWORD = 'staffsppg2026'; // ← Ganti dengan password staff Anda
const BUCKET_NAME = 'assets-harian';
const QR_FUNCTION_URL = 'https://exeawjvpprhbilrvpics.supabase.co/functions/v1/router-gambar';

export default function MenuInfoStaff({ onNavigate }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [fileError, setFileError] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Load daftar flyer dari Storage
  const loadList = async () => {
    setLoadingList(true);
    const { data, error } = await supabaseQr.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      setMsg('❌ Gagal memuat daftar: ' + error.message);
    } else {
      // Filter: buang file sistem (seperti .emptyFolderPlaceholder)
      const realFiles = (data || []).filter(f => !f.name.startsWith('.'));
      setItems(realFiles);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (authed) loadList();
  }, [authed]);

  // Login
  const login = (e) => {
    e.preventDefault();
    setPwError('');
    if (pw === STAFF_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
      setPw('');
    } else {
      setPwError('❌ Password salah!');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  // Pilih file
  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFileError('');
    if (!f) {
      setFile(null);
      setPreview('');
      return;
    }
    // Validasi sederhana
    if (!f.type.startsWith('image/')) {
      setFileError('File harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 10 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // Upload ke Storage
  const doUpload = async () => {
    if (!file) {
      setFileError('Pilih gambar terlebih dahulu.');
      return;
    }
    setUploading(true);
    setMsg('');

    // Nama file: timestamp + nama asli (agar Edge Function otomatis ambil yang terbaru)
    const safeName = file.name.replace(/\s+/g, '_');
    const fileName = `update_${Date.now()}_${safeName}`;

    const { error } = await supabaseQr.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { cacheControl: '0', upsert: false });

    if (error) {
      setMsg('❌ Gagal upload: ' + error.message);
    } else {
      setMsg('✅ Flyer berhasil diunggah! QR Code otomatis menampilkan gambar ini sekarang.');
      setFile(null);
      setPreview('');
      setCaption('');
      loadList();
    }
    setUploading(false);
  };

  // Salin link gambar
  const copyLink = async (fileName) => {
    const { data } = supabaseQr.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    try {
      await navigator.clipboard.writeText(data.publicUrl);
      setMsg('🔗 Link gambar disalin!');
    } catch {
      prompt('Salin link ini:', data.publicUrl);
    }
  };

  // Hapus flyer
  const removeItem = async (fileName) => {
    const ok = window.confirm(`Hapus flyer "${fileName}"?\nFile akan hilang permanen dari server.`);
    if (!ok) return;

    const { error } = await supabaseQr.storage.from(BUCKET_NAME).remove([fileName]);
    if (error) {
      setMsg('❌ Gagal menghapus: ' + error.message);
    } else {
      setMsg('🗑️ Flyer berhasil dihapus.');
      loadList();
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none';

  /* ---------- LOGIN ---------- */
  if (!authed) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-md animate-fade-in">
        <button
          onClick={() => onNavigate('/informasimenu')}
          className="text-sm text-[#2E7D32] font-semibold mb-4"
        >
          ← Kembali ke Informasi Menu
        </button>
        <form onSubmit={login} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔐</div>
            <h2 className="text-xl font-bold text-[#1B5E20]">Panel Staff</h2>
            <p className="text-xs text-gray-500 mt-1">Masukkan password staff untuk mengelola flyer harian.</p>
          </div>
          <input
            type="password"
            className={inputCls}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password staff"
            required
          />
          {pwError && (
            <div className="p-2 bg-red-50 text-red-700 rounded-lg text-sm text-center">
              {pwError}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-lg transition"
          >
            Masuk
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
          <h1 className="text-2xl font-bold text-[#1B5E20]">🔐 Panel Staff</h1>
          <p className="text-sm text-gray-500">Upload flyer harian. QR Code otomatis berubah.</p>
        </div>
        <button
          onClick={logout}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-lg transition"
        >
          🚪 Keluar
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[#F1F8E9] text-[#1B5E20] border border-green-200">
          {msg}
        </div>
      )}

      {/* Info QR URL */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5">
        <p className="text-xs text-blue-700 font-bold mb-1">
          🔗 URL QR CODE (Cetak ini 1x selamanya):
        </p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-blue-900 break-all flex-1">{QR_FUNCTION_URL}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(QR_FUNCTION_URL);
              setMsg('🔗 URL QR Code disalin!');
            }}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Upload Flyer */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3 mb-6">
        <h3 className="font-bold text-[#1B5E20]">📤 Upload Flyer Hari Ini</h3>
        
        <label className="block border-2 border-dashed border-gray-300 hover:border-[#2E7D32] rounded-xl p-5 text-center cursor-pointer transition bg-gray-50 hover:bg-green-50">
          <div className="text-3xl mb-2">📸</div>
          <span className="text-sm font-semibold text-gray-700 block mb-1">
            {file ? file.name : 'Klik untuk pilih gambar'}
          </span>
          <span className="text-xs text-gray-500">JPG, PNG, WEBP (Max 10 MB)</span>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        {fileError && <p className="text-xs text-red-600">⚠️ {fileError}</p>}

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-80 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
            <button
              onClick={() => {
                setFile(null);
                setPreview('');
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm shadow-lg"
            >
              ✕
            </button>
          </div>
        )}

        <input
          className={inputCls}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Keterangan (opsional), contoh: Menu Senin 27 Okt"
        />

        <button
          onClick={doUpload}
          disabled={uploading || !file}
          className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
        >
          {uploading ? 'Mengunggah...' : '⬆️ Upload Flyer'}
        </button>
      </div>

      {/* Album Lampau */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#1B5E20]">
            🗂️ Album Lampau ({items.length} flyer)
          </h3>
          <button
            onClick={loadList}
            className="text-xs text-[#2E7D32] hover:underline font-semibold"
          >
            🔄 Refresh
          </button>
        </div>

        {loadingList && <p className="text-sm text-gray-500">Memuat...</p>}

        <div className="space-y-2">
          {items.map((it, idx) => {
            const { data: urlData } = supabaseQr.storage.from(BUCKET_NAME).getPublicUrl(it.name);
            const isLatest = idx === 0;
            return (
              <div
                key={it.name}
                className={`flex gap-3 items-center border rounded-xl p-3 transition ${
                  isLatest ? 'border-green-300 bg-green-50' : 'border-gray-100'
                }`}
              >
                <img
                  src={urlData.publicUrl}
                  alt={it.name}
                  loading="lazy"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {it.name.replace(/^update_\d+_/, '')}
                    </p>
                    {isLatest && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                        ✨ TAYANG
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(it.created_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => copyLink(it.name)}
                    title="Salin link gambar"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1976D2] hover:bg-[#0D47A1] text-white text-sm transition"
                  >
                    🔗
                  </button>
                  <a
                    href={urlData.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Buka gambar"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm transition"
                  >
                    👁
                  </a>
                  <button
                    onClick={() => removeItem(it.name)}
                    title="Hapus"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
          {!loadingList && items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Belum ada flyer. Upload yang pertama!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
