import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function TemplateModal({ onClose }) {
  const [previews, setPreviews] = useState({});
  const [activePreview, setActivePreview] = useState('siswa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    loadPreviews();
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const loadPreviews = async () => {
    try {
      const [resS, resG] = await Promise.all([
        fetch(`${base}templates/template-siswa.xlsx`),
        fetch(`${base}templates/template-guru.xlsx`),
      ]);
      if (!resS.ok || !resG.ok) throw new Error('File template tidak ditemukan di server.');
      const bufS = new Uint8Array(await resS.arrayBuffer());
      const bufG = new Uint8Array(await resG.arrayBuffer());
      const wbS = XLSX.read(bufS, { type: 'array' });
      const wbG = XLSX.read(bufG, { type: 'array' });
      const rowsS = XLSX.utils.sheet_to_json(wbS.Sheets[wbS.SheetNames[0]], { header: 1, defval: '' });
      const rowsG = XLSX.utils.sheet_to_json(wbG.Sheets[wbG.SheetNames[0]], { header: 1, defval: '' });
      setPreviews({ siswa: rowsS.slice(0, 5), guru: rowsG.slice(0, 5) });
    } catch (e) {
      console.error(e);
      setError('Pratinjau tidak dapat dimuat: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const rows = previews[activePreview] || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl mx-4 my-8 bg-white rounded-2xl shadow-2xl animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition z-10" aria-label="Tutup">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-1">📥 Unduh Template Resmi</h2>
          <p className="text-sm text-gray-500 mb-6">Pilih template yang ingin diunduh. Anda juga dapat melihat pratinjau file asli sebelum mengunduh.</p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Kartu Template Siswa */}
            <div className="border-2 border-[#4CAF50]/40 rounded-xl p-5 bg-[#E8F5E9]">
              <div className="text-3xl mb-2">📘</div>
              <h3 className="font-bold text-[#1B5E20] text-lg">Template Siswa</h3>
              <p className="text-xs text-gray-600 mt-1 mb-4">File: template-siswa.xlsx — untuk data penerima manfaat siswa.</p>
              <div className="flex flex-col gap-2">
                <a href={`${base}templates/template-siswa.xlsx`} download className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-center px-4 py-2 rounded-lg font-semibold transition text-sm">
                  📥 Unduh Template Siswa
                </a>
                <button onClick={() => setActivePreview('siswa')} className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${activePreview === 'siswa' ? 'bg-white border-[#2E7D32] text-[#1B5E20] ring-1 ring-[#2E7D32]' : 'bg-white/60 border-[#4CAF50]/40 text-[#2E7D32] hover:bg-white'}`}>
                  👁 Lihat Pratinjau File Asli
                </button>
              </div>
            </div>

            {/* Kartu Template Guru */}
            <div className="border-2 border-[#F9A825]/40 rounded-xl p-5 bg-[#FFF8E1]">
              <div className="text-3xl mb-2">📕</div>
              <h3 className="font-bold text-[#E65100] text-lg">Template Guru & Pendukung</h3>
              <p className="text-xs text-gray-600 mt-1 mb-4">File: template-guru.xlsx — untuk data guru & tenaga pendukung.</p>
              <div className="flex flex-col gap-2">
                <a href={`${base}templates/template-guru.xlsx`} download className="bg-[#F9A825] hover:bg-[#F57F17] text-white text-center px-4 py-2 rounded-lg font-semibold transition text-sm">
                  📥 Unduh Template Guru
                </a>
                <button onClick={() => setActivePreview('guru')} className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${activePreview === 'guru' ? 'bg-white border-[#F57F17] text-[#E65100] ring-1 ring-[#F57F17]' : 'bg-white/60 border-[#F9A825]/40 text-[#F57F17] hover:bg-white'}`}>
                  👁 Lihat Pratinjau File Asli
                </button>
              </div>
            </div>
          </div>

          {/* Pratinjau File Asli */}
          <div>
            <h3 className="font-bold text-[#1B5E20] mb-2">
              👁 Pratinjau File Asli: <span className="text-[#2E7D32]">{activePreview === 'siswa' ? 'template-siswa.xlsx' : 'template-guru.xlsx'}</span>
            </h3>
            {loading && <p className="text-sm text-gray-500">Memuat pratinjau...</p>}
            {!loading && error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-[#1B5E20] text-white' : i === 1 ? 'bg-[#FFF176] text-gray-800' : 'bg-white'}>
                        {row.map((cell, j) => (
                          <td key={j} className={`px-3 py-2 border border-gray-200 whitespace-nowrap max-w-[220px] truncate ${i === 0 ? 'font-bold' : ''}`}>
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Baris 1 (hijau) = header resmi yang tidak boleh diubah · Baris 2 (kuning) = petunjuk pengisian · Baris 3 dst = tempat input data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
