import { useState, useEffect } from 'react';
import StudentForm from './components/StudentForm';
import TeacherForm from './components/TeacherForm';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import TemplateModal from './components/TemplateModal';

export default function App() {
  const [activeForm, setActiveForm] = useState(null);
  const [notif, setNotif] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => {
    const submittedSiswa = localStorage.getItem('mbg_submitted_Siswa') === 'true';
    const submittedGuru = localStorage.getItem('mbg_submitted_Guru') === 'true';

    if (submittedSiswa && !submittedGuru) {
      setNotif('⚠️ Anda sudah mengisi Data Siswa. Jangan lupa lengkapi juga Formulir Guru & Pendukung.');
    } else if (!submittedSiswa && submittedGuru) {
      setNotif('⚠️ Anda sudah mengisi Data Guru. Jangan lupa lengkapi juga Formulir Data Siswa.');
    }
  }, [activeForm, showAdmin]);
  // Pasang favicon dari logo BGN di folder public
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = `${import.meta.env.BASE_URL}favicon.png`;
    document.head.appendChild(link);
  }, []);

  const openForm = (type) => {
    setActiveForm(type);
    document.body.style.overflow = 'hidden';
  };

  const closeForm = () => {
    setActiveForm(null);
    document.body.style.overflow = 'auto';
  };

  const handleSuccess = (type) => {
    localStorage.setItem(`mbg_submitted_${type}`, 'true');
    const otherType = type === 'Siswa' ? 'Guru' : 'Siswa';
    const isOtherSubmitted = localStorage.getItem(`mbg_submitted_${otherType}`) === 'true';

    if (!isOtherSubmitted) {
      setNotif(`✅ Data ${type} berhasil dikirim! 📌 PENTING: Segera lengkapi juga pengisian Formulir ${otherType}.`);
    } else {
      setNotif(`✅ Data ${type} berhasil dikirim! Terima kasih, data Anda sudah lengkap.`);
    }

    setTimeout(() => closeForm(), 2000);
    setTimeout(() => setNotif(null), 10000);
  };

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden p-1">
              <img
                src={`${import.meta.env.BASE_URL}logo-sppg.png`}
                alt="Logo SPPG Jatian"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">SPPG JATIAN PAKUSARI</h1>
              <p className="text-xs text-green-100">Dashboard Monitoring Pengumpulan File</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdmin(true)}
            className="text-xs bg-[#F9A825] hover:bg-[#F57F17] text-[#1B5E20] font-semibold px-4 py-2 rounded-lg transition shadow-md"
          >
            🔐 Admin
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* TOMBOL TUNGGAL UNDUH TEMPLATE */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div>
            <p className="text-sm font-semibold text-[#1B5E20]">📥 Unduh Template</p>
            <p className="text-xs text-gray-500">Wajib Menggunakan Template dari kami</p>
          </div>
          <button
            onClick={() => setShowTemplate(true)}
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-md"
          >
            📥 Unduh Template
          </button>
        </div>
        {/* BANNER PENGUMUMAN PENTING */}
        <div className="bg-[#FFF3E0] border-2 border-[#F57C00] rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-[#E65100] text-sm mb-1">PENGUMUMAN UNTUK SELURUH PIC/Operator SEKOLAH!</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Sebelumnya pengumpulan data dilakukan melalui <b>Google Forms tanpa validasi</b>, sehingga banyak ditemukan file yang tidak sesuai: template yang sudah tidak digunakan masih dipakai, bahkan <b>template guru digunakan untuk data siswa</b>. Mulai sekarang, portal ini dilengkapi <b>validasi otomatis</b>. File yang tidak sesuai template kami akan <b>ditolak otomatis oleh sistem</b>.
              </p>
              <ul className="text-sm text-gray-700 mt-2 list-disc list-inside space-y-1">
                <li>Formulir Siswa → wajib pakai <b>Template Siswa</b>.</li>
                <li>Formulir Guru & Pendukung → wajib pakai <b>Template Guru & Pendukung</b>.</li>
                <li>Jangan menukar template antar formulir — sistem akan mendeteksi dan menolaknya.</li>
                    <li><span className="neon-readable">⚠️ Unduh template terbaru HANYA dari portal ini, JANGAN dari file lama/kiriman chat!</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2 KARTU MENU UTAMA */}
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => openForm('Siswa')}
            className="p-6 rounded-2xl border-2 border-[#4CAF50]/30 bg-white text-left transition-all hover:shadow-lg hover:border-[#2E7D32] hover:scale-[1.02]"
          >
            <div className="text-3xl mb-2">📘</div>
            <h3 className="text-xl font-bold text-[#1B5E20]">Formulir Data Siswa</h3>
            <p className="text-sm text-gray-600 mt-1">Klik di sini untuk mengisi dan mengunggah data penerima manfaat siswa.</p>
            {localStorage.getItem('mbg_submitted_Siswa') === 'true' && (
              <span className="inline-block mt-3 text-xs bg-[#E8F5E9] text-[#2E7D32] px-2 py-1 rounded-full font-semibold">✅ Sudah Diisi</span>
            )}
          </button>

          <button
            onClick={() => openForm('Guru')}
            className="p-6 rounded-2xl border-2 border-[#F9A825]/30 bg-white text-left transition-all hover:shadow-lg hover:border-[#F57F17] hover:scale-[1.02]"
          >
            <div className="text-3xl mb-2">📕</div>
            <h3 className="text-xl font-bold text-[#E65100]">Formulir Guru & Pendukung</h3>
            <p className="text-sm text-gray-600 mt-1">Klik di sini untuk mengisi dan mengunggah data guru serta tenaga pendukung.</p>
            {localStorage.getItem('mbg_submitted_Guru') === 'true' && (
              <span className="inline-block mt-3 text-xs bg-[#FFF8E1] text-[#F57F17] px-2 py-1 rounded-full font-semibold">✅ Sudah Diisi</span>
            )}
          </button>
        </div>

        {/* NOTIFIKASI SILANG */}
        {notif && (
          <div className="bg-[#FFF8E1] border-l-4 border-[#F9A825] p-4 rounded-r-lg shadow-sm animate-slide-down">
            <p className="text-sm text-[#E65100] font-medium">{notif}</p>
          </div>
        )}

        {/* DASHBOARD */}
        <div className="pt-4">
          <Dashboard />
        </div>

      </main>

      <footer className="text-center text-xs text-gray-500 py-8 bg-white border-t">
        © {new Date().getFullYear()} SPPG Jatian Pakusari · portalspggjatian.my.id · Badan Gizi Nasional
      </footer>

      {/* OVERLAY FORMULIR */}
      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl animate-slide-up">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition z-10"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6 md:p-8">
              {activeForm === 'Siswa' && <StudentForm onSuccess={handleSuccess} />}
              {activeForm === 'Guru' && <TeacherForm onSuccess={handleSuccess} />}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY ADMIN */}
      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {/* OVERLAY UNDUH TEMPLATE */}
      {showTemplate && (
        <TemplateModal onClose={() => setShowTemplate(false)} />
      )}
    </div>
  );
}
