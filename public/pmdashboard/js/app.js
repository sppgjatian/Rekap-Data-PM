/* ================= STATE ================= */
const LS_KEY = "mbg-rekon-npsn-v2";
let state = freshState();
let charts = {}, rekonSort = { key:null, dir:1 };

function freshState(){ return {
  sps: JSON.parse(JSON.stringify(DATA_SPS)),
  aslap: JSON.parse(JSON.stringify(DATA_ASLAP)),
  mapNpsn: Object.assign({}, ASLAP_TO_NPSN),   // aslapId -> NPSN (bisa dikoreksi user)
  meta: {}                                      // aslapId -> 'manual'
};}
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify({
  spsTotals: Object.fromEntries(state.sps.map(s=>[s.id,s.total])),
  aslapVals: Object.fromEntries(state.aslap.map(a=>[a.id,{besar:a.besar,kecil:a.kecil}])),
  mapNpsn: state.mapNpsn, meta: state.meta })); }
function loadState(){ const raw = localStorage.getItem(LS_KEY); if(!raw) return;
  try{ const d = JSON.parse(raw);
    state.sps.forEach(s=>{ if(Number.isInteger(d.spsTotals?.[s.id])) s.total = d.spsTotals[s.id]; });
    state.aslap.forEach(a=>{ if(d.aslapVals?.[a.id]){ a.besar=d.aslapVals[a.id].besar; a.kecil=d.aslapVals[a.id].kecil; } });
    if(d.mapNpsn) state.mapNpsn = d.mapNpsn; if(d.meta) state.meta = d.meta;
  }catch(e){ console.warn(e); } }

/* ================= HELPERS ================= */
const fmt = n => Number(n).toLocaleString("id-ID");
const signed = n => (n>0?"+":"") + fmt(n);
const aTot = a => a.besar + a.kecil;
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const effNpsn = raw => raw ? (NPSN_ALIAS[raw] || raw) : null;
const spsByNpsn = n => state.sps.find(s=>s.npsn===n);
const REG_BY_EFF = {}; REGISTRY.forEach(r=> REG_BY_EFF[effNpsn(r.npsn)] = r);
const waLink = wa => { if(!wa) return null; let d=String(wa).replace(/\D/g,""); if(d.startsWith("0")) d="62"+d.slice(1); else if(d.startsWith("8")) d="62"+d; return "https://wa.me/"+d; };
function set(id,v){ const el=document.getElementById(id); el.textContent=v; return el; }

/* ================= MESIN REKONSILIASI (BERBASIS NPSN) ================= */
function buildRekon(){
  const rows = [], usedSps = new Set();
  state.aslap.forEach(a=>{
    const raw = state.mapNpsn[a.id] ?? null;
    const eff = effNpsn(raw);
    const sps = eff ? spsByNpsn(eff) : null;
    if (sps) usedSps.add(sps.id);
    const reg = eff ? REG_BY_EFF[eff] : null;
    const sT = sps ? sps.total : null, aT = aTot(a);
    rows.push({
      aslap:a, sps, reg, npsn: eff, npsnLama: raw, alias: !!(raw && NPSN_ALIAS[raw]),
      nama: a.nama, jenjang: reg?.jenjang || "—",
      spsTotal: sT, besar:a.besar, kecil:a.kecil, aslapTotal:aT,
      selisih: aT - (sT ?? 0),
      status: sps ? (sT===aT ? "Cocok" : "Selisih") : "Hanya di Aslap",
      manual: state.meta[a.id]==="manual"
    });
  });
  state.sps.filter(s=>!usedSps.has(s.id)).forEach(s=>{
    rows.push({ aslap:null, sps:s, reg:REG_BY_EFF[s.npsn]||null, npsn:s.npsn, npsnLama:null, alias:false,
      nama:s.nama, jenjang:REG_BY_EFF[s.npsn]?.jenjang || "—",
      spsTotal:s.total, besar:null, kecil:null, aslapTotal:null, selisih:-s.total,
      status:"Hanya di SPS/Dapodik", manual:false });
  });
  return rows;
}
const badge = st => ({"Cocok":"b-ok","Selisih":"b-diff","Hanya di Aslap":"b-aslap","Hanya di SPS/Dapodik":"b-sps"}[st]);

