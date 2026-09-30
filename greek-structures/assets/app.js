(function(){
const S=window.SITE, $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const corrById=Object.fromEntries(S.corrections.map(c=>[c.id,c]));
const flagsHTML=ids=>ids&&ids.length?`<div class="flags">${ids.map(id=>{const c=corrById[id];return `<a class="flag" href="#${id}" data-corr="${id}" title="${esc(c.issue.replace(/<[^>]+>/g,''))}">⚑ ${id.slice(1)} · ${c.type}</a>`}).join('')}</div>`:'';
const img=k=>S.images[k];

/* ---- Timeline ---- */
const tr=$('#tlTrack'), panel=$('#tlPanel'); let cur=1;
S.timeline.forEach((e,i)=>{
  const b=document.createElement('button');
  b.className='era'+(e.added?' added':''); b.role='tab'; b.id='era-'+e.id;
  b.innerHTML=`${e.added?'<span class="tag">Background</span>':''}<span class="r">${e.range}</span><span class="t">${e.title}</span>`;
  b.onclick=()=>showEra(i); tr.appendChild(b);
});
function showEra(i){
  cur=i; const e=S.timeline[i];
  $$('.era',tr).forEach((b,j)=>b.setAttribute('aria-selected',j===i));
  panel.innerHTML=`<div class="range">${e.range}</div><h3>${e.title}</h3>
   <div class="tl-grid"><div>
     ${e.H?`<div class="hq">${esc(e.H)}</div>`:''}${e.H2?`<div class="hq cont">${esc(e.H2)}</div>`:''}
     ${e.summary?`<div class="en">${e.summary}</div>`:''}
     ${flagsHTML(e.corr)}
   </div><div><div class="en" style="background:none;border-left-color:transparent;padding-left:0"></div>
     <ul class="events">${e.events.map(([d,t])=>`<li><b>${d}</b>${t}</li>`).join('')}</ul></div></div>
   <div class="tl-nav"><button class="btn" id="tlPrev" ${i===0?'disabled':''}>‹ Earlier</button><button class="btn" id="tlNext" ${i===S.timeline.length-1?'disabled':''}>Later ›</button></div>`;
  $('#tlPrev').onclick=()=>showEra(cur-1); $('#tlNext').onclick=()=>showEra(cur+1);
}
showEra(1);
tr.addEventListener('keydown',ev=>{if(ev.key==='ArrowRight'||ev.key==='ArrowDown'){ev.preventDefault();showEra(Math.min(cur+1,S.timeline.length-1));$$('.era',tr)[cur].focus()}
  if(ev.key==='ArrowLeft'||ev.key==='ArrowUp'){ev.preventDefault();showEra(Math.max(cur-1,0));$$('.era',tr)[cur].focus()}});

/* ---- Gallery + lightbox ---- */
const keys=Object.keys(S.images), themes={all:'All',cities:'Cities & colonies',civic:'Civic buildings',temples:'Temples & sanctuaries',life:'Assembly, courts, army, games, theatre',arts:'Arts'};
const gal=$('#gal'), gf=$('#galFilters');
Object.entries(themes).forEach(([k,v])=>{const b=document.createElement('button');b.className='btn'+(k==='all'?' on':'');b.textContent=v;b.onclick=()=>{$$('.btn',gf).forEach(x=>x.classList.remove('on'));b.classList.add('on');$$('figure',gal).forEach(f=>f.classList.toggle('hide',k!=='all'&&f.dataset.theme!==k))};gf.appendChild(b)});
keys.forEach(k=>{const m=img(k);const f=document.createElement('figure');f.dataset.theme=m.theme;f.dataset.key=k;
  f.innerHTML=`<img loading="lazy" src="images/${m.file}" alt="${esc(m.caption)}"><figcaption>${esc(m.caption)}<small>${esc(m.artist)} · ${esc(m.license)}</small></figcaption>`;
  f.onclick=()=>openLB(k);gal.appendChild(f)});
const lb=$('#lb'); let lbk=null;
function openLB(k){lbk=k;const m=img(k);$('img',lb).src='images/'+m.file;$('img',lb).alt=m.caption;
  $('.cap',lb).innerHTML=`${esc(m.caption)}<br><small>${esc(m.artist)} · <a href="${m.licenseUrl||m.page}" target="_blank" rel="noopener">${esc(m.license)}</a> · <a href="${m.page}" target="_blank" rel="noopener">Wikimedia Commons</a></small>`;
  lb.classList.add('open');$('.lb-x',lb).focus()}
const step=d=>{const i=keys.indexOf(lbk);openLB(keys[(i+d+keys.length)%keys.length])};
$('.lb-x',lb).onclick=()=>lb.classList.remove('open');$('.lb-p',lb).onclick=()=>step(-1);$('.lb-n',lb).onclick=()=>step(1);
lb.onclick=e=>{if(e.target===lb)lb.classList.remove('open')};
document.addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1)});
document.addEventListener('click',e=>{const t=e.target.closest('[data-zoom]');if(t){e.preventDefault();openLB(t.dataset.zoom)}});

