import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ViewMyDocument({ onClose }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setData(null);
    setDetail([]);
    setLoading(true);

    try {
      const { data: sub, error } = await supabase
        .from('submission_metadata')
        .select('*')
        .eq('email', email)
        .eq('pin', pin)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!sub || sub.length === 0) {
        setError('❌ Email atau PIN salah. Tidak ada dokumen ditemukan.');
        setLoading(false);
        return;
      }

      setData(sub[0]);

      // Ambil detail baris Excel
      const { data: det } = await supabase
        .from('penerima_manfaat_detail')
        .select('*')
        .eq('submission_id', sub[0].id)
        .order('row_index');
      setDetail(det || []);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition z-10">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-1">🔍 Lihat Dokumen Saya</h2>
          <p className="text-sm text-gray-600 mb-6">Masukkan email & PIN yang Anda buat saat pengiriman untuk melihat & download dokumen.</p>

          {!data ? (
            <form onSubmit={handleSearch} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-[#1B5E20] mb-1">Email Pengirim</label>
                <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-[#4CAF50]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1B5E20] mb-1">PIN</label>
                <input type="password" required value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))} className="w-full border border-[#4CAF50]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none"/>
              </div>
              {error && <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
                {loading ? 'Mencari...' : 'Tampilkan Dokumen'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Info Dokumen */}
              <div className="bg-[#E8F5E9] p-4 rounded-xl border border-[#4CAF50]">
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Sekolah:</span> <b>{data.nama_sekolah}</b></div>
                  <div><span className="text-gray-600">Kategori:</span> <b>{data.kategori_form}</b></div>
                  <div><span className="text-gray-600">Status:</span> <b className="text-[#2E7D32]">{data.status_validasi}</b></div>
                  <div><span className="text-gray-600">Dikirim:</span> <b>{new Date(data.submitted_at).toLocaleString('id-ID')}</b></div>
                </div>
              </div>

              {/* Tombol Download File Asli */}
              {data.file_url && (
                <a href={data.file_url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-5 py-2 rounded-lg transition">
                  📥 Download File Excel Asli
                </a>
              )}

              {/* Preview Tabel Data */}
              {detail.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#1B5E20] mb-2">📋 Preview Data ({detail.length} baris)</h3>
                  <div className="overflow-x-auto border border-[#4CAF50]/30 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-[#E8F5E9] text-[#1B5E20] text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Nama</th>
                          <th className="px-3 py-2 text-left">Tgl Lahir</th>
                          <th className="px-3 py-2 text-left">Gender</th>
                          <th className="px-3 py-2 text-left">NIK</th>
                          {data.kategori_form === 'Siswa' && <th className="px-3 py-2 text-left">Kategori</th>}
                          <th className="px-3 py-2 text-left">Sub Kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map((d, i) => (
                          <tr key={d.id} className="border-t hover:bg-[#F1F8E9]">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{d.nama_lengkap || '-'}</td>
                            <td className="px-3 py-2">{d.tanggal_lahir || '-'}</td>
                            <td className="px-3 py-2">{d.gender || '-'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{d.nik || '-'}</td>
                            {data.kategori_form === 'Siswa' && <td className="px-3 py-2">{d.kategori || '-'}</td>}
                            <td className="px-3 py-2">{d.sub_kategori || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button onClick={() => { setData(null); setDetail([]); setEmail(''); setPin(''); }} className="text-sm text-[#2E7D32] hover:underline">
                ← Cari dokumen lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}