/* ================= RENDER ================= */
function renderAll(){ renderDashboard(); renderSps(); renderAslap(); renderRekon(); renderCharts(); }

function renderDashboard(){
  const rows = buildRekon();
  const pairs = rows.filter(r=>r.sps && r.aslap);
  const onlyA = rows.filter(r=>r.status==="Hanya di Aslap");
  const onlyS = rows.filter(r=>r.status==="Hanya di SPS/Dapodik");
  const totSps = state.sps.reduce((s,x)=>s+x.total,0);
  const totB = state.aslap.reduce((s,x)=>s+x.besar,0);
  const totK = state.aslap.reduce((s,x)=>s+x.kecil,0);
  const netto = pairs.reduce((s,r)=>s+r.selisih,0);
  const aliasN = rows.filter(r=>r.alias).length;

  set("statSps", fmt(totSps)); set("statSpsSub", state.sps.length+" satuan • Surat "+SURAT_INFO.nomor);
  set("statAslap", fmt(totB+totK)); set("statAslapSub", "Besar "+fmt(totB)+" + Kecil "+fmt(totK)+" • "+state.aslap.length+" baris Aslap");
  set("statPair", fmt(pairs.length)); set("statPairSub", aliasN+" di antaranya via alias NPSN (ditandai)");
  const ne = set("statNetto", signed(netto));
  ne.className = "card-num " + (netto===0?"text-emerald-600":netto>0?"text-blue-600":"text-amber-600");

  const counts = {"Cocok":0,"Selisih":0,"Hanya di Aslap":0,"Hanya di SPS/Dapodik":0};
  rows.forEach(r=>counts[r.status]++);
  document.getElementById("statusList").innerHTML = Object.entries(counts).map(([k,v])=>
    `<div class="flex items-center justify-between"><span class="badge ${badge(k)}">${k}</span><b>${v}</b></div>`).join("");

  // insight otomatis
  const top = pairs.slice().sort((a,b)=>Math.abs(b.selisih)-Math.abs(a.selisih));
  const ins = [];
  top.slice(0,3).forEach(r=> ins.push(`Selisih terbesar: <b>${esc(r.nama)}</b> (NPSN ${r.npsn}) → Aslap ${fmt(r.aslapTotal)} vs Surat ${fmt(r.spsTotal)} = <b>${signed(r.selisih)}</b>. Perlu verifikasi lapangan/surat.`));
  if (aliasN) ins.push(`Terdeteksi <b>${aliasN} alias NPSN</b> (transposisi digit daftar lama vs surat) — ditandai ungu, kedua NPSN ditampilkan transparan.`);
  if (onlyA.length) ins.push(`<b>${onlyA.length} baris Aslap</b> tidak punya padanan di surat: ${onlyA.map(r=>esc(r.nama)).join(", ")}.`);
  if (onlyS.length) ins.push(`<b>${onlyS.length} satuan surat</b> belum ada data Aslap: ${onlyS.map(r=>esc(r.nama)).join(", ")} — konfirmasi ke PIC.`);
  const cocok = pairs.filter(r=>r.status==="Cocok");
  ins.push(`<b>${cocok.length} pasangan cocok persis</b>: ${cocok.map(r=>esc(r.nama)).join(", ") || "—"}.`);
  document.getElementById("insightList").innerHTML = ins.map(i=>`<li>${i}</li>`).join("");

  document.getElementById("unmatchedBox").innerHTML = `
    <div><p class="font-bold text-blue-700 mb-1"><i class="fas fa-clipboard-list"></i> Hanya di Aslap (${onlyA.length})</p>
      <div>${onlyA.map(r=>`<span class="chip bg-blue-50 text-blue-700">${esc(r.nama)}${r.npsn?" • "+r.npsn:" • tanpa NPSN"} • ${fmt(r.aslapTotal)}</span>`).join("")||"—"}</div></div>
    <div><p class="font-bold text-red-700 mb-1"><i class="fas fa-file-contract"></i> Hanya di Surat (${onlyS.length})</p>
      <div>${onlyS.map(r=>`<span class="chip bg-red-50 text-red-700">${esc(r.nama)} • ${r.npsn} • ${fmt(r.spsTotal)}</span>`).join("")||"—"}</div></div>
    <p class="text-xs text-gray-500">Koreksi padanan lewat tombol <b>Detail</b> di halaman Rekonsiliasi.</p>`;

  document.getElementById("sourceInfo").innerHTML = `
    <p><b>1. Surat:</b> ${SURAT_INFO.nomor}, ${SURAT_INFO.tanggal} — ${esc(SURAT_INFO.perihal)}. ${esc(SURAT_INFO.sumberSps)}.</p>
    <p><b>2. Lapangan:</b> ${esc(SURAT_INFO.sumberAslap)}.</p>
    <p><b>3. Jembatan identitas:</b> ${esc(SURAT_INFO.sumberRegistry)}.</p>
    <p><b>Rumus:</b> Selisih = Total Aslap − Alokasi Surat. Semua total dihitung otomatis dari baris data.</p>`;
  document.getElementById("headerMeta").textContent = "Surat "+SURAT_INFO.nomor+" • "+SURAT_INFO.tanggal;
}