/* ---- Tabs ---- */
const tabs=$('#tabs'), tp=$('#tabPanel');
S.tabs.forEach((t,i)=>{const b=document.createElement('button');b.className='tab';b.role='tab';b.innerHTML=`<span class="ic" aria-hidden="true">${t.icon}</span>${t.label}`;b.onclick=()=>showTab(i);tabs.appendChild(b)});
function cardHTML(c){
  const m=c.img&&img(c.img);
  const peek=(c.H[0]||c.E[0]).replace(/<[^>]+>/g,'');
  const fig=m?`<figure><img src="images/${m.file}" alt="${esc(m.caption)}" data-zoom="${c.img}"><figcaption>${esc(m.caption)}. ${esc(m.artist)}, ${esc(m.license)}.</figcaption></figure>`:'';
  const key=c.plan?`<ol class="key">${S.agoraKey.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="note">Key from the plan’s Wikimedia Commons page.</p>`:'';
  return `<details class="card"><summary>${m?`<img class="th" src="images/${m.file}" alt="">`:'<span class="th">❦</span>'}<div><h4>${c.title}</h4><div class="peek">${esc(peek)}</div><span class="more">Open</span></div></summary>
   <div class="body${m?'':' noimg'}"><div>${c.H.map((h,j)=>`<div class="hq${j?' cont':''}">${esc(h)}</div>`).join('')}${flagsHTML(c.corr)}</div>
   <div><div class="en"><ul>${c.E.map(x=>`<li>${x}</li>`).join('')}</ul></div>${fig}${key}</div></div></details>`;
}
function modelHTML(t){
  return `<div class="model"><div class="hq">${esc(S.modelIntro)}</div>
   <div class="mrows">${t.cards.map((c,i)=>`<button class="mrow" data-i="${i}"><span class="nm">${c.title}</span><span class="pub">${c.pair[0]}</span><span class="ar">⇄</span><span class="spk">${c.pair[1]}</span></button>`).join('')}</div>
   <p class="note">Green = the gathered public; red = those who speak or perform, drawn from among them. Click a row to open its card below.</p>
   ${S.discourse.map((d,j)=>`<div class="hq${j?' cont':''}">${esc(d)}</div>`).join('')}</div>`;
}
const HD={
 megaron:{t:'Megaron hall (Mycenaean / early)',c:'A long hall entered through a porch and a vestibule, with the central hearth in the main room. It is oriented toward its entrance.',
  svg:`<rect x="180" y="40" width="200" height="300" fill="#efe0bd" stroke="#2b2118" stroke-width="3"/><line x1="180" y1="260" x2="380" y2="260" stroke="#2b2118" stroke-width="3"/><line x1="180" y1="300" x2="380" y2="300" stroke="#2b2118" stroke-width="3"/><circle cx="280" cy="150" r="26" fill="#c9582c" opacity=".8"/><text x="280" y="155" text-anchor="middle" font-size="13" fill="#fff">hearth</text><circle cx="225" cy="340" r="7" fill="#2b2118"/><circle cx="335" cy="340" r="7" fill="#2b2118"/><path d="M280 400 v-50" stroke="#8b3a1e" stroke-width="4" marker-end="url(#ar)"/><text x="280" y="420" text-anchor="middle" font-size="14">entrance · porch</text><text x="400" y="150" font-size="14">main hall</text><text x="400" y="285" font-size="14">vestibule</text>`},
 house:{t:'Classical courtyard house (e.g. Olynthus)',c:'Rooms face inward onto an open court, often with a porch (pastas) on one side. A single door leads to the street, and the family’s life looks inward.',
  svg:`<rect x="120" y="40" width="320" height="320" fill="#efe0bd" stroke="#2b2118" stroke-width="3"/><rect x="190" y="150" width="180" height="140" fill="#f8f1de" stroke="#556b3a" stroke-width="2" stroke-dasharray="6 4"/><text x="280" y="225" text-anchor="middle" font-size="15" fill="#556b3a">open court</text><rect x="120" y="110" width="320" height="40" fill="#e3cf9f" stroke="#2b2118" stroke-width="1.5"/><text x="280" y="135" text-anchor="middle" font-size="13">pastas (porch)</text>${[160,220,280,340,400].map(x=>`<circle cx="${x}" cy="150" r="5" fill="#2b2118"/>`).join('')}<line x1="120" y1="290" x2="190" y2="290" stroke="#2b2118" stroke-width="2"/><line x1="370" y1="290" x2="440" y2="290" stroke="#2b2118" stroke-width="2"/><text x="150" y="80" font-size="13">rooms</text><text x="380" y="80" font-size="13">andrōn</text><text x="135" y="325" font-size="13">rooms</text><path d="M280 420 v-55" stroke="#8b3a1e" stroke-width="4" marker-end="url(#ar)"/><text x="280" y="440" text-anchor="middle" font-size="14">single street door</text>${[[150,220,195,220],[410,220,365,220],[280,330,280,295],[280,160,280,185]].map(([a,b,c,d])=>`<path d="M${a} ${b} L${c} ${d}" stroke="#556b3a" stroke-width="2.5" marker-end="url(#ar2)"/>`).join('')}<text x="280" y="250" text-anchor="middle" font-size="12" fill="#556b3a">rooms open inward</text>`},
 temple:{t:'Peripteral temple (e.g. Hephaisteion)',c:'The cella (the god’s ‘house’) is wrapped in a colonnade that faces outward on every side. Public worship took place at the altar in front of the east façade. The Hephaisteion has 6 × 13 columns.',
  svg:`<rect x="130" y="30" width="300" height="360" fill="none" stroke="#2b2118" stroke-width="2"/>${Array.from({length:6},(_,i)=>130+i*60).map(x=>`<circle cx="${x}" cy="30" r="7" fill="#2b2118"/><circle cx="${x}" cy="390" r="7" fill="#2b2118"/>`).join('')}${Array.from({length:13},(_,i)=>30+i*30).map(y=>`<circle cx="130" cy="${y}" r="7" fill="#2b2118"/><circle cx="430" cy="${y}" r="7" fill="#2b2118"/>`).join('')}<rect x="200" y="80" width="160" height="260" fill="#efe0bd" stroke="#2b2118" stroke-width="3"/><line x1="200" y1="290" x2="360" y2="290" stroke="#2b2118" stroke-width="2"/><rect x="262" y="110" width="36" height="30" fill="#a8812f"/><text x="280" y="170" text-anchor="middle" font-size="13">cult statue</text><text x="280" y="225" text-anchor="middle" font-size="15">naos / cella</text><text x="280" y="318" text-anchor="middle" font-size="13">pronaos</text><rect x="245" y="430" width="70" height="22" fill="#c9582c"/><text x="280" y="446" text-anchor="middle" font-size="12" fill="#fff">altar</text>${[[280,400,280,425],[140,210,95,210],[420,210,465,210],[280,20,280,0]].map(([a,b,c,d])=>`<path d="M${a} ${b} L${c} ${d}" stroke="#556b3a" stroke-width="3" marker-end="url(#ar2)"/>`).join('')}<text x="470" y="200" font-size="13" fill="#556b3a">faces</text><text x="470" y="216" font-size="13" fill="#556b3a">outward</text>`}
};
function housesHTML(){return `<div class="hdiag"><div class="seg">${Object.entries(HD).map(([k,v],i)=>`<button class="btn${i===1?' on':''}" data-hd="${k}">${v.t}</button>`).join('')}</div><div id="hdSvg"></div></div>`}
function drawHD(k){const v=HD[k];$('#hdSvg').innerHTML=`<svg viewBox="40 -10 520 470" role="img" aria-label="${esc(v.t)} schematic plan"><defs><marker id="ar" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto"><path d="M0 0L14 7L0 14z" fill="#8b3a1e"/></marker><marker id="ar2" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto"><path d="M0 0L12 6L0 12z" fill="#556b3a"/></marker></defs><g font-family="EB Garamond, serif" fill="#2b2118">${v.svg}</g></svg><p class="cap"><b>${v.t}.</b> ${v.c} <i>(Schematic, not to scale.)</i></p>`;
  $$('[data-hd]').forEach(b=>b.classList.toggle('on',b.dataset.hd===k))}
