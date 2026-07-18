function storageGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
function storageSet(key,value){try{localStorage.setItem(key,value);return true}catch(e){return false}}
function safeJson(key,fallback,validate){const raw=storageGet(key);if(raw===null)return fallback;try{const value=JSON.parse(raw);return !validate||validate(value)?value:fallback}catch(e){return fallback}}
function localDateString(d=new Date()){const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
let currentLaw=0,currentArticle=0,mode=storageGet("study_mode")||"all",currentScreen='home',detailReturnScreen='home';
const DONE_KEY="riyoushi_9laws_final_done_v3";
const WEAK_KEY="riyoushi_9laws_final_weak_v2";
const done=new Set(safeJson(DONE_KEY,[],Array.isArray));
const weak=new Set(safeJson(WEAK_KEY,[],Array.isArray));
const flat=[];
DATA.forEach((law,li)=>law.articles.forEach((a,ai)=>flat.push({law:li,article:ai,id:`${li}-${ai}`,item:a})));

const QUIZ_CATEGORY_BY_LAW={
  3:'barber_act',4:'rules',5:'order',6:'visit',7:'infection',8:'community',10:'consumer',
  12:'disinfection'
};
function quizCategoryForLaw(li, article){
  const law=DATA[li]||{};
  const name=law.name||'';
  const cat=(article&&article.category)||'';
  const title=(article&&article.title)||'';
  const text=name+' '+cat+' '+title;
  if(text.includes('理容師法施行規則'))return 'rules';
  if(text.includes('理容師法施行令'))return 'order';
  if(text.includes('理容師法'))return 'barber_act';
  if(text.includes('感染症'))return 'infection';
  if(text.includes('地域保健')||text.includes('保健所'))return 'community';
  if(text.includes('消費者'))return 'consumer';
  if(text.includes('出張理容')||text.includes('出張美容'))return 'visit';
  if(text.includes('衛生管理')||text.includes('消毒'))return 'disinfection';
  if(text.includes('保健')||text.includes('皮膚')||text.includes('毛髪'))return 'skin';
  if(text.includes('香粧品')||text.includes('化学'))return 'cosmetics';
  if(text.includes('文化論')||text.includes('文化史'))return 'history';
  if(text.includes('運営管理')||text.includes('店舗'))return 'shop';
  if(text.includes('理容技術理論')||text.includes('カッティング'))return 'cut';
  return QUIZ_CATEGORY_BY_LAW[li]||'barber_act';
}
function quizLinkFor(li, article){return `../過去問/index.html#cat=${encodeURIComponent(quizCategoryForLaw(li,article))}`;}
function quizCtaHtml(li, article, label='問題'){
  return `<a class="material-link quiz-link" href="${quizLinkFor(li,article)}">📝 ${label}</a>`;
}

function rankLabel(value){
  const v=String(value||'');
  if(v.includes('★★★★★'))return {cls:'red',label:'最重要'};
  if(v.includes('★★★★'))return {cls:'orange',label:'重要'};
  if(v.includes('★★★'))return {cls:'green',label:'頻出'};
  return {cls:'gray',label:'基本'};
}
function rankBadge(value){
  const r=rankLabel(value);
  return `<span class="rank-badge"><i class="rank-dot dot-${r.cls}"></i>${r.label}</span>`;
}
function openFromHash(){
  const hash=decodeURIComponent(location.hash||'');
  const m=hash.match(/law=(\d+)/);
  if(m){
    const li=Math.max(0,Math.min(DATA.length-1,Number(m[1])));
    currentLaw=li;
    renderArticles();
    show('lawScreen');
    return true;
  }
  const cat=hash.match(/cat=([^&]+)/);
  if(cat){
    const key=cat[1];
    const idx=DATA.findIndex(l=>(l.name||'').includes(key));
    if(idx>=0){currentLaw=idx;renderArticles();show('lawScreen');return true;}
  }
  return false;
}


function updateMaterialNav(){const back=document.getElementById('materialBack'),detailOpen=!document.getElementById('detail')?.classList.contains('hidden'),nav=back?.closest('.floating-nav');if(back)back.hidden=currentScreen==='home'&&!detailOpen;if(nav)nav.classList.toggle('with-article-nav',detailOpen)}
function show(id){currentScreen=id;document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");updateMaterialNav();window.scrollTo({top:0,behavior:"smooth"});}
function materialBack(){const detail=document.getElementById('detail');if(detail&&!detail.classList.contains('hidden')){detail.classList.add('hidden');currentScreen=detailReturnScreen;updateMaterialNav();return}if(currentScreen!=='home')show('home')}
function save(){storageSet(DONE_KEY,JSON.stringify([...done]));storageSet(WEAK_KEY,JSON.stringify([...weak]));renderHome();renderArticles();}
function isDone(li,ai){return done.has(`${li}-${ai}`);} function isWeak(li,ai){return weak.has(`${li}-${ai}`);}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function highlight(s,terms=[]){let out=escapeHtml(s);terms.forEach(t=>{if(!t)return;out=out.replaceAll(escapeHtml(t),`<span class="term">${escapeHtml(t)}</span>`)});return out;}
function bodyHtml(text,terms){const parts=text.split(/ (?=[一二三四五六七八九十12345678900-9]+[ 　])/);if(parts.length<=1)return `<p>${highlight(text,terms)}</p>`;const first=parts.shift();return `<p>${highlight(first,terms)}</p><ul class="body-list">`+parts.map(p=>`<li>${highlight(p.replace(/^[一二三四五六七八九十12345678900-9]+[ 　]/,""),terms)}</li>`).join("")+`</ul>`;}
function applyMode(){document.body.classList.remove("mode-text","mode-point");if(mode==="text")document.body.classList.add("mode-text");if(mode==="point")document.body.classList.add("mode-point");storageSet("study_mode",mode);}
function actionButtons(){return '';}
function bindActionButtons(){}
function renderHome(){
 const list=document.getElementById("lawList");list.innerHTML="";
 DATA.forEach((law,i)=>{
   const total=law.articles.length;
   const row=document.createElement("div");row.className=`law-row group-${law.color}`;
   row.innerHTML=`<div class="num">${i+1}</div><div class="law-main"><div class="law-title">${law.name}</div><a class="inline-quiz-link" href="${quizLinkFor(i,null)}" onclick="event.stopPropagation()">問題 ›</a></div><div class="law-meta">${total}項目 ›</div>`;
   row.addEventListener("click",()=>{currentLaw=i;renderArticles();show("lawScreen")});list.appendChild(row);
 });
 applyMode();
}
function renderHomeActions(){
 const box=document.getElementById("homeActions");if(box)box.remove();
}
function renderProgress(){
 const total=flat.length;
 const doneTotal=done.size;
 const percent=total?Math.round(doneTotal/total*100):0;
 const undone=Math.max(total-doneTotal,0);

 const countRank=(rank)=>{
   const items=flat.filter(x=>x.item.importance===rank || x.item.stars===rank);
   const learned=items.filter(x=>done.has(x.id)).length;
   return {learned,total:items.length};
 };
 const ss=countRank("★★★★★");
 const s=countRank("★★★★");
 const a=countRank("★★★");

 const doneLaws=DATA.filter((law,li)=>law.articles.length&&law.articles.every((a,ai)=>isDone(li,ai))).length;

 document.getElementById("doneCount").textContent=doneTotal+" / "+total;
 document.getElementById("undoneCount").textContent=undone;
 document.getElementById("ssDone").textContent=ss.learned+" / "+ss.total;
 document.getElementById("sDone").textContent=s.learned+" / "+s.total;
 document.getElementById("aDone").textContent=a.learned+" / "+a.total;
 document.getElementById("okCount").textContent=doneTotal;
 document.getElementById("doneLaws").textContent=doneLaws+" / "+DATA.length;
 document.getElementById("percent").textContent=percent+"%";
 document.getElementById("donut").style.background=`conic-gradient(#1266c3 0 ${percent}%,#e7ebf0 ${percent}% 100%)`;

 const lawBox=document.getElementById("lawProgressList");
 if(lawBox){
   lawBox.innerHTML="";
   DATA.forEach((law,li)=>{
     const totalLaw=law.articles.length;
     const learned=law.articles.filter((x,ai)=>isDone(li,ai)).length;
     const p=totalLaw?Math.round(learned/totalLaw*100):0;
     const row=document.createElement("div");
     row.className="progress-bar-row";
     row.innerHTML=`<div class="progress-label"><span>${law.name}</span><strong>${p}%</strong></div><div class="bar"><span style="width:${p}%"></span></div><div class="progress-small">${learned} / ${totalLaw}</div>`;
     lawBox.appendChild(row);
   });
 }

 const fieldBox=document.getElementById("fieldProgressList");
 if(fieldBox){
   fieldBox.innerHTML="";
   const fields=["衛生管理","保健","香粧品化学","文化論","運営管理","理容技術理論"];
   fields.forEach(field=>{
     const items=flat.filter(x=>(x.item.category||"").includes(field) || (x.item.title||"").includes(field));
     if(!items.length)return;
     const learned=items.filter(x=>done.has(x.id)).length;
     const p=Math.round(learned/items.length*100);
     const row=document.createElement("div");
     row.className="progress-bar-row";
     row.innerHTML=`<div class="progress-label"><span>${field}</span><strong>${p}%</strong></div><div class="bar"><span style="width:${p}%"></span></div><div class="progress-small">${learned} / ${items.length}</div>`;
     fieldBox.appendChild(row);
   });
 }
}

function renderArticles(filter=""){
 const law=DATA[currentLaw];document.getElementById("lawTitle").textContent=law.name;const list=document.getElementById("articleList");list.innerHTML="";
 law.articles.forEach((a,i)=>{const hay=law.name+a.title+a.body+a.points.join("")+(a.traps||[]).join("")+(a.terms||[]).join("");if(filter&&!hay.includes(filter))return;const row=document.createElement("div");row.className="article-row";row.innerHTML=`<span class="article-title">${a.title}</span><span class="stars">${rankBadge(a.importance||a.stars)} ›</span>${actionButtons(currentLaw,i)}`;row.addEventListener("click",()=>{
  if(a.redirect){openDetail(a.redirect.law,a.redirect.article)}
  else{openDetail(currentLaw,i)}
});list.appendChild(row);});
 bindActionButtons(list);
 const cta=document.getElementById('fieldQuizCta');
 if(cta){cta.innerHTML=quizCtaHtml(currentLaw,null,'問題');}
}
function renderFilteredList(title,predicate){const box=document.getElementById("searchResults");box.innerHTML="";const h=document.querySelector("#searchScreen h2");if(h)h.textContent=title;const results=flat.filter(predicate);if(!results.length){box.innerHTML='<div class="empty">該当する項目はありません。</div>';}else{const list=document.createElement("div");list.className="cat-list";results.forEach(x=>{const row=document.createElement("div");row.className="article-row";row.innerHTML=`<span class="article-title">${DATA[x.law].name}　${x.item.title}</span><span class="stars">${rankBadge(x.item.importance||x.item.stars)} ›</span>${actionButtons(x.law,x.article)}`;row.addEventListener("click",()=>{
  if(x.item.redirect){openDetail(x.item.redirect.law,x.item.redirect.article)}
  else{openDetail(x.law,x.article)}
});list.appendChild(row)});box.appendChild(list);bindActionButtons(box);}show("searchScreen");}
function openDetail(li,ai){
 detailReturnScreen=currentScreen;
 currentLaw=li;currentArticle=ai;const law=DATA[li],a=law.articles[ai];document.getElementById("detailLaw").textContent=law.name+"　"+(a.category||"");document.getElementById("detailTitle").textContent=a.title;document.getElementById("detailStars").innerHTML=rankBadge(a.importance||a.stars);const review=a.reviewStatus?`<aside class="source-note"><strong>照合状態：${escapeHtml(a.reviewStatus)}</strong><br><a href="${escapeHtml(a.reviewUrl)}" target="_blank" rel="noopener">${escapeHtml(a.reviewSource)}</a><br>基準日：${escapeHtml(a.reviewDate)}<br>${escapeHtml(a.reviewNote||'')}</aside>`:'';const legacy=(a.legacyFindings||[]).length?`<aside class="source-note"><strong>旧法令・分類・数値の確認</strong><ul>${a.legacyFindings.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></aside>`:'';document.getElementById("detailBody").innerHTML=bodyHtml(a.body,a.terms||[])+review+legacy;
 let ul=document.getElementById("detailPoints");ul.innerHTML="";(a.points||[]).forEach(p=>{const item=document.createElement("li");item.innerHTML=highlight(p,a.terms||[]);ul.appendChild(item)});
 ul=document.getElementById("detailTraps");ul.innerHTML="";(a.traps||[]).forEach(p=>{const item=document.createElement("li");item.innerHTML=highlight(p,a.terms||[]);ul.appendChild(item)});
 const rel=document.getElementById("relatedLinks");rel.innerHTML="";(a.related||[]).forEach(r=>{
 const b=document.createElement("button");
 b.textContent=r.label||DATA[r.law].name;
 b.addEventListener("click",()=>{
   if(Number.isInteger(r.article)){
     openDetail(r.law,r.article);
   }else{
     currentLaw=r.law;
     document.getElementById("detail").classList.add("hidden");
     renderArticles();
     show("lawScreen");
   }
 });
 rel.appendChild(b)
}); if(!(a.related||[]).length)rel.textContent="関連法令なし";
 const qcta=document.getElementById('detailQuizCta');
 if(qcta){qcta.innerHTML=quizCtaHtml(li,a,'問題');}
 applyMode();document.getElementById("detail").classList.remove("hidden");updateMaterialNav();
}
document.getElementById("prevBtn").addEventListener("click",()=>{const idx=flat.findIndex(x=>x.law===currentLaw&&x.article===currentArticle);if(idx>0){const n=flat[idx-1];openDetail(n.law,n.article)}});
document.getElementById("nextBtn").addEventListener("click",()=>{const idx=flat.findIndex(x=>x.law===currentLaw&&x.article===currentArticle);if(idx<flat.length-1){const n=flat[idx+1];openDetail(n.law,n.article)}});
document.getElementById("searchBtn").addEventListener("click",()=>document.getElementById("searchBar").classList.toggle("open"));
function renderSearch(q){const box=document.getElementById("searchResults");box.innerHTML="";const h=document.querySelector("#searchScreen h2");if(h)h.textContent="検索結果";if(!q){show("home");return}const groups={};flat.filter(x=>(DATA[x.law].name+x.item.title+x.item.body+x.item.points.join("")+(x.item.traps||[]).join("")+(x.item.terms||[]).join("")).includes(q)).forEach(x=>{const cat=x.item.category||"その他";(groups[cat]||(groups[cat]=[])).push(x)});Object.keys(groups).forEach(cat=>{const h=document.createElement("h3");h.className="cat-title";h.textContent=cat+"（"+groups[cat].length+"）";box.appendChild(h);const list=document.createElement("div");list.className="cat-list";groups[cat].forEach(x=>{const row=document.createElement("div");row.className="article-row";row.innerHTML=`<span class="article-title">${DATA[x.law].name}　${x.item.title}</span><span class="stars">${rankBadge(x.item.importance||x.item.stars)} ›</span>${actionButtons(x.law,x.article)}`;row.addEventListener("click",()=>openDetail(x.law,x.article));list.appendChild(row)});box.appendChild(list);bindActionButtons(list)});show("searchScreen");}
document.getElementById("searchInput").addEventListener("input",e=>renderSearch(e.target.value.trim()));

if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
renderHome();
document.getElementById('materialCountDescription').textContent=flat.length+'項目';updateMaterialNav();
document.addEventListener('DOMContentLoaded',updateMaterialNav);
openFromHash();