function renderSps(){
  const q = (document.getElementById("spsSearch").value||"").toLowerCase();
  const paired = new Set(buildRekon().filter(r=>r.sps&&r.aslap).map(r=>r.sps.id));
  const list = state.sps.filter(s=>(s.nama+s.npsn+s.kel).toLowerCase().includes(q));
  document.getElementById("spsBody").innerHTML = list.map((s,i)=>`<tr>
    <td class="text-gray-400">${i+1}</td><td class="font-mono text-xs">${s.npsn}</td>
    <td class="font-semibold">${esc(s.nama)}</td><td class="text-xs">PAKUSARI / ${s.kel}</td>
    <td class="text-center"><button class="num-edit text-violet-700" data-kind="sps" data-id="${s.id}" data-value="${s.total}">${fmt(s.total)}</button></td>
    <td class="text-center"><span class="badge ${paired.has(s.id)?"b-ok":"b-sps"}">${paired.has(s.id)?"✓ berpasangan":"belum"}</span></td>
    <td class="text-center"><button class="text-blue-600 text-xs font-bold" onclick="openModalSps('${s.id}')"><i class="fas fa-circle-info"></i></button></td></tr>`).join("");
  set("spsCount", list.length+" dari "+state.sps.length+" baris");
  set("spsFoot", fmt(state.sps.reduce((s,x)=>s+x.total,0)));
}

function renderAslap(){
  const q = (document.getElementById("aslapSearch").value||"").toLowerCase();
  const list = state.aslap.filter(a=>(a.nama+(state.mapNpsn[a.id]||"")).toLowerCase().includes(q));
  document.getElementById("aslapBody").innerHTML = list.map((a,i)=>{
    const raw = state.mapNpsn[a.id] ?? null, eff = effNpsn(raw);
    const reg = eff?REG_BY_EFF[eff]:null;
    return `<tr>
    <td class="text-gray-400">${i+1}</td><td class="font-semibold">${esc(a.nama)}</td>
    <td class="font-mono text-xs">${eff||"—"} ${raw&&NPSN_ALIAS[raw]?'<span class="badge b-alias">alias</span>':""} ${state.meta[a.id]==="manual"?'<span class="badge b-net">manual</span>':""}</td>
    <td class="text-xs text-gray-500">${esc(reg?.jenjang||"—")}</td>
    <td class="text-center"><button class="num-edit text-orange-600" data-kind="aslapB" data-id="${a.id}" data-value="${a.besar}">${fmt(a.besar)}</button></td>
    <td class="text-center"><button class="num-edit text-cyan-600" data-kind="aslapK" data-id="${a.id}" data-value="${a.kecil}">${fmt(a.kecil)}</button></td>
    <td class="text-center font-extrabold text-emerald-700">${fmt(aTot(a))}</td>
    <td class="text-center"><button class="text-blue-600 text-xs font-bold" onclick="openModalAslap('${a.id}')"><i class="fas fa-circle-info"></i></button></td></tr>`;}).join("");
  set("aslapCount", list.length+" dari "+state.aslap.length+" baris");
  set("aslapFootB", fmt(state.aslap.reduce((s,x)=>s+x.besar,0)));
  set("aslapFootK", fmt(state.aslap.reduce((s,x)=>s+x.kecil,0)));
  set("aslapFootT", fmt(state.aslap.reduce((s,x)=>s+aTot(x),0)));
}

