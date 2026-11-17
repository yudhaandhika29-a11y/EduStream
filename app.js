(() => {
  "use strict";
  const STORAGE_KEY = "edustream_prototype_v1";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  let state = loadState();
  let currentFilter = "all";
  let toastTimer;

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? {...defaultState(), ...JSON.parse(raw)} : defaultState();
    } catch(e) { return defaultState(); }
  }
  function defaultState(){
    return {completedModules:[], journals:[], reflection:null, bkConfig:{}, bkNote:null};
  }
  function persist(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ showToast("Penyimpanan lokal tidak tersedia. Periksa pengaturan browser."); }
  }
  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function notify(message){
    const el=$("#toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
  }
  const showToast = notify;

  const pageNames = {home:"Beranda",strategi:"Strategi Belajar",evaluasi:"Evaluasi Mandiri",jurnal:"Jurnal Kemandirian",bantuan:"Bantuan BK",tentang:"Tentang & Privasi"};
  function openPage(name){
    if(!pageNames[name]) return;
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));
    $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    $("#currentBreadcrumb").textContent=pageNames[name];
    $("#sidebar").classList.remove("open"); $("#mobileOverlay").classList.remove("show");
    window.scrollTo({top:0,behavior:"smooth"});
    if(name==="home") updateProgress();
    if(name==="jurnal") renderJournals();
    if(name==="bantuan") renderBkConfig();
    if(name==="evaluasi") renderReflection();
  }
  document.addEventListener("click", e=>{
    const button=e.target.closest("[data-page]");
    if(button){e.preventDefault();openPage(button.dataset.page);}
  });

  $("#mobileMenu").addEventListener("click",()=>{$("#sidebar").classList.toggle("open");$("#mobileOverlay").classList.toggle("show");});
  $("#mobileOverlay").addEventListener("click",()=>{$("#sidebar").classList.remove("open");$("#mobileOverlay").classList.remove("show");});

  // Modul strategi
  const moduleIds=["deep","active","spaced","mind"];
  $$(".tool-card").forEach(card=>{
    const expandButton=$(".expand-btn",card);
    expandButton.addEventListener("click",()=>{
      const target=$("#"+expandButton.dataset.expand);
      const opened=target.classList.toggle("open");
      expandButton.querySelector("span").textContent=opened?"－":"＋";
    });
  });
  // Menandai modul selesai dengan menambahkan tindakan eksplisit saat membaca seluruh toolkit.
  $$(".tool-card").forEach((card,index)=>{
    const b=document.createElement("button");
    b.className="mark-module";
    b.type="button";
    b.textContent=state.completedModules.includes(moduleIds[index])?"✓ Modul selesai":"Tandai selesai";
    b.addEventListener("click",()=>{
      const id=moduleIds[index];
      state.completedModules=state.completedModules.includes(id)?state.completedModules.filter(x=>x!==id):[...state.completedModules,id];
      persist(); b.textContent=state.completedModules.includes(id)?"✓ Modul selesai":"Tandai selesai";
      b.classList.toggle("marked",state.completedModules.includes(id)); updateProgress();
      notify(state.completedModules.includes(id)?"Modul ditandai selesai.":"Tanda selesai dibatalkan.");
    });
    card.appendChild(b);
    b.classList.toggle("marked",state.completedModules.includes(moduleIds[index]));
  });
  const markStyle=document.createElement("style");
  markStyle.textContent=".mark-module{margin-top:9px;border:1px solid #dbe9e6;background:#f5faf8;color:#438a80;border-radius:8px;padding:7px 9px;font-size:8px;font-weight:800}.mark-module.marked{background:#e4f3ed;color:#278073}";
  document.head.appendChild(markStyle);

  $("#addPractice").addEventListener("click",()=>{
    const technique=$("#practiceTechnique").value;
    $("#journalTarget").value=`Mencoba teknik ${technique} pada materi yang sedang dipelajari`;
    $("#journalDate").value ||= todayISO();
    openPage("jurnal"); $("#journalTarget").focus();
    notify("Teknik belajar ditambahkan sebagai ide target. Lengkapi lalu simpan.");
  });

  // Evaluasi metakognitif
  $("#saveReflection").addEventListener("click",()=>{
    const selected=$$('input[name="reflect"]:checked').map(x=>x.value);
    const subject=$("#reflectionSubject").value.trim();
    const difficult=$("#reflectionDifficult").value.trim();
    const next=$("#reflectionNext").value.trim();
    if(!selected.length && !subject && !difficult && !next){notify("Isi setidaknya satu bagian refleksi terlebih dahulu.");return;}
    state.reflection={selected,subject,difficult,next,updatedAt:new Date().toISOString()};
    persist(); renderReflection(); updateProgress(); notify("Refleksi tersimpan di perangkat ini.");
  });
  function renderReflection(){
    const r=state.reflection;
    if(!r){$("#reflectionResult").hidden=true;return;}
    $("#reflectionResult").hidden=false;
    let message="Terima kasih sudah meluangkan waktu untuk mengamati proses belajarmu.";
    if(r.difficult) message+=` Kamu mencatat bagian yang masih membingungkan: “${r.difficult}”.`;
    else if(r.selected.length) message+=" Kamu sudah mengenali beberapa hal yang berjalan dalam proses belajarmu.";
    if(r.next) message+=` Langkah berikutnya yang kamu pilih adalah: “${r.next}”.`;
    $("#reflectionSummary").textContent=message;
    const details=[];
    if(r.subject)details.push(`<span><b>Materi:</b> ${escapeHtml(r.subject)}</span>`);
    if(r.selected.length)details.push(`<span><b>Hal yang sudah diamati:</b> ${r.selected.map(escapeHtml).join(" · ")}</span>`);
    if(r.difficult)details.push(`<span><b>Bagian yang perlu diperhatikan:</b> ${escapeHtml(r.difficult)}</span>`);
    if(r.next)details.push(`<span><b>Langkah selanjutnya:</b> ${escapeHtml(r.next)}</span>`);
    $("#reflectionDetails").innerHTML=details.join("");
    $$('input[name="reflect"]').forEach(c=>c.checked=r.selected.includes(c.value));
    $("#reflectionSubject").value=r.subject||"";
    $("#reflectionDifficult").value=r.difficult||"";
    $("#reflectionNext").value=r.next||"";
  }

  // Jurnal
  function todayISO(){
    const now=new Date(); const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,10);
  }
  $("#journalDate").value=todayISO();
  $("#journalForm").addEventListener("submit",e=>{
    e.preventDefault();
    const target=$("#journalTarget").value.trim();
    if(!target){notify("Tuliskan target belajarmu.");return;}
    const id=$("#journalId").value;
    const item={id:id||`j-${Date.now()}`,target,date:$("#journalDate").value,duration:$("#journalDuration").value,obstacle:$("#journalObstacle").value.trim(),strategy:$("#journalStrategy").value.trim(),done:false,createdAt:new Date().toISOString()};
    if(id){
      const old=state.journals.find(j=>j.id===id);
      item.done=old?.done||false; item.createdAt=old?.createdAt||item.createdAt;
      state.journals=state.journals.map(j=>j.id===id?item:j);
    }else state.journals.unshift(item);
    persist(); resetJournalForm(); renderJournals(); updateProgress(); notify(id?"Target berhasil diperbarui.":"Target berhasil disimpan.");
  });
  function resetJournalForm(){
    $("#journalForm").reset();$("#journalId").value="";$("#journalDate").value=todayISO();
    $("#journalDuration").value="25 menit";$("#journalFormTitle").textContent="Tulis target belajarmu";
    $("#journalSubmit").innerHTML='Simpan target <span>↗</span>';$("#cancelEdit").hidden=true;
  }
  $("#cancelEdit").addEventListener("click",resetJournalForm);
  function renderJournals(){
    const list=$("#journalList");
    const items=state.journals.filter(j=>currentFilter==="all"||(currentFilter==="done"?j.done:!j.done));
    $("#totalTargets").textContent=state.journals.length;
    $("#doneTargets").textContent=state.journals.filter(j=>j.done).length;
    $("#activeTargets").textContent=state.journals.filter(j=>!j.done).length;
    if(!items.length){
      list.innerHTML='<div class="empty-state"><span>▤</span><b>Belum ada target pada bagian ini.</b><p>Tulis satu langkah belajar yang realistis untuk memulainya.</p></div>';return;
    }
    list.innerHTML=items.map(j=>`<article class="journal-item ${j.done?"done":""}">
      <div class="journal-item-top"><div><h4>${escapeHtml(j.target)}</h4><div class="journal-date">${formatDate(j.date)} · ${escapeHtml(j.duration)}</div></div><span class="status-chip ${j.done?"done":""}">${j.done?"TUNTAS":"BERJALAN"}</span></div>
      <div class="journal-detail">${j.obstacle?`<span><b>Hambatan:</b> ${escapeHtml(j.obstacle)}</span>`:""}${j.strategy?`<span><b>Strategi:</b> ${escapeHtml(j.strategy)}</span>`:""}</div>
      <div class="journal-actions"><button class="small-action complete" data-action="toggle" data-id="${escapeHtml(j.id)}">${j.done?"Batalkan selesai":"Tandai tuntas ✓"}</button><button class="small-action" data-action="edit" data-id="${escapeHtml(j.id)}">Edit</button><button class="small-action delete" data-action="delete" data-id="${escapeHtml(j.id)}">Hapus</button></div>
    </article>`).join("");
    $$("[data-action]",list).forEach(btn=>btn.addEventListener("click",()=>journalAction(btn.dataset.action,btn.dataset.id)));
  }
  function journalAction(action,id){
    const item=state.journals.find(j=>j.id===id);if(!item)return;
    if(action==="toggle"){item.done=!item.done;persist();renderJournals();updateProgress();notify(item.done?"Target ditandai tuntas.":"Status target diperbarui.");}
    if(action==="delete"){if(!confirm("Hapus target ini dari jurnal?"))return;state.journals=state.journals.filter(j=>j.id!==id);persist();renderJournals();updateProgress();notify("Target dihapus.");}
    if(action==="edit"){
      $("#journalId").value=item.id;$("#journalTarget").value=item.target;$("#journalDate").value=item.date;$("#journalDuration").value=item.duration;$("#journalObstacle").value=item.obstacle;$("#journalStrategy").value=item.strategy;
      $("#journalFormTitle").textContent="Perbarui target belajar";$("#journalSubmit").innerHTML='Simpan perubahan <span>↗</span>';$("#cancelEdit").hidden=false;
      $("#journalTarget").focus();window.scrollTo({top:0,behavior:"smooth"});
    }
  }
  function formatDate(date){
    if(!date)return "Tanggal belum ditentukan";
    const d=new Date(date+"T12:00:00");
    return d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
  }
  $$(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>{
    currentFilter=btn.dataset.filter;$$(".filter-btn").forEach(b=>b.classList.toggle("active",b===btn));renderJournals();
  }));
  $("#exportJournal").addEventListener("click",()=>{
    if(!state.journals.length){notify("Belum ada data jurnal untuk diekspor.");return;}
    const rows=[["Target","Tanggal","Durasi","Hambatan","Strategi","Status"],...state.journals.map(j=>[j.target,j.date,j.duration,j.obstacle,j.strategy,j.done?"Tuntas":"Berjalan"])];
    const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="jurnal-edustream.csv";a.click();URL.revokeObjectURL(url);
  });

  // Informasi dan catatan BK — konfigurasi demonstrasi disimpan lokal.
  function renderBkConfig(){
    const c=state.bkConfig||{};
    $("#bkRoomDisplay").textContent=c.room||"Silakan isi oleh pihak sekolah";
    $("#bkScheduleDisplay").textContent=c.schedule||"Silakan konfirmasi jadwal kepada guru BK.";
    $("#bkContactDisplay").textContent=c.contact||"Belum diatur oleh pihak sekolah.";
    $("#bkRoom").value=c.room||"";$("#bkSchedule").value=c.schedule||"";$("#bkContact").value=c.contact||"";
  }
  $("#toggleBkConfig").addEventListener("click",()=>{
    const box=$("#bkConfig");box.hidden=!box.hidden;$("#toggleBkConfig span").textContent=box.hidden?"＋":"－";
  });
  $("#saveBkConfig").addEventListener("click",()=>{
    state.bkConfig={room:$("#bkRoom").value.trim(),schedule:$("#bkSchedule").value.trim(),contact:$("#bkContact").value.trim()};
    persist();renderBkConfig();$("#bkConfig").hidden=true;notify("Informasi contoh sekolah disimpan di perangkat ini.");
  });
  $("#bkNoteForm").addEventListener("submit",e=>{
    e.preventDefault();
    state.bkNote={topic:$("#bkTopic").value,note:$("#bkNote").value.trim(),savedAt:new Date().toISOString()};
    persist();$("#bkNoteStatus").textContent="Catatan pribadi tersimpan di browser ini. Catatan tidak dikirim kepada guru BK.";
    notify("Catatan persiapan konsultasi tersimpan.");
  });

  // Progres ringkas — indikator aktivitas prototipe, bukan skor kemampuan.
  function updateProgress(){
    const modules=state.completedModules.length;
    const done=state.journals.filter(j=>j.done).length;
    const milestones=modules+ (state.reflection?1:0) + Math.min(done,2);
    const percent=Math.round(milestones/7*100);
    $("#progressPercent").textContent=percent+"%";
    $("#progressRing").style.background=`conic-gradient(var(--teal) ${percent*3.6}deg,#edf2f4 0deg)`;
    $("#moduleCount").textContent=`${modules}/4`;
    $("#journalCount").textContent=done;
    $("#progressMessage").textContent=percent===0?"Mulai dengan membuka modul strategi belajar dan menyelesaikan satu aktivitas.":percent<50?"Kamu sudah mulai bergerak. Lanjutkan satu langkah kecil berikutnya.":percent<100?"Proses belajarmu terus berkembang. Pertahankan ritme yang realistis.":"Kamu sudah mencoba seluruh aktivitas utama. Terus lakukan refleksi dan perencanaan.";
  }

  // Uji pengguna singkat sesuai lampiran proposal.
  // Diletakkan sebagai fungsi ringan yang dapat dibuka dari About melalui prompt bukan mengirim data.
  $("#clearData").addEventListener("click",()=>{
    const ok=confirm("Hapus seluruh jurnal, refleksi, dan pengaturan lokal EduStream dari browser ini?");
    if(!ok)return;
    localStorage.removeItem(STORAGE_KEY);state=defaultState();
    $$('input[name="reflect"]').forEach(c=>c.checked=false);
    $("#reflectionSubject").value="";$("#reflectionDifficult").value="";$("#reflectionNext").value="";
    renderReflection();renderJournals();renderBkConfig();resetJournalForm();updateProgress();
    $("#bkNote").value="";$("#bkNoteStatus").textContent="";
    notify("Seluruh data lokal EduStream telah dihapus.");
  });

  renderJournals();renderReflection();renderBkConfig();updateProgress();
})();