function showTab(i){
  $$('.tab',tabs).forEach((b,j)=>b.setAttribute('aria-selected',j===i));
  const t=S.tabs[i];
  tp.innerHTML=`<div class="tabpanel"><p class="intro">${t.intro}</p>${t.model?modelHTML(t):''}${t.houses?housesHTML():''}<div class="cards">${t.cards.map(cardHTML).join('')}</div></div>`;
  if(t.houses){drawHD('house');$$('[data-hd]').forEach(b=>b.onclick=()=>drawHD(b.dataset.hd))}
  if(t.model)$$('.mrow',tp).forEach(r=>r.onclick=()=>{const d=$$('details.card',tp)[+r.dataset.i];$$('.mrow',tp).forEach(x=>x.classList.remove('on'));r.classList.add('on');d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'})});
}
showTab(0);

/* ---- Corrections ---- */
const cl=$('#corrList'), cf=$('#corrFilters');
cl.innerHTML=S.corrections.map(c=>`<details class="corr" id="${c.id}" data-type="${c.type}"><summary><span class="id">${c.id.slice(1)}.</span><span class="type ${c.type}">${c.type}</span><q>${esc(c.quote)}</q><span class="where">${c.where}</span></summary>
 <div class="cb"><p>${c.issue}</p><div class="sugg">${c.suggest}</div></div></details>`).join('');
const types=[...new Set(S.corrections.map(c=>c.type))];
[['All',S.corrections.length],...types.map(t=>[t,S.corrections.filter(c=>c.type===t).length])].forEach(([t,n],i)=>{const b=document.createElement('button');b.className='btn'+(i?'':' on');b.textContent=`${t} (${n})`;
  b.onclick=()=>{$$('.btn',cf).forEach(x=>x.classList.remove('on'));b.classList.add('on');$$('details.corr',cl).forEach(d=>d.style.display=(t==='All'||d.dataset.type===t)?'':'none')};cf.appendChild(b)});
$('#expandAll').onclick=e=>{const open=e.target.textContent==='Expand all';$$('details.corr',cl).forEach(d=>d.open=open);e.target.textContent=open?'Collapse all':'Expand all'};
document.addEventListener('click',e=>{const f=e.target.closest('[data-corr]');if(!f)return;e.preventDefault();const d=document.getElementById(f.dataset.corr);d.style.display='';d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});d.classList.remove('flash');void d.offsetWidth;d.classList.add('flash')});

/* ---- Handout & credits ---- */
$('#handoutText').textContent=S.handout.trim();
$('#credTable tbody').innerHTML=keys.map(k=>{const m=img(k);return `<tr><td><img src="images/${m.file}" alt="" data-zoom="${k}" style="cursor:zoom-in"></td><td>${esc(m.caption)}<br><small>${esc(m.title)}</small></td><td>${esc(m.artist)}</td><td>${m.licenseUrl?`<a href="${m.licenseUrl}" target="_blank" rel="noopener">${esc(m.license)}</a>`:esc(m.license)}</td><td><a href="${m.page}" target="_blank" rel="noopener">Commons file page</a></td></tr>`}).join('');

/* ---- nav highlight ---- */
const links=$$('nav.top a'), secs=links.map(a=>$(a.getAttribute('href')));
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+en.target.id))}}),{rootMargin:'-40% 0px -55% 0px'});
secs.forEach(s=>s&&io.observe(s));
})();
