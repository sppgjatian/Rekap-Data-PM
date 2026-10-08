import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImageToCloudinary, validateImageFile } from '../utils/cloudinary';

const KATEGORI_LIST = [
  { code: 'PENGADUAN', label: 'Pengaduan' },
  { code: 'SARAN', label: 'Saran & Masukan' },
  { code: 'KENDALA', label: 'Laporan Kendala' },
  { code: 'INFO', label: 'Permintaan Informasi' },
  { code: 'APRESIASI', label: 'Apresiasi' },
  { code: 'LAINNYA', label: 'Lainnya' },
];

const UMUM_LABEL = 'Umum / Tidak terkait sekolah tertentu';

const STATUS_STYLE = {
  Menunggu: 'bg-amber-100 text-amber-800',
  Diproses: 'bg-blue-100 text-blue-800',
  Selesai: 'bg-green-100 text-green-800',
  Ditutup: 'bg-gray-200 text-gray-700',
};

const SOCIAL_LINKS = [
  { label: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com/@sppgjatian' },
  { label: 'Instagram', icon: '📸', url: 'https://www.instagram.com/sppgjatian/' },
  { label: 'WhatsApp', icon: '💬', url: 'https://wa.me/6285888009082' },
  { label: 'Google Maps', icon: '📍', url: 'https://maps.app.goo.gl/T6mUkqHFpeys8rRF9' },
];

export default function ComplaintBox({ onNavigate }) {
  const [tab, setTab] = useState('buat');
  const [schools, setSchools] = useState([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState(null);

  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');
  const [kategori, setKategori] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successTicket, setSuccessTicket] = useState('');
  const openTime = useRef(Date.now());

  const [cekInput, setCekInput] = useState('');
  const [cekResult, setCekResult] = useState(null);
  const [cekLoading, setCekLoading] = useState(false);
  const [cekError, setCekError] = useState('');

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []));
  }, []);

  const filteredSchools = schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.toLowerCase())).slice(0, 8);

  const pickSchool = (s) => {
    setSchoolName(s.name);
    setSchoolId(s.id);
    setSchoolQuery(s.name);
    setSchoolOpen(false);
  };

  const pickUmum = () => {
    setSchoolName(UMUM_LABEL);
    setSchoolId(null);
    setSchoolQuery(UMUM_LABEL);
    setSchoolOpen(false);
  };

  const onPhotoChange = (e) => {
    const f = e.target.files?.[0] || null;
    setPhotoError('');
    if (!f) { setPhotoFile(null); setPhotoPreview(''); return; }
    const v = validateImageFile(f);
    if (!v.ok) { setPhotoError(v.error); setPhotoFile(null); setPhotoPreview(''); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (honeypot) { setError('Terdeteksi sebagai spam. Laporan tidak dikirim.'); return; }
    if (!nama.trim() || !wa.trim() || !schoolName || !kategori || !judul.trim() || !isi.trim()) {
      setError('Mohon lengkapi semua kolom wajib (*).');
      return;
    }
    if (Date.now() - openTime.current < 5000) {
      setError('Formulir dikirim terlalu cepat. Tunggu beberapa detik lalu coba lagi.');
      return;
    }
    setSubmitting(true);
    let photoUrl = null;
    if (photoFile) {
      try {
        const up = await uploadImageToCloudinary(photoFile, 'sppg-jatian/pengaduan');
        photoUrl = up.url;
      } catch (err) {
        setError(err.message);
        setSubmitting(false);
        return;
      }
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: ticket, error: tErr } = await supabase.rpc('generate_ticket_number');
      if (tErr) { setError('Gagal membuat nomor tiket: ' + tErr.message); break; }
      const { error: insErr } = await supabase.from('complaints').insert({
        ticket_number: ticket,
        name: nama.trim(),
        whatsapp: wa.trim(),
        email: email.trim() || null,
        school_id: schoolId,
        school_name: schoolName,
        category: kategori,
        title: judul.trim(),
        description: isi.trim(),
        photo_url: photoUrl,
        status: 'Menunggu',
      });
      if (!insErr) { setSuccessTicket(ticket); setSubmitting(false); return; }
      if (insErr.code !== '23505') { setError('Gagal mengirim laporan: ' + insErr.message); break; }
    }
    setSubmitting(false);
  };

  const copyTicket = async () => {
    try { await navigator.clipboard.writeText(successTicket); alert('Nomor tiket disalin: ' + successTicket); }
    catch { prompt('Salin nomor tiket ini:', successTicket); }
  };

  const cekStatus = async (e) => {
    e.preventDefault();
    setCekLoading(true); setCekError(''); setCekResult(null);
    const { data } = await supabase
      .from('complaints')
      .select('ticket_number, created_at, category, school_name, title, status, updated_at, staff_notes')
      .eq('ticket_number', cekInput.trim().toUpperCase())
      .maybeSingle();
    if (!data) setCekError('Nomor tiket tidak ditemukan. Periksa kembali penulisannya.');
    else setCekResult(data);
    setCekLoading(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4CAF50] outline-none';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  /* ---------- LAYAR SUKSES ---------- */
  if (successTicket) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg animate-fade-in">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-[#4CAF50]">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-[#1B5E20]">Laporan berhasil dikirim.</h2>
          <p className="text-sm text-gray-500 mt-2">Nomor Tiket:</p>
          <p className="text-2xl font-black text-[#2E7D32] tracking-wide my-1">{successTicket}</p>
          <p className="text-xs text-gray-500 mb-5">Simpan nomor tiket ini untuk memantau status laporan Anda.</p>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={copyTicket} className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold py-3 rounded-lg transition">📋 Salin Nomor Tiket</button>
            <button onClick={() => { setSuccessTicket(''); setCekInput(successTicket); setTab('cek'); }} className="bg-[#1976D2] hover:bg-[#0D47A1] text-white font-semibold py-3 rounded-lg transition">🔎 Cek Status</button>
            <button onClick={() => onNavigate('/')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition">🏠 Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
      <button onClick={() => onNavigate('/')} className="text-sm text-[#2E7D32] font-semibold mb-4">← Kembali ke Beranda</button>
      <h1 className="text-2xl font-bold text-[#1B5E20] mb-1">📮 Kotak Pengaduan</h1>
      <p className="text-sm text-gray-500 mb-5">Sampaikan pengaduan, saran, kendala, atau apresiasi Anda. Tanpa login, identitas Anda terlindungi.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('buat')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'buat' ? 'bg-[#2E7D32] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>✍️ Buat Pengaduan</button>
        <button onClick={() => setTab('cek')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'cek' ? 'bg-[#2E7D32] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>🔎 Cek Status</button>
      </div>

      {tab === 'buat' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 space-y-4">
          {/* Honeypot anti-spam (tersembunyi) */}
          <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nama Lengkap *</label>
              <input className={inputCls} value={nama} onChange={(e) => setNama(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Nomor WhatsApp *</label>
              <input className={inputCls} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" required />
            </div>
            <div>
              <label className={labelCls}>Email (opsional)</label>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Kategori *</label>
              <select className={inputCls + ' bg-white'} value={kategori} onChange={(e) => setKategori(e.target.value)} required>
                <option value="">-- Pilih Kategori --</option>
                {KATEGORI_LIST.map((k) => <option key={k.code} value={k.label}>{k.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dropdown sekolah searchable */}
          <div className="relative">
            <label className={labelCls}>Nama Sekolah *</label>
            <input
              className={inputCls}
              value={schoolQuery}
              onChange={(e) => { setSchoolQuery(e.target.value); setSchoolOpen(true); setSchoolName(''); setSchoolId(null); }}
              onFocus={() => setSchoolOpen(true)}
              placeholder="Ketik untuk mencari sekolah..."
              required
            />
            {schoolOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                <button type="button" onClick={pickUmum} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F1F8E9] font-medium text-[#1B5E20]">
                  🌐 {UMUM_LABEL}
                </button>
                {filteredSchools.map((s) => (
                  <button type="button" key={s.id} onClick={() => pickSchool(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-[#F1F8E9]">
                    {s.name}
                  </button>
                ))}
                {filteredSchools.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Tidak ditemukan. Pilih "Umum" jika tidak terkait sekolah.</p>}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Judul Laporan *</label>
            <input className={inputCls} value={judul} onChange={(e) => setJudul(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Isi Laporan *</label>
            <textarea className={inputCls} rows={5} value={isi} onChange={(e) => setIsi(e.target.value)} required />
          </div>

          <div>
            <label className={labelCls}>Lampiran Foto (opsional, maks 2MB: JPG/PNG/WEBP)</label>
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onPhotoChange} className="block w-full text-sm text-gray-500 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#E8F5E9] file:text-[#1B5E20] file:font-semibold file:cursor-pointer" />
            {photoError && <p className="text-xs text-red-600 mt-1">⚠️ {photoError}</p>}
            {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 h-28 rounded-lg border border-gray-200 object-cover" />}
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <button type="submit" disabled={submitting} className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] disabled:opacity-50 text-white font-bold py-3 rounded-lg transition">
            {submitting ? 'Mengirim...' : '📨 Kirim Laporan'}
          </button>
        </form>
      )}

      {tab === 'cek' && (
        <div className="space-y-4">
          <form onSubmit={cekStatus} className="bg-white rounded-2xl shadow p-5 flex gap-2">
            <input className={inputCls} value={cekInput} onChange={(e) => setCekInput(e.target.value)} placeholder="Contoh: TIKET-20261008-0001" required />
            <button type="submit" disabled={cekLoading} className="bg-[#1976D2] hover:bg-[#0D47A1] disabled:opacity-50 text-white font-semibold px-5 rounded-lg transition">
              {cekLoading ? '...' : '🔎 Cek'}
            </button>
          </form>
          {cekError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{cekError}</div>}
          {cekResult && (
            <div className="bg-white rounded-2xl shadow p-5 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Nomor Tiket</span><b>{cekResult.ticket_number}</b></div>
              <div className="flex justify-between"><span className="text-gray-500">Tanggal Laporan</span><b>{new Date(cekResult.created_at).toLocaleString('id-ID')}</b></div>
              <div className="flex justify-between"><span className="text-gray-500">Kategori</span><b>{cekResult.category}</b></div>
              <div className="flex justify-between"><span className="text-gray-500">Sekolah</span><b>{cekResult.school_name}</b></div>
              <div className="flex justify-between"><span className="text-gray-500">Judul</span><b>{cekResult.title}</b></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[cekResult.status] || 'bg-gray-100'}`}>{cekResult.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Update Terakhir</span><b>{new Date(cekResult.updated_at).toLocaleString('id-ID')}</b></div>
              {cekResult.staff_notes && <div className="p-3 bg-[#F1F8E9] rounded-lg text-[#1B5E20]">💬 {cekResult.staff_notes}</div>}
            </div>
          )}
        </div>
      )}

      {/* Alternatif pengaduan via media sosial */}
      <div className="mt-8 bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold text-[#1B5E20] mb-3">📣 Alternatif Pengaduan</h3>
        <p className="text-xs text-gray-500 mb-3">Ingin menyampaikan lewat media sosial atau WhatsApp? Gunakan kanal resmi berikut:</p>
        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_LINKS.map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#F1F8E9] transition">
              <span>{s.icon}</span> {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
