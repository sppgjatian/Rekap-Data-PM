import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseExcel, validateExcel } from '../utils/excelValidator';

export default function TeacherForm({ onSuccess }) {
  const [tingkat, setTingkat] = useState('');
  const [namaSekolah, setNamaSekolah] = useState('');
  const [tipeId, setTipeId] = useState('NPSN');
  const [kodeId, setKodeId] = useState('');
  const [namaKepsek, setNamaKepsek] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [pin, setPin] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    
    // Validasi field wajib (tanpa email)
    if (!tingkat || !namaSekolah || !kodeId || !namaKepsek || !noTelp || !pin || !file) {
      setMsg({ type: 'err', text: 'Lengkapi semua field wajib termasuk PIN.' });
      return;
    }
    if (pin.length < 4) {
      setMsg({ type: 'err', text: 'PIN minimal 4 digit.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Parse & Validasi Excel
      const rows = await parseExcel(file);
      const v = validateExcel(rows, 'Guru');
      
      if (!v.ok) {
        setMsg({ type: 'err', text: '❌ Validasi gagal:\n' + v.errors.slice(0, 5).join('\n') });
        setLoading(false);
        return;
      }

      // 2. Upload File ke Supabase Storage
      const fileName = `guru/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('submissions').upload(fileName, file, { upsert: false });
      if (upErr) throw upErr;
      
      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(fileName);

      // 3. Insert Metadata ke Database (TANPA EMAIL)
      const { data: meta, error: metaErr } = await supabase
        .from('submission_metadata')
        .insert([{ 
          nama_sekolah: namaSekolah, 
          tingkat_sekolah: tingkat, 
          tipe_identitas: tipeId, 
          kode_identitas: kodeId, 
          nama_kepsek: namaKepsek, 
          no_telepon: noTelp, 
          kategori_form: 'Guru', 
          status_validasi: 'VALID', 
          nama_file: file.name, 
          file_url: urlData.publicUrl, 
          pin: pin 
        }])
        .select().single();
        
      if (metaErr) throw metaErr;

      // 4. Insert Detail Baris Excel
      const detailRows = v.data.map((r, i) => ({
        submission_id: meta.id, 
        row_index: i + 1, 
        nama_sekolah: namaSekolah,
        nama_lengkap: r.nama_lengkap, 
        tanggal_lahir: r.tanggal_lahir, 
        gender: r.gender,
        nik: r.nik, 
        sub_kategori: r.sub_kategori, 
        raw_data: r,
      }));
      
      if (detailRows.length) {
        const { error: detErr } = await supabase.from('penerima_manfaat_detail').insert(detailRows);
        if (detErr) throw detErr;
      }

      // 5. Sukses
      setMsg({ type: 'ok', text: '✅ Data Guru/Pendukung berhasil dikirim! Simpan PIN Anda untuk mengakses file nanti.' });
      
      // Reset Form
      setTingkat(''); setNamaSekolah(''); setKodeId(''); 
      setNamaKepsek(''); setNoTelp(''); setPin(''); setFile(null);
      
      // Panggil callback untuk update status di App.jsx
      if (onSuccess) onSuccess('Guru');

    } catch (err) {
      console.error(err);
      setMsg({ type: 'err', text: 'Gagal mengirim: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const tingkatOpts = ['PAUD','TK/RA','SD/MI','SMP/MTs','SMA/MA/SMK/MAK'];
  const tipeOpts = ['NPSN','NSM','TPK'];

  return (
    <div className="bg-[#FFF8E1] border-2 border-[#F9A825] rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-[#E65100] mb-1">📕 Formulir Data Guru & Pendukung</h2>
      <p className="text-sm text-[#F57F17] mb-4">Lengkapi data dan unggah file template. Buat PIN untuk mengakses dokumen Anda nanti.</p>

      <div className="bg-white p-4 rounded-xl border-l-4 border-[#F9A825] mb-6 text-sm text-gray-700 space-y-1">
        <p>📌 Pastikan dokumen valid & sesuai data resmi sekolah.</p>
        <p>⚠️ <b>Jangan gunakan template siswa</b> untuk data guru/pendukung — sistem akan menolak otomatis.</p>
        <p>⚠️ Header dan format template tidak boleh diubah.</p>
        <p>📞 Bantuan: <b>Diah Ayu Umami</b> — <a href="tel:+6285888009082" className="text-[#F57F17] underline">+62 858-8800-9082</a></p>
      </div>

      <a href={`${import.meta.env.BASE_URL}templates/template-guru.xlsx`} download className="inline-flex items-center gap-2 bg-[#F9A825] hover:bg-[#F57F17] text-white px-5 py-2 rounded-lg mb-6 transition shadow-sm">
        📥 Unduh Template Excel Guru & Pendukung Resmi
      </a>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tingkat Sekolah */}
        <div>
          <label className="block text-sm font-medium text-[#E65100] mb-2">Tingkat Sekolah <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {tingkatOpts.map((t) => (
              <label key={t} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${tingkat===t?'bg-[#FFF8E1] border-[#F9A825] ring-1 ring-[#F9A825]':'border-[#F9A825]/30 bg-white hover:bg-[#FFF8E1]'}`}>
                <input type="radio" name="tingkat" value={t} checked={tingkat===t} onChange={(e)=>setTingkat(e.target.value)} className="accent-[#F9A825]"/>
                <span className="text-sm text-gray-800">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Grid Input Data Sekolah */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Nama Sekolah <span className="text-red-500">*</span></label>
            <input type="text" required value={namaSekolah} onChange={(e)=>setNamaSekolah(e.target.value)} className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F9A825] outline-none bg-white"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Tipe Identitas</label>
            <select value={tipeId} onChange={(e)=>setTipeId(e.target.value)} className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-[#F9A825] outline-none">
              {tipeOpts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Kode Identitas (NPSN/NSM/TPK) <span className="text-red-500">*</span></label>
            <input type="text" required value={kodeId} onChange={(e)=>setKodeId(e.target.value)} className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F9A825] outline-none bg-white"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Nama Kepala Sekolah <span className="text-red-500">*</span></label>
            <input type="text" required value={namaKepsek} onChange={(e)=>setNamaKepsek(e.target.value)} className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F9A825] outline-none bg-white"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Nomor Telepon <span className="text-red-500">*</span></label>
            <input type="tel" required value={noTelp} onChange={(e)=>setNoTelp(e.target.value)} className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F9A825] outline-none bg-white"/>
          </div>
        </div>

        {/* PIN & Upload File */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1"> Buat PIN Akses (min. 4 digit) <span className="text-red-500">*</span></label>
            <input 
              type="password" 
              required 
              value={pin} 
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Contoh: 1234"
              className="w-full border border-[#F9A825]/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F9A825] outline-none bg-white tracking-widest" 
            />
            <p className="text-xs text-gray-500 mt-1">⚠️ Simpan PIN ini! Anda membutuhkannya untuk melihat & download dokumen.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#E65100] mb-1">Upload File Excel (.xlsx) <span className="text-red-500">*</span></label>
            <input type="file" accept=".xlsx" required onChange={(e)=>setFile(e.target.files[0])} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#FFF8E1] file:text-[#E65100] hover:file:bg-[#FFECB3] file:font-medium file:cursor-pointer"/>
          </div>
        </div>

        {/* Pesan Error/Sukses */}
        {msg && (
          <div className={`p-3 rounded-lg whitespace-pre-line text-sm border ${
            msg.type==='ok' ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#4CAF50]' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Tombol Submit */}
        <button type="submit" disabled={loading} className="w-full bg-[#F9A825] hover:bg-[#F57F17] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition shadow-md text-lg">
          {loading ? ' Memvalidasi & Mengirim...' : ' Kirim Data Guru/Pendukung'}
        </button>
      </form>
    </div>
  );
}
