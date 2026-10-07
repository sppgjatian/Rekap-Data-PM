/* ============================================================================
   3 SUMBER DATA (STATIS). Angka diketik APA ADANYA dari dokumen asli.
   Semua TOTAL di aplikasi dihitung otomatis — tidak ada total yang diketik.
   Nanti bisa diganti fetch() Supabase tanpa mengubah app.js / tampilan.
   ============================================================================ */

const SURAT_INFO = {
  nomor: "B-53171/06/VIII/2026", tanggal: "5 Oktober 2026",
  perihal: "Penetapan KPM Sementara 2 — SPPG JEMBER PAKUSARI JATIAN (OEVX3MHV)",
  sumberSps: "Lampiran I — Dapodik TA 2026/2027 Kemendikdasmen (hanya total, tanpa besar/kecil)",
  sumberAslap: "PM Collect Aslap / Ringkasan Portal MBG — dicetak 6/10/2026 23.21.13 (besar, kecil, total)",
  sumberRegistry: "Daftar Sekolah SPPG Jatian — diekspor 7 Okt 2026 23.31 (DATA LAMA: dipakai hanya sebagai jembatan NPSN & kontak; kolom TOTAL PM lama TIDAK dipakai hitung)"
};

/* SUMBER A — LAMPIRAN I SURAT (SPS / DAPODIK) */
const DATA_SPS = [
  { id:"sps01", npsn:"60715647", nama:"MI PONPES NURURROHMAN",  kel:"JATIAN",    alamat:"Jl Pemancar Telkom NS 08 Jatian Pakusari", total:50 },
  { id:"sps02", npsn:"20581524", nama:"MTS PONPES NURURROHMAN", kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", total:75 },
  { id:"sps03", npsn:"69950049", nama:"PONPES MIFTAHUL HASAN",  kel:"PAKUSARI",  alamat:"dsn krajan rt 03 rw 05 ds Pakusari Kec Pakusari", total:73 },
  { id:"sps04", npsn:"20523670", nama:"SDN PAKUSARI 02",        kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN NO. 188", total:127 },
  { id:"sps05", npsn:"20559350", nama:"TK AL-HIKMAH",           kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN", total:67 },
  { id:"sps06", npsn:"20559458", nama:"TK BINA TUNAS BANGSA",   kel:"SUBO",      alamat:"DUSUN SANGGAR", total:57 },
  { id:"sps07", npsn:"69745157", nama:"PONPES NURURROHMAN",     kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", total:14 },
  { id:"sps08", npsn:"69975761", nama:"PONPES HABIBURRAHMAN",   kel:"PAKUSARI",  alamat:"JL. KALIWINING", total:272 },
  { id:"sps09", npsn:"69896780", nama:"SPS SEDAP MALAM",        kel:"JATIAN",    alamat:"Jatian Pakusari", total:42 },
  { id:"sps10", npsn:"20581525", nama:"HABIBURRAHMAN",          kel:"PAKUSARI",  alamat:"JL KALIWINING PAKUSARI No. 09", total:95 },
  { id:"sps11", npsn:"20559672", nama:"TK PGRI BHAKTI LESTARI", kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN NO. 188", total:49 },
  { id:"sps12", npsn:"20549705", nama:"SDN PAKUSARI 01",        kel:"PAKUSARI",  alamat:"Jl. PB Sudirman 95 Pakusari", total:213 },
  { id:"sps13", npsn:"69894443", nama:"TK AL-HAMID",            kel:"SUBO",      alamat:"DUSUN SANGGAR", total:8 },
  { id:"sps14", npsn:"20549703", nama:"SDN JATIAN 03",          kel:"JATIAN",    alamat:"DUSUN PLALANGAN", total:94 },
  { id:"sps15", npsn:"20524721", nama:"SDN JATIAN 01",          kel:"JATIAN",    alamat:"JL. HIMALAYA 38", total:156 },
  { id:"sps16", npsn:"69777459", nama:"KB MUTIARA HATI",        kel:"KERTOSARI", alamat:"A.YANI KRAJAN RT.3 RW.3 KERTOSARI", total:47 },
  { id:"sps17", npsn:"69882324", nama:"PONPES MIFTAHUL HASAN",  kel:"JATIAN",    alamat:"dsn krajan rt 03 rw 05 ds Pakusari Kec Pakusari", total:56 },
  { id:"sps18", npsn:"69896765", nama:"TK AL-KHOIRIYAH",        kel:"SUBO",      alamat:"Dsn Gudang Duren RT04 RW 09 Subo Pakusari", total:66 },
  { id:"sps19", npsn:"20559722", nama:"TK SUAKA ANAK NEGERI",   kel:"JATIAN",    alamat:"JL. PAHLAWAN BURA DUSUN KROJA", total:39 },
  { id:"sps20", npsn:"20523615", nama:"SDN KERTOSARI 3",        kel:"KERTOSARI", alamat:"JL. SUMBERSUKO NO. 26", total:164 },
  { id:"sps21", npsn:"20523600", nama:"SDN KERTOSARI 2",        kel:"KERTOSARI", alamat:"JL KALIWINING PAKUSARI No. 09", total:200 },
  { id:"sps22", npsn:"69894852", nama:"HABIBURRAHMAN",          kel:"PAKUSARI",  alamat:"JL KALIWINING PAKUSARI No. 09", total:108 },
  { id:"sps23", npsn:"69745155", nama:"PONPES HABIBURRAHMAN",   kel:"PAKUSARI",  alamat:"JL. KALIWINING", total:34 },
  { id:"sps24", npsn:"69894851", nama:"PONPES NURURROHMAN",     kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", total:80 }
];

/* SUMBER B — PM COLLECT ASLAP (DATA LAPANGAN) */
const DATA_ASLAP = [
  { id:"asl01", nama:"KB MUTIARA HATI",               besar:8,   kecil:45 },
  { id:"asl02", nama:"MA HABIBURROHMAN",              besar:89,  kecil:0 },
  { id:"asl03", nama:"MA.K NURURRAHMAN",              besar:62,  kecil:0 },
  { id:"asl04", nama:"MI HABIBURROHMAN",              besar:20,  kecil:15 },
  { id:"asl05", nama:"MI NURURRAHMAN",                besar:36,  kecil:10 },
  { id:"asl06", nama:"MTs HABIBURROHMAN",             besar:84,  kecil:0 },
  { id:"asl07", nama:"MTS UNGGULAN NURURRAHMAN",      besar:66,  kecil:0 },
  { id:"asl08", nama:"NURURRAHMAN Data Susulan Guru", besar:2,   kecil:0 },
  { id:"asl09", nama:"PAUD AL KHOIRIYAH",             besar:10,  kecil:72 },
  { id:"asl10", nama:"PP MIFTAHUL HASAN (MA)",        besar:62,  kecil:0 },
  { id:"asl11", nama:"RA HABIBURROHMAN",              besar:3,   kecil:36 },
  { id:"asl12", nama:"RA NURURRAHMAN",                besar:4,   kecil:9 },
  { id:"asl13", nama:"SDN Jatian 01",                 besar:75,  kecil:84 },
  { id:"asl14", nama:"SDN JATIAN 02",                 besar:98,  kecil:84 },
  { id:"asl15", nama:"SDN JATIAN 03",                 besar:58,  kecil:38 },
  { id:"asl16", nama:"SDN PAKUSARI 01",               besar:106, kecil:112 },
  { id:"asl17", nama:"SDN PAKUSARI 02",               besar:65,  kecil:66 },
  { id:"asl18", nama:"SMP ISLAM MIFTAHUL HASAN",      besar:57,  kecil:0 },
  { id:"asl19", nama:"SPS SEDAP MALAM 36",            besar:5,   kecil:40 },
  { id:"asl20", nama:"TK AL HIKMAH",                  besar:7,   kecil:65 },
  { id:"asl21", nama:"TK AL-HAMID",                   besar:2,   kecil:7 },
  { id:"asl22", nama:"TK BINA TUNAS BANGSA",          besar:5,   kecil:56 },
  { id:"asl23", nama:"TK PGRI BHAKTI LESTARI",        besar:3,   kecil:46 },
  { id:"asl24", nama:"TK SUAKA ANAK NEGERI",          besar:4,   kecil:39 }
];

/* SUMBER C — DAFTAR SEKOLAH LAMA (DATA LAMA): jembatan NPSN + kontak.
   pmLama HANYA referensi, tidak pernah masuk perhitungan. */
const REGISTRY = [
  { npsn:"20559672", jenjang:"Taman Kanak-Kanak",      nama:"TK PGRI BHAKTI LESTARI",  status:"Swasta", kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN NO. 188", pmLama:57,  pic:"Holipa Hoiriya",       wa:"",            kepsek:"HOLIPA HOIRIYAH" },
  { npsn:"20559350", jenjang:"Taman Kanak-Kanak",      nama:"TK AL HIKMAH",            status:"Swasta", kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN", pmLama:69,  pic:"Ita Ninik Rohyatin",     wa:"",            kepsek:"Dra. ITA NINIK ROHIYATIN" },
  { npsn:"20559458", jenjang:"Taman Kanak-Kanak",      nama:"TK BINA TUNAS BANGSA",    status:"Swasta", kel:"SUBO",      alamat:"DUSUN SANGGAR", pmLama:53,  pic:"Agustina Fauziah",       wa:"85232744328", kepsek:"AGUSTINA FAUZIAH, S.Pd" },
  { npsn:"20523670", jenjang:"Sekolah Dasar",          nama:"SDN PAKUSARI 02",         status:"Negeri", kel:"PAKUSARI",  alamat:"JL. PB SUDIRMAN NO. 188", pmLama:125, pic:"Moh Irfan Efendi",       wa:"",            kepsek:"Drs. TRI HARI NUGROHO" },
  { npsn:"69896765", jenjang:"Taman Kanak-Kanak",      nama:"TK AL-KHOIRIYAH SUBO",    status:"Swasta", kel:"SUBO",      alamat:"Dsn Gudang Duren RT04 RW 09 Subo Pakusari", pmLama:58, pic:"Hartatik", wa:"85158373397", kepsek:"WINARNI" },
  { npsn:"20524721", jenjang:"Sekolah Dasar",          nama:"SDN JATIAN 01",           status:"Negeri", kel:"JATIAN",    alamat:"JL. HIMALAYA 38", pmLama:156, pic:"Soelistiyo Rini",        wa:"81252605562", kepsek:"JOKO TRIHANANTO" },
  { npsn:"69896780", jenjang:"Pendidikan Anak Usia Dini", nama:"SPS SEDAP MALAM 36",   status:"Swasta", kel:"JATIAN",    alamat:"Jatian Pakusari", pmLama:45,  pic:"Rutifatul Rofiah",       wa:"",            kepsek:"RUTIFATUL ROFIAH" },
  { npsn:"69777459", jenjang:"Kelompok Bermain (KB)",  nama:"KB MUTIARA HATI",         status:"Swasta", kel:"KERTOSARI", alamat:"JL. AHMAD YANI DUSUN KRAJAN", pmLama:48, pic:"Dnid Agux Timxxxxxx", wa:"81232724164", kepsek:"AGUS TIMURWATI, SE" },
  { npsn:"20559722", jenjang:"Taman Kanak-Kanak",      nama:"TK SUAKA ANAK NEGERI",    status:"Swasta", kel:"JATIAN",    alamat:"JL. PAHLAWAN BURA DUSUN KROJA", pmLama:48, pic:"Ma'rifatul Munawaroh", wa:"", kepsek:"MA'RIFATUL MUNAWAROH, S.Pd" },
  { npsn:"20523615", jenjang:"Sekolah Dasar",          nama:"SDN KERTOSARI 3",         status:"Negeri", kel:"KERTOSARI", alamat:"JL. SUMBERSUKO NO. 26", pmLama:156, pic:"Sri Suhartatik",         wa:"",            kepsek:"BUDI SUHARIYANTO" },
  { npsn:"20549705", jenjang:"Sekolah Dasar",          nama:"SDN PAKUSARI 01",         status:"Negeri", kel:"PAKUSARI",  alamat:"Jl. PB Sudirman 95 Pakusari", pmLama:226, pic:"Puspita Dwi Utami",      wa:"",            kepsek:"Nurul Badrih, S.Pd" },
  { npsn:"20549703", jenjang:"Sekolah Dasar",          nama:"SDN JATIAN 03",           status:"Negeri", kel:"JATIAN",    alamat:"DUSUN PLALANGAN", pmLama:105, pic:"Misbahul Ulum",          wa:"",            kepsek:"EVI PUSPITA WIJAYANTI" },
  { npsn:"20524458", jenjang:"Sekolah Dasar",          nama:"SD JATIAN 2",             status:"Negeri", kel:"JATIAN",    alamat:"JL. PAHLAWAN BURA NO. 163", pmLama:179, pic:"Yelli Aristya Atma Dewi", wa:"85736727728", kepsek:"JUHAIRIYAH, S.Pd" },
  { npsn:"69894443", jenjang:"Taman Kanak-Kanak",      nama:"TK AL-HAMID",             status:"Swasta", kel:"SUBO",      alamat:"DUSUN SANGGAR", pmLama:16,  pic:"Sayu Wiwit",             wa:"",            kepsek:"SAYU WIWIT" },
  { npsn:"69882324", jenjang:"Madrasah Tsanawiyah",    nama:"PP MIFTAHUL HASAN (MTS)", status:"Swasta", kel:"PAKUSARI",  alamat:"Dsn Krajan RT 03 RW 05 Ds Pakusari Kec Pakusari", pmLama:42, pic:"Muzammil", wa:"", kepsek:"Muzammil" },
  { npsn:"69950049", jenjang:"Madrasah Aliyah",        nama:"PP MIFTAHUL HASAN (MA)",  status:"Swasta", kel:"PAKUSARI",  alamat:"Dsn Krajan RT 03 RW 05 Ds Pakusari Kec Pakusari", pmLama:63, pic:"Muzammil", wa:"", kepsek:"Muzammil" },
  { npsn:"69745155", jenjang:"Raudhatul Athfal",       nama:"PP HABIBURRAHMAN (RA)",   status:"Swasta", kel:"PAKUSARI",  alamat:"JL. KALIWINING", pmLama:32,  pic:"Ratna Jayanti",          wa:"",            kepsek:"KH. ABDURRAHMAN" },
  { npsn:"69975761", jenjang:"Madrasah Ibtidaiyah",    nama:"PP HABIBURRAHMAN (MI)",   status:"Swasta", kel:"PAKUSARI",  alamat:"JL. KALIWINING", pmLama:28,  pic:"Ratna Jayanti",          wa:"",            kepsek:"KH. ABDURRAHMAN" },
  { npsn:"69894852", jenjang:"Madrasah Tsanawiyah",    nama:"PP HABIBURRAHMAN (MTS)",  status:"Swasta", kel:"PAKUSARI",  alamat:"JL KALIWINING PAKUSARI NO. 09", pmLama:91, pic:"Ratna Jayanti", wa:"", kepsek:"KH. ABDURRAHMAN" },
  { npsn:"20581525", jenjang:"Madrasah Aliyah",        nama:"PP HABIBURRAHMAN (MA)",   status:"Swasta", kel:"PAKUSARI",  alamat:"JL KALIWINING PAKUSARI NO. 09", pmLama:107, pic:"Ratna Jayanti", wa:"", kepsek:"KH. ABDURRAHMAN" },
  { npsn:"69715457", jenjang:"Raudhatul Athfal",       nama:"PP NURURROHMAN (RA)",     status:"Swasta", kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", pmLama:10, pic:"Siti Sholehah",         wa:"",            kepsek:"Drs. KHALIGURRAHMAN HARI" },
  { npsn:"60715647", jenjang:"Madrasah Ibtidaiyah",    nama:"PP NURURROHMAN (MI)",     status:"Swasta", kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", pmLama:53, pic:"Dnid Sayxxxxx",         wa:"",            kepsek:"Drs. KHALIGURRAHMAN HARI" },
  { npsn:"20581524", jenjang:"Madrasah Tsanawiyah",    nama:"PP NURURROHMAN (MTS)",    status:"Swasta", kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", pmLama:75, pic:"Shiddiqi",              wa:"",            kepsek:"Drs. KHALIGURRAHMAN HARI" },
  { npsn:"69894851", jenjang:"Madrasah Aliyah",        nama:"PP NURURROHMAN (MA)",     status:"Swasta", kel:"JATIAN",    alamat:"JL. PEMANCAR TELKOM", pmLama:85, pic:"Dnid Fatxxxxx",         wa:"",            kepsek:"Drs. KHALIGURRAHMAN HARI" }
];

/* JEMBATAN: Aslap -> NPSN (daftar lama). asl08 = susulan guru (tanpa NPSN). */
const ASLAP_TO_NPSN = {
  asl01:"69777459", asl02:"20581525", asl03:"69894851", asl04:"69975761", asl05:"60715647",
  asl06:"69894852", asl07:"20581524", asl08:null,       asl09:"69896765", asl10:"69950049",
  asl11:"69745155", asl12:"69715457", asl13:"20524721", asl14:"20524458", asl15:"20549703",
  asl16:"20549705", asl17:"20523670", asl18:"69882324", asl19:"69896780", asl20:"20559350",
  asl21:"69894443", asl22:"20559458", asl23:"20559672", asl24:"20559722"
};

/* ALIAS NPSN (transposisi digit daftar lama vs surat): satuan yang sama
   (PP NURURROHMAN RA / PONPES NURURROHMAN, Jl. Pemancar Telkom, Jatian). */
const NPSN_ALIAS = { "69715457": "69745157" };