function renderRekon(){
  const q = (document.getElementById("rekonSearch").value||"").toLowerCase();
  const st = document.getElementById("rekonStatus").value;
  let rows = buildRekon().filter(r=>((r.nama||"")+" "+(r.npsn||"")).toLowerCase().includes(q) && (st==="all"||r.status===st));
  if (rekonSort.key){ const k=rekonSort.key;
    rows.sort((a,b)=>{ const va=k==="npsn"?(a.npsn||"zz"):k==="nama"?a.nama:k==="sps"?(a.spsTotal??-1):k==="aslap"?(a.aslapTotal??-1):a.selisih;
      const vb=k==="npsn"?(b.npsn||"zz"):k==="nama"?b.nama:k==="sps"?(b.spsTotal??-1):k==="aslap"?(b.aslapTotal??-1):b.selisih;
      return (typeof va==="string"?va.localeCompare(vb):va-vb)*rekonSort.dir; }); }
  document.getElementById("rekonBody").innerHTML = rows.map((r,i)=>`<tr>
    <td class="text-gray-400">${i+1}</td>
    <td class="font-mono text-xs">${r.npsn||"—"} ${r.alias?'<br><span class="badge b-alias">alias '+r.npsnLama+'</span>':""}</td>
    <td><div class="font-semibold">${esc(r.nama)}</div><div class="text-[11px] text-gray-400">${esc(r.jenjang)}</div></td>
    <td class="text-center font-bold text-violet-700">${r.spsTotal===null?"—":fmt(r.spsTotal)}</td>
    <td class="text-center text-orange-600">${r.besar===null?"—":fmt(r.besar)}</td>
    <td class="text-center text-cyan-600">${r.kecil===null?"—":fmt(r.kecil)}</td>
    <td class="text-center font-bold text-emerald-700">${r.aslapTotal===null?"—":fmt(r.aslapTotal)}</td>
    <td class="text-center font-extrabold ${r.selisih===0?"text-gray-400":r.selisih>0?"text-blue-600":"text-red-600"}">${signed(r.selisih)}</td>
    <td class="text-center"><span class="badge ${badge(r.status)}">${r.status}</span></td>
    <td class="text-center"><button class="text-blue-600 font-bold text-xs" onclick="openModalRekon(${i},'${(r.aslap?.id||"")+":"+(r.sps?.id||"")}')"><i class="fas fa-up-right-and-down-left-from-center"></i> Detail</button></td></tr>`).join("")
    || `<tr><td colspan="10" class="text-center text-gray-400 py-8">Tidak ada baris cocok.</td></tr>`;
  const sum = f=>rows.reduce((s,r)=>s+f(r),0);
  set("rekonFootSps", fmt(sum(r=>r.spsTotal||0))); set("rekonFootB", fmt(sum(r=>r.besar||0)));
  set("rekonFootK", fmt(sum(r=>r.kecil||0))); set("rekonFootA", fmt(sum(r=>r.aslapTotal||0)));
  const d=sum(r=>r.selisih); const de=set("rekonFootD", signed(d));
  de.className="text-center font-extrabold "+(d===0?"text-gray-500":"text-amber-600");
}

