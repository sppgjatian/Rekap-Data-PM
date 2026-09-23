import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Fungsi Sensor Data Sensitif
const maskName = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.map(p => p.length <= 2 ? '*'.repeat(p.length) : p[0] + '*'.repeat(p.length - 1)).join(' ');
};

const maskNIK = (nik) => {
  if (!nik || nik.length < 8) return '********';
  return nik.substring(0, 4) + '**********' + nik.substring(nik.length - 4);
};

export default function DataViewer() {
  const [schoolName, setSchoolName] = useState('');
  const [pin, setPin] = useState('');
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    setError(''); setData(null); setIsAdmin(false); setAdminData([]); setLoading(true);

    try {
      // Cek Admin Super User
      if (pin === '2024') {
        const { data: allData, error } = await supabase.from('submission_metadata').select('*').order('submitted_at', { ascending: false });
        if (error) throw error;
        setIsAdmin(true);
        setAdminData(allData || []);
      } else {
        // Cek User Biasa
        const { data, error } = await supabase
          .from('submission_metadata')
          .select('*')
          .eq('nama_sekolah', schoolName)
          .eq('pin', pin)
          .single();
        
        if (error || !data) throw new Error('Nama Sekolah atau PIN salah.');
        setData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">🔒 Lihat Data & Unduh Template</h2>
      <p className="text-sm text-gray-500 mb-5">Masukkan Nama Sekolah dan PIN untuk melihat data yang telah dikirim.</p>

      {/* Form Login PIN */}
      <form onSubmit={handleCheck} className="flex flex-col md:flex-row gap-3 mb-6">
        <input 
          type="text" placeholder="Nama Sekolah" value={schoolName} onChange={(e)=>setSchoolName(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400 outline-none"
        />
        <input 
          type="password" placeholder="PIN Anda" value={pin} onChange={(e)=>setPin(e.target.value)}
          className="w-full md:w-48 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400 outline-none"
        />
        <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition">
          {loading ? 'Memeriksa...' : 'Lihat Data'}
        </button>
      </form>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm">❌ {error}</div>}

      {/* Tombol Download Template (Selalu Muncul) */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
        <a href={`${import.meta.env.BASE_URL}templates/template-siswa.xlsx`} download className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 transition text-sm font-medium">
           Unduh Template Siswa
        </a>
        <a href={`${import.meta.env.BASE_URL}templates/template-guru.xlsx`} download className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg hover:bg-amber-200 transition text-sm font-medium">
          📥 Unduh Template Guru
        </a>
      </div>

      {/* Tampilan Data User Biasa */}
      {data && !isAdmin && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-bold text-emerald-800 mb-3">Data {data.kategori_form} - {data.nama_sekolah}</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-emerald-900">
                <tr>
                  <th className="px-3 py-2 text-left">Nama Lengkap</th>
                  <th className="px-3 py-2 text-left">NIK (Sensor)</th>
                  <th className="px-3 py-2 text-left">Tanggal Lahir</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {data.raw_excel_data?.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{maskName(row.nama_lengkap)}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{maskNIK(row.nik)}</td>
                    <td className="px-3 py-2">{row.tanggal_lahir}</td>
                    <td className="px-3 py-2">{row.sub_kategori || row.kategori}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-3">
            <a href={data.file_url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📄 Download File Asli</a>
          </div>
        </div>
      )}

      {/* Tampilan Admin Super User */}
      {isAdmin && (
        <div className="animate-fade-in">
          <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
            <h3 className="text-lg font-bold text-red-800">👑 Mode Super Admin Aktif</h3>
            <p className="text-sm text-red-700">Anda memiliki akses penuh untuk mengunduh semua data.</p>
          </div>
          
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Sekolah</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">File Upload</th>
                  <th className="px-3 py-2 text-left">Template Asli</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {adminData.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.nama_sekolah}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${row.kategori_form === 'Siswa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {row.kategori_form}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.file_url && <a href={row.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">⬇️ Unduh Upload</a>}
                    </td>
                    <td className="px-3 py-2">
                      <a href={`${import.meta.env.BASE_URL}templates/${row.kategori_form === 'Siswa' ? 'template-siswa' : 'template-guru'}.xlsx`} download className="text-emerald-600 hover:underline text-xs">
                        ⬇️ Unduh Template Kosong
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(row.submitted_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}