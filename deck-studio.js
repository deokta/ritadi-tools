/* ===== LEGUTI Deck Studio (tahap 1: editor slide dasar) =====
   Modul terpisah. Tidak mengubah fungsi lama: hanya menambah satu item menu dan
   satu view baru, memakai pola yang sama dengan modul LEGUTI AI (membungkus chrome()/page()).
   Data presentasi disimpan di localStorage per akun, dengan kunci tersendiri (leguti_deck_v1_<uid>),
   jadi tidak ikut sinkronisasi Supabase dan tidak menyentuh data operasional. */
(()=>{
'use strict';
if(typeof NAV==='undefined'||typeof IC==='undefined'||typeof chrome!=='function')return;
const main=document.querySelector('main');
if(!main||document.getElementById('view-deck'))return;

/* ---------- konstanta ---------- */
const PFX='leguti_deck_v1_',MAX_SLIDES=50,MAX_NAME=80,SAVE_MS=350;
const THEMES={midnight:{name:'Midnight',accent:'#12e8d8'},arctic:{name:'Arctic',accent:'#2676e9'},aurora:{name:'Aurora',accent:'#b26cff'}};
const PALETTE=['#12e8d8','#148ab9','#457af8','#8b5cf6','#e6489c','#ff9952'];
const KPI_COLORS=['#2f7bff','#8b5cf6','#14e0c4','#f59e0b'];
const FIELDS={
  kicker:{l:'Label atas',t:'line',m:50,p:'Contoh: Monthly Operations Review'},
  title:{l:'Judul',t:'line',m:70,p:'Judul slide'},
  subtitle:{l:'Subjudul',t:'line',m:110,p:'Subjudul atau tagline'},
  meta:{l:'Keterangan (periode / tanggal)',t:'line',m:50,p:'Contoh: November 2026'},
  body:{l:'Poin-poin',t:'text',m:700,p:'Tulis poin utama di sini',hint:'Satu baris = satu poin'},
  leftHead:{l:'Judul kolom kiri',t:'line',m:40,p:'Kolom kiri'},
  left:{l:'Isi kolom kiri',t:'text',m:500,p:'Isi kolom kiri',hint:'Satu baris = satu poin'},
  rightHead:{l:'Judul kolom kanan',t:'line',m:40,p:'Kolom kanan'},
  right:{l:'Isi kolom kanan',t:'text',m:500,p:'Isi kolom kanan',hint:'Satu baris = satu poin'},
  insight:{l:'Pesan utama',t:'text',m:220,p:'Tulis insight utama dalam satu atau dua kalimat'}
};
const svg=inner=>`<svg viewBox="0 0 54 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const LAYOUTS={
  title:{n:'Judul & Subjudul',f:['kicker','title','subtitle','meta'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M10 15h22M10 21h16M10 26h8"/>')},
  content:{n:'Judul & Poin',f:['title','body'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M10 11h20M12 18h26M12 23h22M12 28h16"/><circle cx="9" cy="18" r=".8"/><circle cx="9" cy="23" r=".8"/><circle cx="9" cy="28" r=".8"/>')},
  twocol:{n:'Dua Kolom',f:['title','leftHead','left','rightHead','right'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M9 10h14"/><rect x="8" y="15" width="17" height="13" rx="2"/><rect x="29" y="15" width="17" height="13" rx="2"/>')},
  kpi:{n:'KPI Metrics',f:['title','k','subtitle'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M9 10h14"/><rect x="7" y="16" width="8" height="12" rx="1.5"/><rect x="17" y="16" width="8" height="12" rx="1.5"/><rect x="27" y="16" width="8" height="12" rx="1.5"/><rect x="37" y="16" width="8" height="12" rx="1.5"/>')},
  insight:{n:'Insight',f:['title','insight','body'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M9 9h14"/><rect x="8" y="14" width="38" height="9" rx="2"/><path d="M10 28h22"/>')},
  chart:{n:'Grafik',f:['title','body'],i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M10 27V17h7v10M22 27V10h7v17M34 27V14h7v13"/>')},
  table:{n:'Tabel',f:['title','body'],i:svg('<rect x="4" y="4" width="46" height="28" rx="2"/><path d="M4 13h46M4 22h46M20 4v28M35 4v28"/>')},
  section:{n:'Pembatas Bagian',f:['kicker','title','subtitle'],
    i:svg('<rect x="3" y="3" width="48" height="30" rx="3"/><path d="M9 12v12"/><path d="M14 15h22M14 21h14"/>')}
};

/* ---------- ikon (kunci baru, tidak menimpa ikon yang ada) ---------- */
const NEW_IC={
  deck:'M3 4h18v11H3z M8 20l4-5 4 5 M7 11l3-3 3 2 4-4',
  dkPlus:'M12 5v14 M5 12h14',
  dkCopy:'M9 9h11v11H9z M5 15H4V4h11v1',
  dkTrash:'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  dkUp:'M12 19V5 M5 12l7-7 7 7',
  dkDown:'M12 5v14 M5 12l7 7 7-7',
  dkPrev:'M15 18l-6-6 6-6',
  dkNext:'M9 18l6-6-6-6',
  dkLay:'M4 4h16v16H4z M4 10h16 M10 10v10',
  dkEdit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  dkDownload:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',dkSave:'M4 4h14l2 2v14H4z M8 4v6h8V4 M8 20v-7h8v7',
  dkPlay:'M8 5l11 7-11 7z',dkExpand:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
  dkData:'M4 5h16v14H4z M4 10h16 M10 10v9',dkSpark:'M12 3l2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3z'
};
Object.keys(NEW_IC).forEach(k=>{if(!(k in IC))IC[k]=NEW_IC[k]});
const icon=k=>typeof ico==='function'?ico(k):'';

/* ---------- util ---------- */
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines=t=>String(t||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const rid=()=>Math.random().toString(36).slice(2,9);
const clip=(v,m)=>String(v==null?'':v).slice(0,m);
const uid=()=>{try{return(window.LEGUTI_AUTH&&window.LEGUTI_AUTH.uid())||'anon'}catch(_){return'anon'}};
const say=t=>{try{typeof toast==='function'&&toast(t)}catch(_){}};

/* ---------- model ---------- */
const emptySlide=layout=>({
  id:rid(),layout,coverImage:'',kicker:'',title:'',subtitle:'',meta:'',body:'',leftHead:'',left:'',rightHead:'',right:'',insight:'',
  k:[{v:'',l:''},{v:'',l:''},{v:'',l:''},{v:'',l:''}]
});
function cleanSlide(o){
  const s=emptySlide(LAYOUTS[o&&o.layout]?o.layout:'content');
  if(!o||typeof o!=='object')return s;
  if(typeof o.id==='string'&&o.id)s.id=o.id.slice(0,24);
  if(typeof o.coverImage==='string' && /^data:image\/(?:jpeg|png);base64,/.test(o.coverImage) && o.coverImage.length<1400000)s.coverImage=o.coverImage;
  Object.keys(FIELDS).forEach(f=>{s[f]=clip(o[f],FIELDS[f].m)});
  if(Array.isArray(o.k))s.k=s.k.map((_,i)=>({v:clip(o.k[i]&&o.k[i].v,9),l:clip(o.k[i]&&o.k[i].l,40)}));
  return s;
}
function sampleDeck(){
  const mo=new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const a=emptySlide('title');Object.assign(a,{kicker:'Monthly Operations Review',title:'Outbound Performance Report',subtitle:'Intelligence-driven operational reporting',meta:mo});
  const b=emptySlide('content');Object.assign(b,{title:'Ringkasan Eksekutif',body:'Capaian utama periode ini\nKendala yang perlu perhatian\nRencana tindak lanjut'});
  const c=emptySlide('kpi');Object.assign(c,{title:'Indikator Kinerja',subtitle:'Isi nilai dari laporan operasional terbaru.',
    k:[{v:'—',l:'Total AWB'},{v:'—',l:'Selesai'},{v:'—',l:'Pencapaian'},{v:'—',l:'Belum selesai'}]});
  const d=emptySlide('chart');Object.assign(d,{title:'Tren Operasional',body:'Senin: 1200\nSelasa: 1600\nRabu: 1450\nKamis: 2100\nJumat: 1850'});
  const e=emptySlide('insight');Object.assign(e,{title:'Operational Insights',insight:'Prioritaskan penyelesaian kendala manifest dan produktivitas.',body:'Evaluasi lane dengan backlog tertinggi\nOptimalkan alokasi petugas\nPantau tren harian'});
  const f=emptySlide('content');Object.assign(f,{title:'Action Plan',body:'Monitoring performa setiap shift\nReview hasil operasional mingguan\nTindak lanjut anomali data'});
  return{name:'Presentasi Operasional',slides:[a,b,c,d,e,f],theme:'midnight',accent:'#12e8d8',background:'solid'};
}
function load(k){
  try{
    const o=JSON.parse(localStorage.getItem(PFX+k));
    if(o&&o.deck&&Array.isArray(o.deck.slides)&&o.deck.slides.length){
      const slides=o.deck.slides.slice(0,MAX_SLIDES).map(cleanSlide);
      return{deck:{name:clip(o.deck.name,MAX_NAME)||'Presentasi Operasional',slides,theme:THEMES[o.deck.theme]?o.deck.theme:'midnight',accent:/^#[0-9a-f]{6}$/i.test(o.deck.accent)?o.deck.accent:'#12e8d8',background:['solid','gradient'].includes(o.deck.background)?o.deck.background:'solid'},sel:Math.min(Math.max(+o.sel||0,0),slides.length-1),tab:'design'};
    }
  }catch(_){}
  return{deck:sampleDeck(),sel:0,tab:'design'};
}

let st=load('anon'),loadedFor=null,built=false,timer=null,pending=false;
const cur=()=>st.deck.slides[st.sel];

/* ---------- penyimpanan ---------- */
const clock=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
function status(kind,txt){
  const e=root.querySelector('#dkSv');if(!e)return;
  e.className='dk-sv'+(kind==='wait'?' wait':kind==='err'?' err':'');
  e.innerHTML='<i></i><span>'+h(txt)+'</span>';
}
function save(){
  clearTimeout(timer);timer=null;pending=false;
  try{
    localStorage.setItem(PFX+(loadedFor||uid()),JSON.stringify({v:1,deck:st.deck,sel:st.sel}));
    status('ok','Tersimpan otomatis · '+clock());
  }catch(_){
    status('err','Gagal menyimpan');say('Penyimpanan browser penuh atau tidak tersedia');
  }
}
function dirty(){
  pending=true;status('wait','Menyimpan…');
  clearTimeout(timer);timer=setTimeout(save,SAVE_MS);
}
const flush=()=>{if(pending)save()};

/* ---------- tampilan slide ---------- */
function slideHTML(s,n,edit){
  const T=(f,cls)=>{
    const v=s[f]||'';if(!v&&!edit)return'';
    return`<div class="${cls}${!v?' dk-ph':''}"${edit?` data-f="${f}" tabindex="0"`:''}>${h(v||(edit?FIELDS[f].p:''))}</div>`;
  };
  const UL=(f,cls)=>{
    const a=lines(s[f]);if(!a.length&&!edit)return'';
    return`<ul class="dk-ul ${cls||''}${!a.length?' dk-ph':''}"${edit?` data-f="${f}" tabindex="0"`:''}>${
      a.length?a.map(x=>`<li>${h(x)}</li>`).join(''):`<li>${h(edit?FIELDS[f].p:'')}</li>`}</ul>`;
  };
  const foot=`<div class="dk-foot"><div class="dk-lg" role="presentation"></div><span>${n}</span></div>`;
  const brand=`<div class="dk-brand"><div class="dk-lg" role="presentation"></div><i></i><div><b>LEGUTI</b><span>Operations Intelligence</span></div></div>`;
  let b='';
  switch(s.layout){
    case'title':
      b=`${s.coverImage?`<div class="dk-cover-photo" style="background-image:url('${s.coverImage}')"></div>`:''}<div class="dk-shape"></div>${brand}<div class="dk-main">${T('kicker','dk-kick')}${T('title','dk-ti')}<div class="dk-bar2"></div>${T('subtitle','dk-sub')}${T('meta','dk-meta')}</div>`;break;
    case'twocol':
      b=`<div class="dk-hd">${T('title','dk-ti')}</div><div class="dk-cols">
        <div class="dk-card">${T('leftHead','dk-ch')}${UL('left')}</div>
        <div class="dk-card">${T('rightHead','dk-ch')}${UL('right')}</div></div>${foot}`;break;
    case'kpi':
      b=`<div class="dk-hd">${T('title','dk-ti')}</div><div class="dk-kpis">${s.k.map((x,i)=>{
        const kv=x.v||'',kl=x.l||'';
        return`<div class="dk-kpi" style="--k:${KPI_COLORS[i]}">
          <div class="dk-kv${!kv?' dk-ph':''}"${edit?` data-f="k" data-k="${i}" data-p="v" tabindex="0"`:''}>${h(kv||(edit?'0':''))}</div>
          <div class="dk-kl${!kl?' dk-ph':''}"${edit?` data-f="k" data-k="${i}" data-p="l" tabindex="0"`:''}>${h(kl||(edit?'Nama metrik':''))}</div></div>`}).join('')}</div>${T('subtitle','dk-sub')}${foot}`;break;
    case'insight':
      b=`<div class="dk-hd">${T('title','dk-ti')}</div>${T('insight','dk-ins')}${UL('body')}${foot}`;break;
    case'chart':
      b=`<div class="dk-hd">${T('title','dk-ti')}</div><div class="dk-chart">${lines(s.body).slice(0,7).map((x,i)=>{const parts=x.split(':');const val=Math.max(0,Number(parts[1])||0);const max=Math.max(1,...lines(s.body).map(y=>Number(y.split(':')[1])||0));return`<div class="dk-chart-row"><span>${h(parts[0])}</span><div><i style="width:${Math.max(3,val/max*100)}%"></i></div><b>${h(parts[1]||'0')}</b></div>`}).join('')}</div>${foot}`;break;
    case'table':
      b=`<div class="dk-hd">${T('title','dk-ti')}</div><div class="dk-table">${lines(s.body).slice(0,7).map((x,i)=>`<div class="dk-table-row${i===0?' heading':''}">${x.split('|').slice(0,4).map(v=>`<span>${h(v.trim())}</span>`).join('')}</div>`).join('')}</div>${foot}`;break;
    case'section':
      b=`<div class="dk-shape"></div><div class="dk-main">${T('kicker','dk-kick')}${T('title','dk-ti')}${T('subtitle','dk-sub')}</div>${foot}`;break;
    default:
      b=`<div class="dk-hd">${T('title','dk-ti')}</div>${UL('body')}${foot}`;
  }
  return`<div class="dk-s dk-L-${LAYOUTS[s.layout]?s.layout:'content'}${edit?' dk-e':''}">${b}</div>`;
}

/* ---------- kerangka DOM ---------- */
const root=document.createElement('div');
root.id='view-deck';root.hidden=true;main.appendChild(root);
const q=s=>root.querySelector(s);

function build(){
  if(built)return;built=true;
  const img=document.querySelector('img.logo');
  if(img&&img.src)root.style.setProperty('--dk-logo','url("'+img.src+'")');
  root.innerHTML=`
  <div class="dk-bar dk-pn">
    <div class="dk-ic">${icon('deck')}</div>
    <label class="dk-nm"><span>LEGUTI Deck Studio <b class="dk-ai-tag">AI</b></span><input data-name maxlength="${MAX_NAME}" autocomplete="off" aria-label="Nama presentasi"></label>
    <div class="dk-sv" id="dkSv"><i></i><span>Tersimpan otomatis</span></div>
    <button type="button" class="dk-action" data-act="save">${icon('dkSave')}<span>Simpan Draft</span></button>
    <button type="button" class="dk-action" data-act="preview">${icon('dkPlay')}<span>Preview</span></button>
    <button type="button" class="dk-action primary" data-act="export">${icon('dkDownload')}<span>Ekspor PPTX</span></button>
  </div>
  <aside class="dk-list dk-pn" aria-label="Daftar slide">
    <div class="dk-lh"><span id="dkLh"></span><button type="button" class="dk-add" data-act="add" aria-label="Tambah slide">${icon('dkPlus')}</button></div>
    <div class="dk-ths" id="dkThs"></div>
  </aside>
  <section class="dk-stage dk-pn" aria-label="Editor slide">
    <div class="dk-frame" id="dkFrame"></div>
    <div class="dk-ctl">
      <button type="button" class="dk-ib" data-act="prev" aria-label="Slide sebelumnya">${icon('dkPrev')}</button>
      <span class="dk-cnt" id="dkCnt" aria-live="polite"></span>
      <button type="button" class="dk-ib" data-act="next" aria-label="Slide berikutnya">${icon('dkNext')}</button>
      <span class="dk-ctl-spacer"></span><span class="dk-ratio">▣ 16:9</span>
      <button type="button" class="dk-ib" data-act="zoomout" title="Perkecil">−</button><span id="dkZoom">100%</span><button type="button" class="dk-ib" data-act="zoomin" title="Perbesar">+</button>
      <button type="button" class="dk-ib" data-act="fullscreen" title="Layar penuh">${icon('dkExpand')}</button>
    </div>
  </section>
  <aside class="dk-side dk-pn" aria-label="Pengaturan slide">
    <div class="dk-tabs" role="tablist">
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="design">${icon('dkLay')}<span>Desain</span></button>
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="content">${icon('dkEdit')}<span>Konten</span></button>
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="data">${icon('dkData')}<span>Data</span></button>
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="ai">${icon('dkSpark')}<span>Joni AI</span></button>
    </div>
    <div class="dk-sb" id="dkSb" role="tabpanel"></div>
  </aside>
  <div class="dk-tools dk-pn" aria-label="Alat presentasi">
    ${[['add','＋','Tambah Slide'],['text','T','Teks'],['image','▧','Gambar'],['chart','▥','Grafik'],['table','▦','Tabel'],['shape','⬡','Bentuk'],['icon','☆','Ikon'],['logo','JNE','Logo'],['video','▷','Video']].map(x=>`<button type="button" data-act="${x[0]}" title="${x[2]}"><strong>${x[1]}</strong><span>${x[2]}</span></button>`).join('')}
    <button type="button" class="dk-assistant" data-act="assistant">✦ Joni AI Assistant</button>
  </div>
  <input id="dkCoverInput" type="file" accept="image/png,image/jpeg" hidden>
  <div class="dk-overlay" id="dkOverlay" hidden></div>`;

}

/* ---------- penggambaran ---------- */
function drawList(){
  const sl=st.deck.slides;
  q('#dkLh').textContent='Slide ('+sl.length+')';
  q('#dkThs').innerHTML=sl.map((s,i)=>{
    const t=s.title||LAYOUTS[s.layout].n;
    return`<div class="dk-tr${i===st.sel?' on':''}"><span class="dk-no">${i+1}</span>
      <button type="button" class="dk-th${i===st.sel?' on':''}" data-act="sel" data-i="${i}" aria-label="Slide ${i+1}: ${h(t)}"${i===st.sel?' aria-current="true"':''}>
      <span class="dk-fr" aria-hidden="true">${slideHTML(s,i+1,false)}</span></button></div>`;
  }).join('');
  keepVisible();
}
function drawThumb(i){
  const b=q('#dkThs').children[i];if(!b)return;
  const s=st.deck.slides[i];
  b.querySelector('.dk-fr').innerHTML=slideHTML(s,i+1,false);
  b.querySelector('.dk-th').setAttribute('aria-label','Slide '+(i+1)+': '+(s.title||LAYOUTS[s.layout].n));
}
function keepVisible(){
  const box=q('#dkThs'),el=box.children[st.sel];if(!el)return;
  const r=el.getBoundingClientRect(),c=box.getBoundingClientRect();
  if(r.top<c.top)box.scrollTop+=r.top-c.top-6;else if(r.bottom>c.bottom)box.scrollTop+=r.bottom-c.bottom+6;
  if(r.left<c.left)box.scrollLeft+=r.left-c.left-6;else if(r.right>c.right)box.scrollLeft+=r.right-c.right+6;
}
function drawStage(){
  const n=st.deck.slides.length;
  q('#dkFrame').innerHTML=slideHTML(cur(),st.sel+1,true);
  q('#dkFrame').style.setProperty('--dk-accent',st.deck.accent||'#12e8d8');
  q('#dkFrame').dataset.theme=st.deck.theme||'midnight';q('#dkFrame').dataset.background=st.deck.background||'solid';
  q('#dkCnt').textContent='Slide '+(st.sel+1)+' dari '+n;
  const dis=(a,v)=>{q('[data-act="'+a+'"]').disabled=v};
  dis('prev',st.sel===0);dis('next',st.sel===n-1);
  dis('add',n>=MAX_SLIDES);
}
function drawSide(){
  const s=cur();
  root.querySelectorAll('.dk-tab').forEach(t=>{const on=t.dataset.tab===st.tab;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false')});
  const sb=q('#dkSb');
  if(st.tab==='design'){
    sb.innerHTML=`<div class="dk-sh">Tema Presentasi</div><div class="dk-themes">${Object.entries(THEMES).map(([k,v])=>`<button type="button" class="dk-theme ${k}${st.deck.theme===k?' on':''}" data-act="theme" data-theme="${k}"><i></i><span>${v.name}</span></button>`).join('')}</div><div class="dk-sh">Palet Warna</div><div class="dk-colors">${PALETTE.map(c=>`<button type="button" data-act="color" data-color="${c}" class="${st.deck.accent===c?'on':''}" style="--sw:${c}" aria-label="Warna ${c}"></button>`).join('')}</div>`+ `<div class="dk-sh">Layout slide</div><div class="dk-lay">${Object.keys(LAYOUTS).map(k=>
      `<button type="button" class="dk-lb${k===s.layout?' on':''}" data-act="lay" data-lay="${k}" aria-pressed="${k===s.layout}">${LAYOUTS[k].i}<span>${h(LAYOUTS[k].n)}</span></button>`).join('')}</div>`+
      `<div class="dk-sh">Foto Sampul (slide judul)</div><div class="dk-cover-controls"><button type="button" class="dk-side-btn" data-act="uploadcover">＋ Pilih foto gudang / armada</button>${s.coverImage?'<button type="button" class="dk-side-btn" data-act="removecover">Hapus foto sampul</button>':''}</div><p class="dk-hint">JPG/PNG maksimal 8 MB. Foto disimpan dalam draft browser dan ikut ekspor PPTX.</p><div class="dk-sh">Latar Belakang</div><div class="dk-backgrounds"><button type="button" data-act="background" data-bg="solid" class="${st.deck.background==='solid'?'on':''}">Solid</button><button type="button" data-act="background" data-bg="gradient" class="${st.deck.background==='gradient'?'on':''}">Gradasi</button></div><p class="dk-hint">Ganti layout tanpa kehilangan isi teks.</p>`;
    return;
  }
  if(st.tab==='data'){sb.innerHTML=`<div class="dk-sh">Data Operasional</div><p class="dk-hint">Masukkan nilai yang telah diverifikasi pada slide KPI, Grafik, atau Tabel. Sinkronisasi otomatis dengan database belum diaktifkan.</p><button type="button" class="dk-side-btn" data-act="insertkpi">＋ Slide KPI</button><button type="button" class="dk-side-btn" data-act="insertchart">＋ Slide Grafik</button><button type="button" class="dk-side-btn" data-act="inserttable">＋ Slide Tabel</button>`;return}
  if(st.tab==='ai'){sb.innerHTML=`<div class="dk-sh">Joni AI Assistant</div><p class="dk-hint">Asisten pembuatan presentasi. Integrasi AI khusus Deck Studio belum terhubung; gunakan tab Konten untuk menyusun slide saat ini.</p><button type="button" class="dk-side-btn" data-act="contenttab">Edit konten slide</button>`;return}
  const out=[`<p class="dk-hint" style="margin:0 0 14px">Ketik di sini atau klik teks langsung pada slide.</p>`];
  LAYOUTS[s.layout].f.forEach(f=>{
    if(f==='k'){
      out.push('<div class="dk-sh">Metrik KPI</div><div class="dk-kg">'+s.k.map((x,i)=>
        `<div class="dk-kr"><b>Metrik ${i+1}</b>
          <input data-f="k" data-k="${i}" data-p="v" maxlength="9" value="${h(x.v)}" placeholder="Nilai" aria-label="Nilai metrik ${i+1}">
          <input data-f="k" data-k="${i}" data-p="l" maxlength="40" value="${h(x.l)}" placeholder="Nama metrik" aria-label="Nama metrik ${i+1}"></div>`).join('')+'</div>');
      return;
    }
    const d=FIELDS[f];
    out.push(`<label class="dk-fd"><span>${h(d.l)}</span>${
      d.t==='text'
        ?`<textarea data-f="${f}" maxlength="${d.m}" placeholder="${h(d.p)}">\n${h(s[f])}</textarea>${d.hint?`<small>${h(d.hint)}</small>`:''}`
        :`<input data-f="${f}" maxlength="${d.m}" value="${h(s[f])}" placeholder="${h(d.p)}" autocomplete="off">`}</label>`);
  });
  sb.innerHTML=out.join('');
}
function drawAll(){
  q('[data-name]').value=st.deck.name;root.style.setProperty('--dk-accent',st.deck.accent||'#12e8d8');
  drawList();drawStage();drawSide();
}

/* ---------- aksi ---------- */
function select(i){
  st.sel=Math.min(Math.max(i,0),st.deck.slides.length-1);
  drawList();drawStage();drawSide();dirty();
}
function focusField(f,k,p){
  st.tab='content';drawSide();
  const sel=f==='k'?`[data-f="k"][data-k="${k}"][data-p="${p}"]`:`[data-f="${f}"]`;
  const el=q('#dkSb').querySelector(sel);
  if(el){el.focus();try{el.scrollIntoView({block:'nearest'})}catch(_){}}
}
const ACT={
  add(){
    const sl=st.deck.slides;
    if(sl.length>=MAX_SLIDES){say('Maksimal '+MAX_SLIDES+' slide');return}
    const s=emptySlide('content');s.title='Judul slide';
    sl.splice(st.sel+1,0,s);st.sel+=1;st.tab='content';
    drawList();drawStage();drawSide();dirty();
    const t=q('#dkSb [data-f="title"]');if(t){t.focus();t.select&&t.select()}
  },
  dup(){
    const sl=st.deck.slides;
    if(sl.length>=MAX_SLIDES){say('Maksimal '+MAX_SLIDES+' slide');return}
    const c=JSON.parse(JSON.stringify(cur()));c.id=rid();
    sl.splice(st.sel+1,0,c);st.sel+=1;
    drawList();drawStage();drawSide();dirty();say('Slide diduplikat');
  },
  del(){
    const sl=st.deck.slides;
    if(sl.length<=1){say('Presentasi minimal punya 1 slide');return}
    if(!confirm('Hapus slide '+(st.sel+1)+'?'))return;
    sl.splice(st.sel,1);st.sel=Math.min(st.sel,sl.length-1);
    drawList();drawStage();drawSide();dirty();say('Slide dihapus');
  },
  up(){move(-1)},down(){move(1)},
  prev(){select(st.sel-1)},next(){select(st.sel+1)},
  save(){save();say('Draft tersimpan di browser ini')},
  preview(){showPreview()},
  export(){exportPPTX()},
  fullscreen(){const el=q('.dk-stage');if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen()},
  zoomin(){zoom=Math.min(125,zoom+10);applyZoom()},zoomout(){zoom=Math.max(70,zoom-10);applyZoom()},
  text(){st.tab='content';drawSide();focusField('title')},
  image(){say('Gambar bebas belum didukung di versi ini; elemen teks dan slide tetap bisa diedit')},
  chart(){insertLayout('chart')},table(){insertLayout('table')},
  shape(){say('Bentuk bebas belum tersedia')},icon(){say('Ikon bebas belum tersedia')},
  logo(){say('Logo JNE sudah tersedia pada tema slide')},video(){say('Video belum didukung dalam ekspor PPTX')},
  assistant(){st.tab='ai';drawSide()},contenttab(){st.tab='content';drawSide()},

  uploadcover(){
    const input=q('#dkCoverInput');
    if(!input){say('Input foto tidak ditemukan. Muat ulang halaman.');return}
    input.value='';
    input.click();
  },
  removecover(){
    cur().coverImage='';
    drawStage();drawThumb(st.sel);drawSide();dirty();
    say('Foto sampul dihapus');
  },

   insertkpi(){insertLayout('kpi')},insertchart(){insertLayout('chart')},inserttable(){insertLayout('table')}
};
let zoom=100;function applyZoom(){q('#dkZoom').textContent=zoom+'%';q('#dkFrame').style.transform='scale('+(zoom/100)+')';q('#dkFrame').style.transformOrigin='center center'}
function insertLayout(layout){if(st.deck.slides.length>=MAX_SLIDES)return say('Maksimal '+MAX_SLIDES+' slide');const x=emptySlide(layout);x.title=LAYOUTS[layout].n;st.deck.slides.splice(st.sel+1,0,x);st.sel++;st.tab='content';drawAll();dirty()}
function move(d){
  const sl=st.deck.slides,j=st.sel+d;if(j<0||j>=sl.length)return;
  [sl[st.sel],sl[j]]=[sl[j],sl[st.sel]];st.sel=j;
  drawList();drawStage();dirty();
}

root.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(b&&root.contains(b)){
    const a=b.dataset.act;
    if(a==='sel')select(+b.dataset.i);
    else if(a==='tab'){st.tab=b.dataset.tab;drawSide()}
    else if(a==='theme'){st.deck.theme=b.dataset.theme;st.deck.accent=THEMES[st.deck.theme].accent;drawAll();dirty()}
    else if(a==='color'){st.deck.accent=b.dataset.color;drawAll();dirty()}
    else if(a==='background'){st.deck.background=b.dataset.bg;drawAll();dirty()}
    else if(a==='lay'){const s=cur();if(s.layout!==b.dataset.lay&&LAYOUTS[b.dataset.lay]){s.layout=b.dataset.lay;drawList();drawStage();drawSide();dirty()}}
    else if(ACT[a])ACT[a]();
    return;
  }
  const f=e.target.closest('#dkFrame [data-f]');
  if(f)focusField(f.dataset.f,f.dataset.k,f.dataset.p);
});
/* Foto sampul: proses file, kompres agar aman untuk localStorage, lalu perbarui slide. */
root.addEventListener('change',async e=>{
  if(e.target.id!=='dkCoverInput')return;
  const file=e.target.files&&e.target.files[0];
  if(!file)return;
  if(!['image/jpeg','image/png'].includes(file.type)){
    say('Pilih foto JPG atau PNG');return;
  }
  if(file.size>8*1024*1024){say('Ukuran foto maksimal 8 MB');return}
  const slideId=cur().id;
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{
      img.onload=resolve;img.onerror=()=>reject(new Error('Foto tidak dapat dibaca'));
      img.src=url;
    });
    const canvas=document.createElement('canvas');
    const maxDim=1400,scale=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas tidak tersedia');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let data='';
    for(const quality of [.82,.7,.55,.4]){
      data=canvas.toDataURL('image/jpeg',quality);
      if(data.length<1250000)break;
    }
    if(data.length>=1250000)throw new Error('Foto terlalu besar untuk disimpan. Coba foto yang lebih kecil.');
    const target=st.deck.slides.find(s=>s.id===slideId);
    if(!target)return;
    target.coverImage=data;
    drawStage();drawThumb(st.sel);drawSide();dirty();
    say('Foto sampul berhasil ditambahkan');
  }catch(err){console.error('[Deck Studio cover]',err);say(err.message||'Gagal memuat foto')}
  finally{URL.revokeObjectURL(url);e.target.value=''}
});

root.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('#dkFrame [data-f]')){
    e.preventDefault();const f=e.target;focusField(f.dataset.f,f.dataset.k,f.dataset.p);
  }
});
root.addEventListener('input',e=>{
  const t=e.target;
  if(t.hasAttribute&&t.hasAttribute('data-name')){st.deck.name=clip(t.value,MAX_NAME);dirty();return}
  const f=t.dataset&&t.dataset.f;if(!f||!FIELDS[f]&&f!=='k')return;
  const s=cur();
  if(f==='k'){const o=s.k[+t.dataset.k];if(!o)return;o[t.dataset.p==='v'?'v':'l']=t.value}
  else s[f]=t.value;
  drawStage();drawThumb(st.sel);dirty();
});

/* ---------- preview & ekspor editable PPTX ---------- */
function showPreview(){
 const ov=q('#dkOverlay');let i=st.sel;
 function render(){ov.innerHTML=`<div class="dk-preview-top"><b>${h(st.deck.name)}</b><span>Slide ${i+1} / ${st.deck.slides.length}</span><button type="button" data-prev="close">✕ Tutup</button></div><div class="dk-preview-slide">${slideHTML(st.deck.slides[i],i+1,false)}</div><div class="dk-preview-bottom"><button type="button" data-prev="back">← Sebelumnya</button><button type="button" data-prev="forward">Berikutnya →</button></div>`;ov.querySelector('.dk-preview-slide').style.setProperty('--dk-accent',st.deck.accent);ov.querySelector('.dk-preview-slide').dataset.theme=st.deck.theme}
 ov.hidden=false;render();
 ov.onclick=e=>{const a=e.target.closest('[data-prev]')?.dataset.prev;if(a==='close'){ov.hidden=true;ov.onclick=null}else if(a==='back'){i=Math.max(0,i-1);render()}else if(a==='forward'){i=Math.min(st.deck.slides.length-1,i+1);render()}};
}
let pptxLoading=null;
function getPptxConstructor(){
  const candidates=[window.pptxgen,window.PptxGenJS,window.pptxgenjs,window.PptxGenJs];
  for(const c of candidates){if(typeof c==='function')return c;if(c&&typeof c.default==='function')return c.default;}
  return null;
}
function loadPptx(){
  const ready=getPptxConstructor();if(ready)return Promise.resolve(ready);
  if(pptxLoading)return pptxLoading;
  const urls=[
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
  ];
  pptxLoading=new Promise((resolve,reject)=>{
    let index=0;
    function attempt(){
      if(index>=urls.length){reject(new Error('Pustaka PowerPoint gagal dimuat. Periksa akses CDN di browser (Network/Console).'));return;}
      const url=urls[index++],sc=document.createElement('script');
      sc.src=url;sc.async=true;
      sc.onload=()=>{const P=getPptxConstructor();if(P)resolve(P);else{console.warn('[Deck Studio] CDN loaded without PPTX global:',url);attempt();}};
      sc.onerror=()=>{console.warn('[Deck Studio] CDN unavailable:',url);attempt();};
      document.head.appendChild(sc);
    }
    attempt();
  }).catch(e=>{pptxLoading=null;throw e});
  return pptxLoading;
}
async function exportPPTX(){const btn=q('[data-act="export"]');btn.disabled=true;const prev=btn.innerHTML;btn.textContent='Membuat PPTX…';
 try{const P=await loadPptx(),pptx=new P();pptx.layout='LAYOUT_WIDE';pptx.author='LEGUTI Operations Intelligence';pptx.subject='Outbound Performance';pptx.title=st.deck.name;pptx.lang='id-ID';
 const accent=(st.deck.accent||'#12e8d8').replace('#','');const dark=st.deck.theme!=='arctic',bg=dark?(st.deck.theme==='aurora'?'150E35':'07132D'):'EFF6FF',fg=dark?'FFFFFF':'12264A';
 const tx=(slide,text,x,y,w,h,size=22,opt={})=>{if(!String(text||'').trim())return;slide.addText(String(text),{x,y,w,h,fontFace:'Aptos',fontSize:size,color:fg,margin:0,breakLine:false,fit:'shrink',...opt})};
 st.deck.slides.forEach((s,i)=>{const sl=pptx.addSlide();sl.background={color:bg};sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:.08,line:{color:accent},fill:{color:accent}});
 if(s.layout==='title'||s.layout==='section'){
  if(s.layout==='title'&&s.coverImage){sl.addImage({data:s.coverImage,x:7.25,y:.10,w:6.08,h:7.0});}
 sl.addShape(pptx.ShapeType.chevron,{x:10.8,y:0,w:2.55,h:7.5,line:{color:accent,transparency:100},fill:{color:accent,transparency:77}});
 tx(sl,'JNE  |  LEGUTI',.8,.45,5,.45,20,{bold:true});tx(sl,s.kicker,.8,2.0,10,.35,15,{bold:true,color:accent,charSpacing:2});tx(sl,s.title,.8,2.5,s.coverImage&&s.layout==='title'?6.3:10.8,1.45,42,{bold:true});tx(sl,s.subtitle,.8,4.45,s.coverImage&&s.layout==='title'?6.2:10,.75,23,{italic:true});tx(sl,s.meta,.8,5.5,8,.5,18);
 }else{
 tx(sl,s.title,.75,.55,11.8,.75,31,{bold:true});sl.addShape(pptx.ShapeType.line,{x:.75,y:1.45,w:1.3,h:0,line:{color:accent,width:3}});
 if(s.layout==='kpi'){s.k.forEach((k,j)=>{const x=.75+j*3.16;sl.addShape(pptx.ShapeType.roundRect,{x,y:2.45,w:2.9,h:2.0,rectRadius:.15,line:{color:accent,width:1},fill:{color:dark?'11244B':'FFFFFF'}});tx(sl,k.v,x+.2,2.85,2.5,.7,29,{bold:true,color:accent});tx(sl,k.l,x+.2,3.65,2.5,.5,16)});tx(sl,s.subtitle,.8,5.2,11,.65,17)}
 else if(s.layout==='twocol'){[[s.leftHead,s.left],[s.rightHead,s.right]].forEach(([hd,body],j)=>{const x=.75+j*6.35;sl.addShape(pptx.ShapeType.roundRect,{x,y:2.0,w:5.9,h:4.35,rectRadius:.12,line:{color:accent,width:1},fill:{color:dark?'11244B':'FFFFFF'}});tx(sl,hd,x+.3,2.35,5.3,.55,22,{bold:true,color:accent});tx(sl,lines(body).map(v=>'• '+v).join('\n'),x+.3,3.15,5.3,2.7,18,{breakLine:false})})}
 else if(s.layout==='insight'){sl.addShape(pptx.ShapeType.roundRect,{x:.8,y:2,w:11.7,h:1.6,rectRadius:.1,line:{color:accent,width:1},fill:{color:dark?'18275C':'FFFFFF'}});tx(sl,s.insight,1.2,2.28,10.9,1.0,23,{bold:true});tx(sl,lines(s.body).map(v=>'• '+v).join('\n'),1,4.0,11,2.2,20)}
 else if(s.layout==='chart'){const vals=lines(s.body).slice(0,7).map(x=>{const a=x.split(':');return{label:a[0],value:Math.max(0,Number(a[1])||0)}}),max=Math.max(1,...vals.map(v=>v.value));vals.forEach((v,j)=>{const y=1.9+j*.66;tx(sl,v.label,.85,y,2.2,.4,15);sl.addShape(pptx.ShapeType.rect,{x:3,y:y+.06,w:Math.max(.05,v.value/max*8),h:.3,line:{color:accent,transparency:100},fill:{color:accent}});tx(sl,String(v.value),11.3,y,1.2,.4,15)})}
 else if(s.layout==='table'){lines(s.body).slice(0,8).forEach((line,j)=>{const parts=line.split('|').slice(0,4);parts.forEach((part,k)=>{const x=.85+k*3.05,y=1.9+j*.59;sl.addShape(pptx.ShapeType.rect,{x,y,w:3.0,h:.55,line:{color:'375178',width:.5},fill:{color:j===0?accent:(dark?'102348':'FFFFFF')}});tx(sl,part.trim(),x+.12,y+.11,2.75,.35,13,{bold:j===0,color:j===0?'06172E':fg})})})}
 else tx(sl,lines(s.body).map(v=>'• '+v).join('\n'),1,2,11.3,4.4,23);
 }
 tx(sl,'LEGUTI  •  Operations Intelligence',.8,7.06,8,.25,9,{color:accent});tx(sl,String(i+1),12.3,7.06,.3,.25,9,{align:'right'});
 });
 const name=(st.deck.name||'LEGUTI-Deck').replace(/[\\/:*?"<>|]/g,'-').slice(0,60)+'.pptx';await pptx.writeFile({fileName:name});say('PowerPoint berhasil diekspor (teks dan bentuk dapat diedit)')
 }catch(e){console.error('[Deck Studio PPTX]',e);alert('Ekspor PPTX gagal: '+e.message)}finally{btn.disabled=false;btn.innerHTML=prev}}

/* ---------- integrasi ke dashboard (tanpa mengubah fitur yang ada) ---------- */
// Item menu baru, ditempatkan sebelum "Pengaturan".
if(!NAV.some(n=>n[0]==='deck')){
  const i=NAV.findIndex(n=>n[0]==='set');
  NAV.splice(i<0?NAV.length:i,0,['deck','Deck Studio','LEGUTI Deck Studio']);
}
const subEl=document.querySelector('.hero .sub'),subOrig=subEl?subEl.textContent:'';

function mount(){
  build();
  const k=uid();
  if(loadedFor!==k){flush();loadedFor=k;st=load(k)}
  drawAll();
}

const _chrome=chrome;
chrome=function(){
  _chrome();
  const on=view==='deck';
  document.body.classList.toggle('dk-on',on);
  root.hidden=!on;
  if(subEl)subEl.textContent=on?'Susun presentasi operasional langsung dari website':subOrig;
  if(on){const vx=document.getElementById('vx');if(vx)vx.hidden=true;mount()}else flush();
};
const _page=page;
page=function(){if(view==='deck')return;_page()};

window.addEventListener('pagehide',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});

// Data presentasi (read-only) untuk tahap berikutnya, mis. ekspor PPTX.
window.LEGUTI_DECK={get:()=>JSON.parse(JSON.stringify(st.deck))};

// Bila menu sudah tergambar sebelum modul ini dimuat, gambar ulang agar item baru muncul.
setTimeout(()=>{if(!document.querySelector('#nav [data-v="deck"]'))chrome()},0);
})();
