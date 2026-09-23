import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [tab, setTab] = useState('Siswa');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // State untuk Modal PIN
  const [showModal, setShowModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [accessError, setAccessError] = useState('');
  const [detailData, setDetailData] = useState(null); // Data tabel preview

  useEffect(() => {
    loadData();
    const sub = supabase
      .channel('submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_metadata' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submission_metadata')
      .select('*')
      .eq('kategori_form', tab)
      .order('submitted_at', { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  };

  const filtered = rows.filter(r => {
    const s = search.toLowerCase();
    return r.nama_sekolah?.toLowerCase().includes(s) || r.status_validasi?.toLowerCase().includes(s);
  });

  // Fungsi saat tombol "Akses File" diklik
  const handleAccessClick = (row) => {
    setSelectedRow(row);
    setPinInput('');
    setAccessError('');
    setDetailData(null);
    setShowModal(true);
  };

  // Fungsi Verifikasi PIN
  const handleVerifyPin = async () => {
    if (!pinInput) return;

    if (pinInput === selectedRow.pin) {
      // PIN Benar -> Ambil data detail untuk preview tabel
      const { data } = await supabase
        .from('penerima_manfaat_detail')
        .select('*')
        .eq('submission_id', selectedRow.id)
        .order('row_index');
      
      setDetailData(data || []);
      setAccessError('');
    } else {
      // PIN Salah
      setAccessError('❌ PIN Salah! Silakan periksa kembali PIN Anda.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRow(null);
    setDetailData(null);
  };

  const StatusBadge = ({ st }) => {
    if (st === 'VALID') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold">✅ VALID</span>;
    if (st === 'Template Salah') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-800 text-xs font-semibold">❌ Template Salah</span>;
    return <span className="text-xs text-gray-500">{st}</span>;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#4CAF50]/20">
      <h2 className="text-2xl font-bold text-[#1B5E20] mb-1">📊 Dashboard Rekapitulasi</h2>
      <p className="text-sm text-gray-500 mb-5">Portal Validasi Publik — Data pengiriman sekolah</p>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button onClick={() => setTab('Siswa')} className={`px-4 py-2 font-medium transition ${tab === 'Siswa' ? 'border-b-2 border-[#2E7D32] text-[#1B5E20]' : 'text-gray-500 hover:text-gray-800'}`}>
          📘 Data Siswa
        </button>
        <button onClick={() => setTab('Guru')} className={`px-4 py-2 font-medium transition ${tab === 'Guru' ? 'border-b-2 border-[#F9A825] text-[#E65100]' : 'text-gray-500 hover:text-gray-800'}`}>
          📕 Data Guru / Pendukung
        </button>
      </div>

      <input
        type="text" value={search} onChange={(e)=>setSearch(e.target.value)}
        placeholder="Cari nama sekolah atau status..."
        className="w-full mb-4 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F1F8E9] text-[#1B5E20] uppercase text-xs">
            <tr>
              <th className="text-left px-3 py-3">Nama Sekolah</th>
              <th className="text-left px-3 py-3">Akses File</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-6 text-gray-500">Memuat data...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">Belum ada data pengiriman.</td></tr>}
            {filtered.map(r => (
              <tr key={r.id} className="border-t hover:bg-[#F1F8E9] transition">
                <td className="px-3 py-3 font-medium">{r.nama_sekolah}</td>
                <td className="px-3 py-3">
                  <button 
                    onClick={() => handleAccessClick(r)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold transition shadow-sm"
                  >
                    🔓 Akses File
                  </button>
                </td>
                <td className="px-3 py-3"><StatusBadge st={r.status_validasi}/></td>
                <td className="px-3 py-3 text-gray-500 text-xs">{new Date(r.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">💡 Klik tombol <b>" Akses File"</b> dan masukkan PIN yang dibuat saat pengiriman untuk melihat & mendownload dokumen.</p>

      {/* MODAL AKSES FILE (PIN & PREVIEW) */}
      {showModal && selectedRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1B5E20]">📄 {selectedRow.nama_sekolah}</h3>
                  <p className="text-sm text-gray-500">{selectedRow.kategori_form} · {new Date(selectedRow.submitted_at).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* TAHAP 1: INPUT PIN */}
              {!detailData && (
                <div className="max-w-md mx-auto text-center py-8">
                  <div className="w-16 h-16 bg-[#FFF8E1] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔐</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">Masukkan PIN Akses</h4>
                  <p className="text-sm text-gray-500 mb-6">Dokumen ini diproteksi. Masukkan PIN yang Anda buat saat pengiriman.</p>
                  
                  <input 
                    type="password" 
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Masukkan PIN..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:ring-2 focus:ring-[#4CAF50] outline-none mb-3"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                  />
                  
                  {accessError && <p className="text-red-600 text-sm mb-4 font-medium">{accessError}</p>}
                  
                  <button 
                    onClick={handleVerifyPin}
                    className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-lg transition"
                  >
                    Buka Dokumen
                  </button>
                </div>
              )}

              {/* TAHAP 2: PREVIEW & DOWNLOAD (Setelah PIN Benar) */}
              {detailData && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center justify-between bg-[#E8F5E9] p-3 rounded-lg">
                    <span className="text-sm font-medium text-[#1B5E20]">✅ Akses Diberikan · {detailData.length} Baris Data</span>
                    {selectedRow.file_url && (
                      <a href={selectedRow.file_url} target="_blank" rel="noreferrer" download className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        📥 Download File Asli
                      </a>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Nama</th>
                          <th className="px-3 py-2 text-left">Tgl Lahir</th>
                          <th className="px-3 py-2 text-left">Gender</th>
                          <th className="px-3 py-2 text-left">NIK</th>
                          {selectedRow.kategori_form === 'Siswa' && <th className="px-3 py-2 text-left">Kategori</th>}
                          <th className="px-3 py-2 text-left">Sub Kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.map((d, i) => (
                          <tr key={d.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{d.nama_lengkap || '-'}</td>
                            <td className="px-3 py-2">{d.tanggal_lahir || '-'}</td>
                            <td className="px-3 py-2">{d.gender || '-'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{d.nik || '-'}</td>
                            {selectedRow.kategori_form === 'Siswa' && <td className="px-3 py-2">{d.kategori || '-'}</td>}
                            <td className="px-3 py-2">{d.sub_kategori || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}