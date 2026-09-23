import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseExcel, validateExcel } from '../utils/excelValidator';

export default function StudentForm({ onSuccess }) {
  const [namaSekolah, setNamaSekolah] = useState('');
  const [pin, setPin] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!namaSekolah || !pin || !file) {
      setMsg({ type: 'err', text: 'Lengkapi Nama Sekolah, PIN, dan File Excel.' });
      return;
    }
    if (pin.length < 4) {
      setMsg({ type: 'err', text: 'PIN minimal 4 digit.' });
      return;
    }

    setLoading(true);
    try {
      const rows = await parseExcel(file);
      const v = validateExcel(rows, 'Siswa');

      if (!v.ok) {
        setMsg({ type: 'err', text: '❌ Validasi gagal:\n' + v.errors.slice(0, 5).join('\n') });
        setLoading(false);
        return;
      }

      const fileName = `siswa/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('submissions').upload(fileName, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(fileName);

      const { data: meta, error: metaErr } = await supabase
        .from('submission_metadata')
        .insert([{
          nama_sekolah: namaSekolah,
          kategori_form: 'Siswa',
          status_validasi: 'VALID',
          nama_file: file.name,
          file_url: urlData.publicUrl,
          pin: pin,
        }])
        .select().single();
      if (metaErr) throw metaErr;

      const detailRows = v.data.map((r, i) => ({
        submission_id: meta.id,
        row_index: i + 1,
        nama_lengkap: r.nama_lengkap,
        tanggal_lahir: r.tanggal_lahir,
        gender: r.gender,
        nik: r.nik,
        type: r.type,
        identity_code: r.identity_code,
        kategori: r.kategori,
        sub_kategori: r.sub_kategori,
        raw_data: r,
      }));

      if (detailRows.length) {
        const { error: detErr } = await supabase.from('penerima_manfaat_detail').insert(detailRows);
        if (detErr) throw detErr;
      }

      setMsg({ type: 'ok', text: '✅ Data berhasil dikirim! Simpan PIN Anda untuk mengakses file nanti.' });
      setNamaSekolah(''); setPin(''); setFile(null);
      if (onSuccess) onSuccess('Siswa');
    } catch (err) {
      console.error(err);
      setMsg({ type: 'err', text: 'Gagal mengirim: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#E8F5E9] border-2 border-[#4CAF50] rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-[#1B5E20] mb-1">📘 Formulir Pengumpulan Data Siswa</h2>
      <p className="text-sm text-[#2E7D32] mb-4">Lengkapi data dan unggah file template. Buat PIN untuk mengakses dokumen Anda nanti.</p>

      <div className="bg-white p-4 rounded-xl border-l-4 border-[#2E7D32] mb-6 text-sm text-gray-700 space-y-1">
        <p>📌 Unduh template dari <b>portalspggjatian.my.id</b>.</p>
        <p>⚠️ <b>Data Fix</b>: jangan ubah header, pastikan format penulisan benar.</p>
        <p>⚠️ <b>Jangan gunakan template guru</b> untuk data siswa — sistem akan menolak otomatis.</p>
        <p>📞 Bantuan: <b>Diah Ayu Umami</b> — <a href="tel:+6285888009082" className="text-[#2E7D32] underline">+62 858-8800-9082</a></p>
      </div>

      <a href={`${import.meta.env.BASE_URL}templates/template-siswa.xlsx`} download className="inline-flex items-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-5 py-2 rounded-lg mb-6 transition shadow-sm">
        📥 Unduh Template Excel Siswa Resmi
      </a>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1B5E20] mb-1">Nama Sekolah <span className="text-red-500">*</span></label>
          <input type="text" required value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} className="w-full border border-[#4CAF50]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none bg-white" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1B5E20] mb-1">🔐 Buat PIN Akses (min. 4 digit) <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Contoh: 1234"
              className="w-full border border-[#4CAF50]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none bg-white tracking-widest"
            />
            <p className="text-xs text-gray-500 mt-1">⚠️ Simpan PIN ini untuk melihat & download dokumen nanti.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B5E20] mb-1">Upload File Excel (.xlsx) <span className="text-red-500">*</span></label>
            <input type="file" accept=".xlsx" required onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#E8F5E9] file:text-[#1B5E20] hover:file:bg-[#C8E6C9] file:font-medium file:cursor-pointer" />
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-lg whitespace-pre-line text-sm border ${
            msg.type === 'ok' ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#4CAF50]' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition shadow-md text-lg">
          {loading ? '⏳ Memvalidasi & Mengirim...' : '🚀 Kirim Data Siswa'}
        </button>
      </form>
    </div>
  );
}
