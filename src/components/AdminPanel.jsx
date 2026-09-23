import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_PIN = '2024';

export default function AdminPanel({ onClose }) {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Siswa');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
      setError('');
      loadAllData();
    } else {
      setError('❌ PIN salah!');
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submission_metadata')
      .select('*')
      .eq('kategori_form', tab)
      .order('submitted_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    // Reload data untuk tab baru
    supabase
      .from('submission_metadata')
      .select('*')
      .eq('kategori_form', newTab)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  };

  const filtered = rows.filter(r => {
    const s = search.toLowerCase();
    return r.nama_sekolah?.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s);
  });

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
              <p className="text-sm text-gray-500">Akses penuh ke semua data pengiriman</p>
            </div>
            <span className="bg-[#F9A825] text-[#1B5E20] px-3 py-1 rounded-full text-xs font-bold">ADMIN MODE</span>
          </div>

          {/* Tab */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            {['Siswa','Guru'].map((t) => (
              <button key={t} onClick={()=>handleTabChange(t)}
                className={`px-4 py-2 font-medium transition ${tab===t ? 'border-b-2 border-[#2E7D32] text-[#1B5E20]' : 'text-gray-500 hover:text-gray-800'}`}>
                {t === 'Siswa' ? '📘 Data Siswa' : '📕 Data Guru / Pendukung'}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text" value={search} onChange={(e)=>setSearch(e.target.value)}
            placeholder="Cari nama sekolah atau email..."
            className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none"
          />

          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E8F5E9] text-[#1B5E20] uppercase text-xs">
                <tr>
                  <th className="text-left px-3 py-3">Sekolah</th>
                  <th className="text-left px-3 py-3">Email</th>
                  <th className="text-left px-3 py-3">File Asli</th>
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
                    <td className="px-3 py-3 text-xs">{r.email}</td>
                    <td className="px-3 py-3">
                      {r.file_url ? (
                        <a href={r.file_url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-3 py-1 rounded text-xs transition">
                          📥 Download
                        </a>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3">
                      {r.status_validasi === 'VALID' 
                        ? <span className="px-2 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold">✅ VALID</span>
                        : <span className="px-2 py-1 rounded-full bg-red-50 text-red-800 text-xs font-semibold"> {r.status_validasi}</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{new Date(r.submitted_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-4">Total: {filtered.length} dokumen · File yang didownload adalah file original yang diupload pengirim.</p>
        </div>
      </div>
    </div>
  );
}