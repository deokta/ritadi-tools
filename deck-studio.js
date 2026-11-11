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
  dkEdit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4'
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
  id:rid(),layout,kicker:'',title:'',subtitle:'',meta:'',body:'',leftHead:'',left:'',rightHead:'',right:'',insight:'',
  k:[{v:'',l:''},{v:'',l:''},{v:'',l:''},{v:'',l:''}]
});
function cleanSlide(o){
  const s=emptySlide(LAYOUTS[o&&o.layout]?o.layout:'content');
  if(!o||typeof o!=='object')return s;
  if(typeof o.id==='string'&&o.id)s.id=o.id.slice(0,24);
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
  return{name:'Presentasi Operasional',slides:[a,b,c]};
}
function load(k){
  try{
    const o=JSON.parse(localStorage.getItem(PFX+k));
    if(o&&o.deck&&Array.isArray(o.deck.slides)&&o.deck.slides.length){
      const slides=o.deck.slides.slice(0,MAX_SLIDES).map(cleanSlide);
      return{deck:{name:clip(o.deck.name,MAX_NAME)||'Presentasi Operasional',slides},sel:Math.min(Math.max(+o.sel||0,0),slides.length-1),tab:'design'};
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
      b=`<div class="dk-shape"></div>${brand}<div class="dk-main">${T('kicker','dk-kick')}${T('title','dk-ti')}<div class="dk-bar2"></div>${T('subtitle','dk-sub')}${T('meta','dk-meta')}</div>`;break;
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
    <label class="dk-nm"><span>Nama presentasi</span><input data-name maxlength="${MAX_NAME}" autocomplete="off"></label>
    <div class="dk-sv" id="dkSv"><i></i><span>Tersimpan otomatis</span></div>
    <button type="button" class="nb g" disabled title="Tersedia di tahap berikutnya" style="height:42px;margin:0">Ekspor PPTX</button>
  </div>
  <aside class="dk-list dk-pn" aria-label="Daftar slide">
    <div class="dk-lh"><span id="dkLh"></span><button type="button" class="dk-add" data-act="add" aria-label="Tambah slide" title="Tambah slide">${icon('dkPlus')}</button></div>
    <div class="dk-ths" id="dkThs"></div>
  </aside>
  <section class="dk-stage dk-pn" aria-label="Editor slide">
    <div class="dk-frame" id="dkFrame"></div>
    <div class="dk-ctl">
      <button type="button" class="dk-ib" data-act="prev" aria-label="Slide sebelumnya">${icon('dkPrev')}</button>
      <span class="dk-cnt" id="dkCnt" aria-live="polite"></span>
      <button type="button" class="dk-ib" data-act="next" aria-label="Slide berikutnya">${icon('dkNext')}</button>
      <span class="dk-sep"></span>
      <button type="button" class="dk-ib" data-act="up" aria-label="Geser slide ke atas" title="Geser ke atas">${icon('dkUp')}</button>
      <button type="button" class="dk-ib" data-act="down" aria-label="Geser slide ke bawah" title="Geser ke bawah">${icon('dkDown')}</button>
      <button type="button" class="dk-ib" data-act="dup" title="Duplikat slide">${icon('dkCopy')}<span>Duplikat</span></button>
      <button type="button" class="dk-ib dg" data-act="del" title="Hapus slide">${icon('dkTrash')}<span>Hapus</span></button>
    </div>
  </section>
  <aside class="dk-side dk-pn" aria-label="Pengaturan slide">
    <div class="dk-tabs" role="tablist">
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="design">${icon('dkLay')}Desain</button>
      <button type="button" class="dk-tab" role="tab" data-act="tab" data-tab="content">${icon('dkEdit')}Konten</button>
    </div>
    <div class="dk-sb" id="dkSb" role="tabpanel"></div>
  </aside>`;
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
  q('#dkCnt').textContent='Slide '+(st.sel+1)+' dari '+n;
  const dis=(a,v)=>{q('[data-act="'+a+'"]').disabled=v};
  dis('prev',st.sel===0);dis('next',st.sel===n-1);dis('up',st.sel===0);dis('down',st.sel===n-1);dis('del',n<=1);
  dis('add',n>=MAX_SLIDES);
}
function drawSide(){
  const s=cur();
  root.querySelectorAll('.dk-tab').forEach(t=>{const on=t.dataset.tab===st.tab;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false')});
  const sb=q('#dkSb');
  if(st.tab==='design'){
    sb.innerHTML=`<div class="dk-sh">Layout slide</div><div class="dk-lay">${Object.keys(LAYOUTS).map(k=>
      `<button type="button" class="dk-lb${k===s.layout?' on':''}" data-act="lay" data-lay="${k}" aria-pressed="${k===s.layout}">${LAYOUTS[k].i}<span>${h(LAYOUTS[k].n)}</span></button>`).join('')}</div>
      <p class="dk-hint">Teks yang sudah diisi tetap tersimpan saat layout diganti, jadi Anda bisa mencoba layout lain tanpa kehilangan isi.</p>`;
    return;
  }
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
  q('[data-name]').value=st.deck.name;
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
  prev(){select(st.sel-1)},next(){select(st.sel+1)}
};
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
    else if(a==='lay'){const s=cur();if(s.layout!==b.dataset.lay&&LAYOUTS[b.dataset.lay]){s.layout=b.dataset.lay;drawList();drawStage();drawSide();dirty()}}
    else if(ACT[a])ACT[a]();
    return;
  }
  const f=e.target.closest('#dkFrame [data-f]');
  if(f)focusField(f.dataset.f,f.dataset.k,f.dataset.p);
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
