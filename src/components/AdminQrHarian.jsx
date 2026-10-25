import { useEffect, useState } from 'react';
import { supabaseQr } from '../lib/supabaseQr';

const BUCKET_NAME = 'assets-harian';
const QR_FUNCTION_URL = 'https://exeawjvpprhbilrvpics.supabase.co/functions/v1/router-gambar';

export default function AdminQrHarian({ onNavigate }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  
  // Dashboard state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Cek session saat mount
  useEffect(() => {
    supabaseQr.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabaseQr.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load file ketika login
  useEffect(() => {
    if (session) {
      loadFiles();
    }
  }, [session]);

  const loadFiles = async () => {
    const { data } = await supabaseQr.storage.from(BUCKET_NAME).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    
    if (data) {
      const realFiles = data.filter(f => !f.name.startsWith('.'));
      setFiles(realFiles);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMessage('');
    
    if (authMode === 'signup') {
      const { error } = await supabaseQr.auth.signUp({ email, password });
      if (error) setAuthMessage('❌ ' + error.message);
      else setAuthMessage('✅ Akun dibuat! Silakan login.');
    } else {
      const { error } = await supabaseQr.auth.signInWithPassword({ email, password });
      if (error) setAuthMessage('❌ ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabaseQr.auth.signOut();
    setSession(null);
    setFiles([]);
    setEmail('');
    setPassword('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('');

    const fileName = `update_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabaseQr.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { cacheControl: '0', upsert: false });

    if (error) {
      setUploadMessage('❌ Gagal: ' + error.message);
    } else {
      setUploadMessage('✅ SUKSES! QR Code otomatis berubah detik ini juga.');
      loadFiles();
      e.target.value = '';
    }
    
    setUploading(false);
  };

  const handleDelete = async (fileName) => {
    if (!confirm(`Hapus ${fileName}?`)) return;
    
    const { error } = await supabaseQr.storage.from(BUCKET_NAME).remove([fileName]);
    if (error) {
      alert('Gagal hapus: ' + error.message);
    } else {
      loadFiles();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  // ==================== TAMPILAN LOGIN ====================
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md animate-fade-in">
        <button 
          onClick={() => onNavigate('/')} 
          className="text-sm text-[#2E7D32] font-semibold mb-4"
        >
          ← Kembali ke Beranda
        </button>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📸</div>
            <h1 className="text-2xl font-bold text-[#1B5E20]">Admin QR Harian</h1>
            <p className="text-sm text-gray-500 mt-1">Login untuk mengelola flyer harian</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email Admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            />
            
            {authMessage && (
              <p className={`text-sm text-center p-2 rounded ${
                authMessage.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {authMessage}
              </p>
            )}
            
            <button
              type="submit"
              className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-lg transition"
            >
              {authMode === 'login' ? '🔐 Masuk' : '✨ Daftar Akun'}
            </button>
          </form>
          
          <button
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setAuthMessage('');
            }}
            className="w-full mt-4 text-sm text-gray-500 hover:text-[#2E7D32]"
          >
            {authMode === 'login' 
              ? 'Belum punya akun admin? Daftar di sini' 
              : 'Sudah punya akun? Login di sini'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== TAMPILAN DASHBOARD ====================
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button 
          onClick={() => onNavigate('/')} 
          className="text-sm text-[#2E7D32] font-semibold"
        >
          ← Beranda
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">{session.user.email}</span>
          <button 
            onClick={handleLogout} 
            className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-3 py-2 rounded-lg transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Panel Upload */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#1B5E20] mb-2">📸 Panel Admin QR Harian</h1>
        <p className="text-sm text-gray-500 mb-4">
          Upload gambar baru. QR Code otomatis berubah detik ini juga.
        </p>
        
        {/* Info QR URL */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-5">
          <p className="text-xs text-blue-700 font-bold mb-1">🔗 URL QR CODE (Cetak ini 1x selamanya):</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-blue-900 break-all flex-1">{QR_FUNCTION_URL}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(QR_FUNCTION_URL);
                alert('URL disalin!');
              }}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <label className="block border-2 border-dashed border-gray-300 hover:border-[#2E7D32] rounded-xl p-6 text-center cursor-pointer transition bg-gray-50 hover:bg-green-50">
          <div className="text-4xl mb-2">📤</div>
          <span className="text-sm font-semibold text-gray-700 block mb-1">
            {uploading ? 'Sedang mengupload...' : 'Klik untuk pilih gambar dari HP/Laptop'}
          </span>
          <span className="text-xs text-gray-500">JPG, PNG, atau GIF (Max 5MB)</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        
        {uploadMessage && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            uploadMessage.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadMessage}
          </div>
        )}
      </div>

      {/* Riwayat Upload */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1B5E20]">
            📂 Riwayat Upload 
            <span className="ml-2 text-sm font-normal text-gray-500">({files.length} file)</span>
          </h2>
          <button 
            onClick={loadFiles} 
            className="text-xs text-[#2E7D32] hover:underline font-semibold"
          >
            🔄 Refresh
          </button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-sm">Belum ada gambar yang diupload.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div 
                key={file.name} 
                className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                  idx === 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <img 
                  src={`https://exeawjvpprhbilrvpics.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${file.name}`} 
                  alt={file.name}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.name.replace(/^update_\d+_/, '')}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <p className="text-xs text-gray-500">
                      {new Date(file.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                        ✨ TAYANG SEKARANG
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold px-3 py-2 border border-red-200 hover:bg-red-50 rounded-lg transition"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