function renderCharts(){
  const pairs = buildRekon().filter(r=>r.sps&&r.aslap)
    .sort((a,b)=>Math.max(b.spsTotal,b.aslapTotal)-Math.max(a.spsTotal,a.aslapTotal)).slice(0,8);
  const totB = state.aslap.reduce((s,x)=>s+x.besar,0), totK = state.aslap.reduce((s,x)=>s+x.kecil,0);
  if(charts.main) charts.main.destroy();
  charts.main = new Chart(document.getElementById("chartMain"), {type:"bar",
    data:{labels:pairs.map(r=>r.nama.length>20?r.nama.slice(0,20)+"…":r.nama),
      datasets:[{label:"Alokasi Surat",data:pairs.map(r=>r.spsTotal),backgroundColor:"#8b5cf6",borderRadius:6},
                {label:"Total Aslap",data:pairs.map(r=>r.aslapTotal),backgroundColor:"#10b981",borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
  if(charts.porsi) charts.porsi.destroy();
  charts.porsi = new Chart(document.getElementById("chartPorsi"), {type:"doughnut",
    data:{labels:["Porsi Besar","Porsi Kecil"],datasets:[{data:[totB,totK],backgroundColor:["#f97316","#06b6d4"]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
}

/* ================= MODAL DETAIL ================= */
function kv(pairs){ return `<dl class="kv-wrap">${pairs.map(([k,v])=>`<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`; }
function schoolBlock(r){
  const reg = r.reg, wa = waLink(reg?.wa);
  return kv([
    ["NPSN surat", r.sps?`<span class="font-mono">${r.sps.npsn}</span>`:"—"],
    ["NPSN daftar lama", r.reg?`<span class="font-mono">${r.reg.npsn}</span>${r.alias?' <span class="badge b-alias">alias/transposisi</span>':""}`:"—"],
    ["Nama di Surat", r.sps?esc(r.sps.nama):"—"], ["Nama di Aslap", r.aslap?esc(r.aslap.nama):"—"],
    ["Nama daftar lama", reg?esc(reg.nama):"—"], ["Jenjang", esc(reg?.jenjang||"—")],
    ["Status", esc(reg?.status||"—")], ["Kel/Desa", esc(reg?.kel||r.sps?.kel||"—")],
    ["Alamat", esc(reg?.alamat||r.sps?.alamat||"—")],
    ["PIC", reg?esc(reg.pic):"—"], ["Kepala Sekolah", reg?esc(reg.kepsek):"—"],
    ["WA PIC", wa?`<a class="btn-wa" target="_blank" href="${wa}"><i class="fab fa-whatsapp"></i> ${esc(reg.wa)}</a>`:"—"],
    ["PM daftar lama", reg?`<span class="text-gray-400">${fmt(reg.pmLama)} <i>(referensi data lama — tidak dihitung)</i></span>`:"—"],
    ["Alokasi Surat", r.spsTotal===null?"—":`<b class="text-violet-700">${fmt(r.spsTotal)}</b>`],
    ["Aslap Besar/Kecil", r.aslap?`<b class="text-orange-600">${fmt(r.besar)}</b> / <b class="text-cyan-600">${fmt(r.kecil)}</b>`:"—"],
    ["Total Aslap", r.aslapTotal===null?"—":`<b class="text-emerald-700">${fmt(r.aslapTotal)}</b>`],
    ["Selisih", `<b class="${r.selisih===0?"text-gray-500":r.selisih>0?"text-blue-600":"text-red-600"}">${signed(r.selisih)}</b> <span class="badge ${badge(r.status)}">${r.status}</span>`]
  ]);
}
function openModal(title, html){ set("mdTitle",title); document.getElementById("mdBody").innerHTML=html; document.getElementById("detailModal").classList.remove("hidden"); }
function closeModal(){ document.getElementById("detailModal").classList.add("hidden"); }
function openModalRekon(i,key){ const [aId,sId]=key.split(":"); const r=buildRekon().find(x=>(x.aslap?.id||"")===aId&&(x.sps?.id||"")===sId); if(!r) return;
  let extra="";
  if(r.aslap){ extra = `<div class="pt-2"><label class="text-xs font-bold text-gray-500">KOREKSI PADANAN NPSN (baris Aslap ini)</label>
    <select id="mdMapSel" class="input bg-white w-full mt-1"><option value="">— tanpa padanan —</option>
    ${state.sps.map(s=>`<option value="${s.npsn}" ${effNpsn(state.mapNpsn[r.aslap.id])===s.npsn?"selected":""}>${s.npsn} • ${esc(s.nama)} • ${fmt(s.total)}</option>`).join("")}</select>
    <button class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-bold" onclick="saveMap('${r.aslap.id}')">Simpan Padanan</button></div>`; }
  openModal(r.nama, schoolBlock(r)+extra); }
function openModalAslap(aId){ const r=buildRekon().find(x=>x.aslap?.id===aId); openModal(r.nama, schoolBlock(r)+
  `<div class="pt-2"><label class="text-xs font-bold text-gray-500">KOREKSI PADANAN NPSN</label>
   <select id="mdMapSel" class="input bg-white w-full mt-1"><option value="">— tanpa padanan —</option>
   ${state.sps.map(s=>`<option value="${s.npsn}" ${effNpsn(state.mapNpsn[aId])===s.npsn?"selected":""}>${s.npsn} • ${esc(s.nama)} • ${fmt(s.total)}</option>`).join("")}</select>
   <button class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-bold" onclick="saveMap('${aId}')">Simpan Padanan</button></div>`); }
function openModalSps(sId){ const r=buildRekon().find(x=>x.sps?.id===sId); openModal(r.nama, schoolBlock(r)); }
function saveMap(aId){ const v=document.getElementById("mdMapSel").value||null;
  if(v){ const owner=Object.entries(state.mapNpsn).find(([a,n])=>effNpsn(n)===v&&a!==aId);
    if(owner){ toast("NPSN sudah dipakai baris: "+state.aslap.find(x=>x.id===owner[0]).nama,"error"); return; } }
  state.mapNpsn[aId]=v; state.meta[aId]="manual"; saveState(); closeModal(); renderAll(); toast("Padanan NPSN disimpan"); }

/* ================= EDIT INLINE ================= */
document.addEventListener("click", e=>{ const btn=e.target.closest(".num-edit"); if(!btn) return;
  const input=document.createElement("input"); input.type="number"; input.min="0"; input.value=btn.dataset.value; input.className="cell-input";
  btn.replaceWith(input); input.focus(); input.select(); let cancel=false;
  input.addEventListener("keydown",ev=>{ if(ev.key==="Escape"){cancel=true;input.blur();} if(ev.key==="Enter") input.blur(); });
  input.addEventListener("blur",()=>{ const v=parseInt(input.value,10);
    if(!cancel&&Number.isInteger(v)&&v>=0){ const {kind,id}=btn.dataset;
      if(kind==="sps") state.sps.find(s=>s.id===id).total=v;
      if(kind==="aslapB") state.aslap.find(a=>a.id===id).besar=v;
      if(kind==="aslapK") state.aslap.find(a=>a.id===id).kecil=v;
      saveState(); toast("Nilai diperbarui & tersimpan"); }
    renderAll(); }); });

/* ================= SORT/FILTER/NAV ================= */
document.querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{
  const k=th.dataset.sort; rekonSort={key:k,dir:rekonSort.key===k?-rekonSort.dir:1}; renderRekon(); }));
["spsSearch","aslapSearch","rekonSearch"].forEach(id=>document.getElementById(id).addEventListener("input",()=>{
  if(id==="spsSearch")renderSps(); if(id==="aslapSearch")renderAslap(); if(id==="rekonSearch")renderRekon(); }));
document.getElementById("rekonStatus").addEventListener("change",renderRekon);
document.getElementById("btnReset").addEventListener("click",()=>{ if(!confirm("Kembalikan semua data & padanan ke asli dokumen?"))return;
  localStorage.removeItem(LS_KEY); state=freshState(); renderAll(); toast("Data dikembalikan ke asli","info"); });

const TITLES={ dashboard:["Dashboard","Ringkasan Surat (SPS/Dapodik) vs Aslap lapangan, terkunci via NPSN"],
  sps:["SPS / Dapodik — Lampiran I Surat","Alokasi KPM sesuai Surat "+SURAT_INFO.nomor],
  aslap:["PM Collect Aslap — Data Lapangan","Porsi besar & kecil hasil pendataan lapangan"],
  rekon:["Rekonsiliasi berbasis NPSN","Setiap baris = satu NPSN; selisih = Aslap − Surat"],
  export:["Export Laporan","Unduh hasil rekonsiliasi"] };
function showPage(p){ document.querySelectorAll(".page").forEach(el=>el.classList.add("hidden"));
  document.getElementById("page-"+p).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===p));
  set("pageTitle",TITLES[p][0]); set("pageSubtitle",TITLES[p][1]);
  if(window.innerWidth<1024) toggleSidebar(false); }
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
function toggleSidebar(force){ const sb=document.getElementById("sidebar"),ov=document.getElementById("overlay");
  const open=force!==undefined?force:sb.classList.contains("-translate-x-full");
  sb.classList.toggle("-translate-x-full",!open); ov.classList.toggle("hidden",!open); }
document.getElementById("mobileMenuBtn").addEventListener("click",()=>toggleSidebar());
document.getElementById("overlay").addEventListener("click",()=>toggleSidebar(false));

/* ================= EXPORT ================= */
function rekonExport(){ return buildRekon().map((r,i)=>({ No:i+1, NPSN:r.npsn||"", "NPSN Daftar Lama":r.npsnLama||"", Alias:r.alias?"YA":"",
  "Sekolah (Aslap)":r.aslap?r.aslap.nama:"", "Nama di Surat":r.sps?r.sps.nama:"", Jenjang:r.jenjang,
  "Alokasi Surat":r.spsTotal??"", "Porsi Besar":r.besar??"", "Porsi Kecil":r.kecil??"", "Total Aslap":r.aslapTotal??"", Selisih:r.selisih, Status:r.status })); }
function exportExcel(){ const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rekonExport()),"Rekonsiliasi");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(state.sps.map((s,i)=>({No:i+1,NPSN:s.npsn,"Nama Sekolah":s.nama,Kelurahan:s.kel,Alamat:s.alamat,"Total Penerima Manfaat":s.total}))),"SPS-Dapodik");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(state.aslap.map((a,i)=>({No:i+1,"Nama Sekolah":a.nama,NPSN:effNpsn(state.mapNpsn[a.id])||"","Porsi Besar":a.besar,"Porsi Kecil":a.kecil,"Total Porsi":aTot(a)}))),"Aslap-Lapangan");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(REGISTRY.map((r,i)=>({No:i+1,NPSN:r.npsn,Jenjang:r.jenjang,"Nama Sekolah":r.nama,Status:r.status,Kelurahan:r.kel,Alamat:r.alamat,"TOTAL PM LAMA (REFERENSI)":r.pmLama,PIC:r.pic,"WA PIC":r.wa,"Kepala Sekolah":r.kepsek}))),"ReferensiSekolah");
  XLSX.writeFile(wb,"Rekonsiliasi_PM_NPSN_SPPG_Jember.xlsx"); toast("Excel diunduh (4 sheet)"); }
function exportPDF(){ const {jsPDF}=window.jspdf; const doc=new jsPDF("l","mm","a4");
  doc.setFontSize(14); doc.text("Laporan Rekonsiliasi PM berbasis NPSN - SPPG Jember Pakusari Jatian",14,14);
  doc.setFontSize(9); doc.text("Surat "+SURAT_INFO.nomor+" ("+SURAT_INFO.tanggal+") vs PM Collect Aslap | jembatan NPSN: Daftar Sekolah 7 Okt 2026",14,20);
  doc.text("Dicetak: "+new Date().toLocaleString("id-ID"),14,25);
  doc.autoTable({ head:[["No","NPSN","Sekolah","Jenjang","Alokasi Surat","Besar","Kecil","Total Aslap","Selisih","Status"]],
    body: buildRekon().map((r,i)=>[i+1,r.npsn||"—",r.nama,r.jenjang,r.spsTotal===null?"—":r.spsTotal,r.besar===null?"—":r.besar,r.kecil===null?"—":r.kecil,r.aslapTotal===null?"—":r.aslapTotal,signed(r.selisih),r.status]),
    startY:30, theme:"grid", styles:{fontSize:8,cellPadding:2}, headStyles:{fillColor:[5,150,105]},
    foot:[["","TOTAL","","",state.sps.reduce((s,x)=>s+x.total,0),state.aslap.reduce((s,x)=>s+x.besar,0),state.aslap.reduce((s,x)=>s+x.kecil,0),state.aslap.reduce((s,x)=>s+aTot(x),0),signed(state.aslap.reduce((s,x)=>s+aTot(x),0)-state.sps.reduce((s,x)=>s+x.total,0)),""]]});
  doc.save("Laporan_Rekonsiliasi_NPSN.pdf"); toast("PDF diunduh"); }
function exportPNG(){ html2canvas(document.getElementById("page-dashboard"),{scale:2,backgroundColor:"#f6f8f7"}).then(c=>{
  const a=document.createElement("a"); a.download="Dashboard_Rekonsiliasi_NPSN.png"; a.href=c.toDataURL("image/png"); a.click(); toast("Gambar diunduh"); }); }

/* ================= TOAST & INIT ================= */
function toast(msg,type="success"){ const el=document.createElement("div"); el.className="toast "+type;
  el.innerHTML=`<i class="fas ${type==="error"?"fa-circle-exclamation text-red-500":type==="info"?"fa-circle-info text-blue-500":"fa-circle-check text-emerald-500"} text-lg mt-0.5"></i><p class="text-sm text-gray-700">${esc(msg)}</p>`;
  document.getElementById("toastWrap").appendChild(el); setTimeout(()=>el.remove(),3200); }

loadState(); showPage("dashboard"); renderAll();
