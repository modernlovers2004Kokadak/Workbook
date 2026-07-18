const $=s=>document.querySelector(s),app=$('#app');
const PREFIX='riyo_v05_';
function storageGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
function storageSet(key,value){try{localStorage.setItem(key,value);return true}catch(e){return false}}
function storageRemove(key){try{localStorage.removeItem(key);return true}catch(e){return false}}
function safeJson(key,fallback,validate){const raw=storageGet(key);if(raw===null)return fallback;try{const value=JSON.parse(raw);return !validate||validate(value)?value:fallback}catch(e){return fallback}}
const store={get:k=>safeJson(PREFIX+k,null,v=>v===null||(v&&typeof v==='object'&&!Array.isArray(v))),set:(k,v)=>storageSet(PREFIX+k,JSON.stringify(v))};
const localDateString=(d=new Date())=>{const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`};
const today=()=>localDateString();
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return localDateString(d)};
const jpNo=['1','2','3','4'];
let state={page:'home',session:[],idx:0,selected:null,answered:false,view:null,filter:'all',themeFilter:null,search:'',mockEnd:null,timer:null,mockRecorded:false,mockResults:[],mockTimedOut:false};
let mockTimerHandle=null;
const HOME_MODE=new URLSearchParams(location.search).get('mode')||'all';
function baseProg(){return{done:{},answerStats:{},history:[],mistakes:{},themeStats:{},catStats:{},daily:{},dailyStems:{},recentIds:[],recentThemes:[],mockStats:{pass:0,fail:0,history:[]},materialOk:{},settings:{todayCount:21,recentBlock:30,masterNeed:2,correctCooldown:14,masterCooldown:30,easyCooldown:60,maxKnownToday:2}}}
const prog=()=>({...baseProg(),...(store.get('prog')||{})});
const save=p=>store.set('prog',p);
const pct=(n,d)=>d?Math.round(n/d*100):0;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cat=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[0];
const sub=id=>SUBJECTS.find(s=>s.id===id)||SUBJECTS[0];
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const take=(a,n)=>shuffle(a).slice(0,n);

const GROUP_RULE={microbe:'disinfection',infection_control:'disinfection',environment:'public_health',health_promo:'public_health',hair:'skin',anatomy:'skin',nutrition:'skin',disease:'skin',surfactant:'cosmetics',perm:'cosmetics',cosmetic_safety:'cosmetics',ph:'cosmetics',color:'cosmetics',style:'history',design:'history',aesthetics:'history',customer:'shop',accounting:'shop',labor:'shop',complaint:'shop',store:'shop',commerce:'shop',shampoo:'cut',setting:'cut',tools:'cut'};
const groupId=q=>GROUP_RULE[q.category]||q.category;
const OFFICIAL_TRACKS=[
 {id:'law_management',name:'関係法規・制度及び運営管理',quota:10},
 {id:'public_environment',name:'公衆衛生・環境衛生',quota:5},
 {id:'infectious_disease',name:'感染症',quota:5},
 {id:'hygiene_technique',name:'衛生管理技術',quota:5},
 {id:'anatomy_function',name:'人体の構造及び機能',quota:5},
 {id:'dermatology',name:'皮膚科学',quota:5},
 {id:'cosmetic_chemistry',name:'香粧品化学',quota:5},
 {id:'culture_theory',name:'文化論',quota:5},
 {id:'barber_theory',name:'理容技術理論',quota:10}
];
function officialTrackId(q){
 const c=q&&q.category,s=q&&q.subject;
 if(s==='management'||(s==='law'&&!['infection','community','health_promotion_act'].includes(c)))return 'law_management';
 if(c==='community'||c==='health_promotion_act'||['environment','health_promo','public_health'].includes(c))return 'public_environment';
 if(c==='infection')return 'infectious_disease';
 if(s==='hygiene'||['microbe','infection_control','disinfection'].includes(c))return 'hygiene_technique';
 if(s==='health'&&Number(q.id)>=245&&Number(q.id)<=269)return 'anatomy_function';
 if(s==='health')return 'dermatology';
 if(s==='chem')return 'cosmetic_chemistry';
 if(s==='culture')return 'culture_theory';
 if(s==='theory')return 'barber_theory';
 return 'law_management';
}
const qsCat=id=>QUESTIONS.filter(q=>groupId(q)===id);
function startCatSession(id){const p=prog(),arr=qsCat(id).filter(q=>!isMastered(p,q));if(arr.length)startSession(arr,'question');else alert('未克服の問題はありません。')}
const qById=id=>QUESTIONS.find(q=>q.id===Number(id));
const memGroups=new Set(['infection','disinfection','public_health','skin','cosmetics','cut','shaving']);
const memoryTarget=q=>memGroups.has(groupId(q))||['hygiene','health','chem','theory'].includes(q.subject);
function evidenceStatus(q){const labels={A:'公式資料確認済み',official_confirmed:'公式正答確認済み',B:'公開資料で根拠確認済み',C:'公的根拠の個別確認中'},source=q&&q.evidenceUrl?`<a href="${esc(q.evidenceUrl)}" target="_blank" rel="noopener">${esc(q.evidenceSource||'根拠資料')}</a>`:'';return `<div class="evidence-status"><span>根拠状態：${labels[q&&q.evidenceLevel]||'確認情報なし'}</span><span>問題番号 ${esc(q&&q.id)}</span><span>公開資料基準日 ${esc(q&&q.evidenceDate||'2026-07-16')}</span>${source}</div>`;}

const MATERIAL_LAW_BY_GROUP={
  barber_act:3, rules:4, order:5, visit:6, infection:7, community:8, consumer:10,
  disinfection:12, public_health:12, skin:12, cosmetics:12, history:12, shop:12, cut:12, shaving:12
};
function materialUrl(q){
  const gid=groupId(q);
  const law=MATERIAL_LAW_BY_GROUP[gid];
  return Number.isInteger(law)?`../教材/index.html#law=${law}`:'../教材/index.html';
}
function materialCta(q){return `<a class="material-confirm-link" href="${materialUrl(q)}">📖 教材</a>`;}
function initFromHash(){
  if(restoreMockProgress())return;
  const hash=decodeURIComponent(location.hash||'');
  const direct=hash.match(/question=(\d+)/);
  if(direct){
    const q=qById(direct[1]);
    if(q){startSession([q],'question');return;}
  }
  const m=hash.match(/cat=([^&]+)/);
  if(m){
    const id=m[1];
    const p=prog(),arr=qsCat(id).filter(q=>!isMastered(p,q));
    if(arr.length){startSession(arr,'question');return;}
  }
  if(hash.includes('mistakes')){route('mistakes');return;}
  if(hash.includes('review')){route('mistakes');return;}
  if(hash.includes('mastered')){route('mastered');return;}
  if(hash.includes('mock')){startSession(mockSession(),'question',true);return;}
  render();
}


const POOLS={
 authority:['保健所長','保健所設置市長','都道府県知事','厚生労働大臣','指定試験機関','管理理容師','保健所','開設者'],
 deadline:['あらかじめ','速やかに','直ちに','10日以内','30日以内','7日以内','毎年7月31日まで','検査確認後'],
 role:['理容師','管理理容師','開設者','従業者','利用者','指定試験機関','都道府県知事','保健所長'],
 infection:['一類感染症','二類感染症','三類感染症','四類感染症','五類感染症','指定感染症','新感染症','新型インフルエンザ等感染症'],
 disinfection:['煮沸消毒','蒸気消毒','エタノール消毒','次亜塩素酸ナトリウム消毒','紫外線消毒','逆性石けん','流水洗浄','乾燥保管'],
 health:['表皮','真皮','皮下組織','毛包','皮脂腺','汗腺','角質層','メラニン'],
 chem:['界面活性剤','酸化染毛剤','還元剤','酸化剤','アルカリ剤','酸性染毛料','香料','防腐剤'],
 culture:['バロック','ロココ','ルネサンス','古代エジプト','明治時代','大正時代','昭和時代','現代'],
 manage:['固定費','変動費','損益分岐点','売上高','粗利益','労働時間','顧客満足','情報提供'],
 theory:['ブラントカット','レイヤーカット','グラデーションカット','セニング','シェービング','シャンプーイング','セット','クリッパー']
};
const TEMPLATES={
 barber_act:[['理容所の開設届について、提出先として最も適切なものはどれか。','都道府県知事','authority','開設届は開設者が都道府県知事に届け出る。保健所長や管理理容師と混同しない。','開設者・届出先・時期を分けて覚える'],['理容所の開設者が届出事項を変更した場合の届出時期として最も適切なものはどれか。','速やかに','deadline','変更・廃止の届出は、あらかじめではなく速やかに行う。','開設はあらかじめ、変更・廃止は速やかに'],['理容師が2人以上いる理容所で置かなければならない者はどれか。','管理理容師','role','理容師が2人以上従事する理容所では管理理容師を置く必要がある。','2人以上なら管理理容師']],
 order:[['理容師法施行令で、免許・試験事務の主体として最も適切なものはどれか。','厚生労働大臣','authority','免許・試験に関する主体は店舗の届出先と分けて整理する。','店舗手続と免許手続を混同しない'],['理容師試験の実施事務に関して最も関係が深いものはどれか。','指定試験機関','authority','試験事務では指定試験機関が問われやすい。店舗の開設届とは別に整理する。','試験は指定試験機関']],
 rules:[['開設届に添付する書類として、管理理容師に関係するものを求められる場合があるのはどれか。','管理理容師','role','理容師が2人以上従事する理容所では管理理容師に関する書類が重要になる。','添付書類は従業者数と結びつける'],['開設届の時期として最も適切なものはどれか。','あらかじめ','deadline','開設後ではなく、開設しようとするときにあらかじめ届け出る。','開設前に届出']],
 infection:[['結核の分類として最も適切なものはどれか。','二類感染症','infection','結核は二類感染症。コレラなど三類との混同に注意する。','結核は二類'],['コレラの分類として最も適切なものはどれか。','三類感染症','infection','コレラは三類感染症。結核・ジフテリアなど二類との混同に注意する。','コレラは三類'],['エボラ出血熱の分類として最も適切なものはどれか。','一類感染症','infection','エボラ出血熱は一類感染症。重篤な出血熱としてまとめて覚える。','エボラは一類']],
 community:[['地域保健の中核的施設として最も適切なものはどれか。','保健所','authority','地域保健では保健所と市町村保健センターの役割を分ける。','地域保健は施設の役割を区別'],['地域保健行政で都道府県や保健所設置市と関係が深いものはどれか。','保健所設置市長','authority','保健所設置市という語は理容所手続の提出先とも混同しやすい。','保健所設置市に注意']],
 consumer:[['消費者基本法で中心に置かれる考え方として最も適切なものはどれか。','消費者の権利','manage','消費者基本法は事業者都合ではなく消費者の権利・利益を中心に考える。','消費者の権利が軸'],['事業者が消費者に対して特に重視すべきものはどれか。','情報提供','manage','消費者保護では適切な情報提供と安全確保が重要。','説明不足はトラブルの原因']],
 visit:[['出張理容で最も注意すべき判断として適切なものはどれか。','衛生管理','manage','出張理容では場所が変わっても衛生管理を省略できない。','出張でも衛生管理は同じ'],['出張理容で器具を扱う際、最も重視すべきものはどれか。','消毒済み器具','disinfection','出張時は消毒済み器具と使用済み器具の区別が重要。','清潔・不潔を分ける']],
 disinfection:[['血液が付着したおそれのある器具に対して、特に重視すべき消毒法はどれか。','次亜塩素酸ナトリウム消毒','disinfection','血液付着のおそれがある器具では、通常より強い消毒を選ぶ。','血液付着は強めの消毒'],['消毒前にまず行うべき基本操作として最も適切なものはどれか。','流水洗浄','disinfection','汚れが残ると消毒効果が下がるため、洗浄と消毒を分けて考える。','洗浄してから消毒']],
 public_health:[['公衆衛生で重視される対象として最も適切なものはどれか。','集団の健康','manage','公衆衛生は個人だけでなく集団全体の健康を守る考え方。','個人衛生と公衆衛生を区別'],['感染予防で、病原体が広がる経路を断つ考え方として最も適切なものはどれか。','感染経路対策','disinfection','感染源・感染経路・感受性者の3つを分けて考える。','感染の鎖を切る']],
 skin:[['皮膚の最外層として最も適切なものはどれか。','角質層','health','角質層は外界に接する最外層で、バリア機能と関係する。','最外層は角質層'],['毛を作る部分として最も関係が深いものはどれか。','毛包','health','毛髪は毛包・毛乳頭などの構造と関連して理解する。','毛は毛包で考える']],
 cosmetics:[['洗浄剤で汚れを落とす働きに最も関係が深いものはどれか。','界面活性剤','chem','界面活性剤は水と油をなじませ、洗浄作用に関わる。','洗浄は界面活性剤'],['パーマ第1剤で毛髪の結合を切る働きに関係が深いものはどれか。','還元剤','chem','第1剤は還元、第2剤は酸化。ここを入れ替えた選択肢に注意する。','1剤は還元、2剤は酸化']],
 history:[['理容文化史で時代・様式を問う問題への対応として最も適切なものはどれか。','時代順','culture','文化論は名称だけでなく時代順と特徴の組合せで問われやすい。','文化論は時代順で整理'],['髪型や服飾の変化を理解する際、最も混同しやすい観点はどれか。','様式名','culture','様式名・時代・地域を入れ替えた選択肢に注意する。','様式名と時代をセットで覚える']],
 shop:[['売上から変動費を差し引いて考える利益として最も適切なものはどれか。','粗利益','manage','店舗管理では売上・費用・利益の違いを正確に区別する。','売上と利益を混同しない'],['経営で固定費と変動費を分けて考える指標として最も関係が深いものはどれか。','損益分岐点','manage','損益分岐点は売上と費用の関係を見る重要指標。','固定費・変動費・売上']],
 cut:[['毛先をそろえて重さを残しやすいカットとして最も適切なものはどれか。','ブラントカット','theory','ブラントカットは切り口がそろいやすく、重さを表現しやすい。','重さはブラント'],['段差をつけて軽さや動きを出す技法として最も適切なものはどれか。','レイヤーカット','theory','レイヤーは段差によって軽さや動きを作る。','軽さはレイヤー']],
 shaving:[['シェービングで皮膚を傷つけないために最も重視すべきものはどれか。','皮膚の緊張','theory','刃を当てる角度・皮膚の緊張・毛流れを合わせて考える。','皮膚を張って刃を安定'],['シェービングで毛の生えている方向を確認する目的として最も適切なものはどれか。','毛流れの把握','theory','毛流れを無視すると皮膚刺激や剃り残しにつながる。','毛流れを見て剃る']]
};
function templateIndex(q){const b=TEMPLATES[groupId(q)]||TEMPLATES[q.category]||TEMPLATES.barber_act;return (q.id-1)%b.length}
function themeKey(q){return q.themeId||`${groupId(q)}:${templateIndex(q)}`}
function base(q){
  if(q&&q.q&&Array.isArray(q.choices)){
    const correct=q.choices[q.answer]||q.choices[0];
    return{qid:q.id,question:q.q,correct,pool:q.choices,exp:q.exp||'',point:q.point||'',gid:groupId(q),theme:themeKey(q),tag:q.themeId||q.category,subject:q.subject,importance:q.importance||3}
  }
  const gid=groupId(q),bank=TEMPLATES[gid]||TEMPLATES[q.category]||TEMPLATES.barber_act,t=bank[templateIndex(q)];
  return{qid:q.id,question:t[0],correct:t[1],pool:POOLS[t[2]]||POOLS.authority,exp:t[3],point:t[4],gid,theme:themeKey(q),tag:t[2],subject:q.subject,importance:q.importance||3}
}
function qStem(q){try{return q.stemId||String(base(q).question||q.q||'').replace(/\s+/g,'').trim()}catch(e){return String((q&&q.q)||'').replace(/\s+/g,'').trim()}}
function choices(q){
  if(q&&q.q&&Array.isArray(q.choices)){
    const answer=q.choices[q.answer]||q.choices[0];
    return shuffle(q.choices.map(x=>({text:x,correct:x===answer})))
  }
  const b=base(q),wrong=take(b.pool.filter(x=>x!==b.correct),3);return shuffle([b.correct,...wrong]).map(x=>({text:x,correct:x===b.correct}))
}
function currentQ(){const raw=state.session[state.idx]||QUESTIONS[0];if(!state.view||state.view.id!==raw.id||state.view.idx!==state.idx){state.view={id:raw.id,idx:state.idx,choices:choices(raw)}}return raw}
function updateStat(obj,key,ok){obj[key]=obj[key]||{try:0,ok:0};obj[key].try++; if(ok)obj[key].ok++}
function dayDiffFrom(dateStr){if(!dateStr)return 9999;const a=new Date(dateStr+'T00:00:00'),b=new Date(today()+'T00:00:00');return Math.floor((b-a)/86400000)}
function importanceLabel(q){const n=Number(q.importance||3);return n>=5?'most':n>=4?'important':'frequent'}
function statFor(p,q){return (p.answerStats&&p.answerStats[q.id])||{try:0,ok:0,streak:0,mastered:false,lastTry:null,lastOk:null,lastNg:null}}
function isMastered(p,q){const s=statFor(p,q);return !!(s&&s.ok>=5)}
function masteredList(p){return Object.entries(p.answerStats||{}).filter(([id,s])=>s&&s.ok>=5).map(([id])=>qById(id)).filter(Boolean)}
function record(q,ok){const p=prog(),b=base(q),day=today();p.done[q.id]=true;p.answerStats=p.answerStats||{};const s=p.answerStats[q.id]||{id:q.id,try:0,ok:0,streak:0,mastered:false,lastTry:null,lastOk:null,lastNg:null};
 s.try++;s.lastTry=day;if(ok){s.ok++;s.streak=(s.streak||0)+1;s.lastOk=day;if(s.streak>=2)s.mastered=true;if(s.ok>=5)s.conquered=true}else{s.streak=0;s.mastered=false;s.lastNg=day}p.answerStats[q.id]=s;
 p.history.push({id:q.id,ok,day,cat:b.gid,theme:b.theme,tag:b.tag});p.recentIds=[...(p.recentIds||[]),q.id].slice(-100);p.recentThemes=[...(p.recentThemes||[]),b.theme].slice(-100);p.dailyStems=p.dailyStems||{};p.dailyStems[day]=Array.from(new Set([...(p.dailyStems[day]||[]),qStem(q)])).slice(-300);p.daily[day]=p.daily[day]||{try:0,ok:0};p.daily[day].try++;if(ok)p.daily[day].ok++;updateStat(p.catStats,b.gid,ok);updateStat(p.themeStats,b.theme,ok);
 if(!ok){const m=p.mistakes[q.id]||{id:q.id,wrongCount:0,correctCount:0,streak:0,firstMiss:day,mastered:false,history:[]};m.wrongCount++;m.streak=0;m.mastered=false;m.lastMiss=day;m.nextReview=day;m.lastAnswer=state.view.choices[state.selected]?.text||'';m.correct=state.view.choices.find(c=>c.correct)?.text||b.correct;m.history.push({day,ok:false});p.mistakes[q.id]=m}
 else if(p.mistakes[q.id]){delete p.mistakes[q.id]}
 save(p)}
function smartSession(count=21){
 const p=prog(),used=new Set(),usedThemes=new Set(),usedStems=new Set(),
       recent=new Set((p.recentIds||[]).slice(-(p.settings?.recentBlock||30))),
       recentThemes=new Set((p.recentThemes||[]).slice(-30)),out=[];let lastTheme=null;
 const settings={correctCooldown:14,masterCooldown:30,easyCooldown:60,maxKnownToday:2,...(p.settings||{})};
 const todaysStems=new Set(((p.dailyStems||{})[today()]||[]));
 const due=Object.values(p.mistakes||{}).filter(m=>!m.mastered&&m.nextReview&&m.nextReview<=today()).map(m=>qById(m.id)).filter(Boolean);
 const wrong=Object.values(p.mistakes||{}).filter(m=>!m.mastered).sort((a,b)=>(b.wrongCount-a.wrongCount)).map(m=>qById(m.id)).filter(Boolean);
 const fresh=QUESTIONS.filter(q=>!p.done[q.id]&&!isMastered(p,q));
 const oneCorrect=QUESTIONS.filter(q=>{const s=statFor(p,q);return !isMastered(p,q)&&s.ok>0&&!s.mastered&&dayDiffFrom(s.lastOk)>=settings.correctCooldown});
 const reviewImportant=QUESTIONS.filter(q=>{const s=statFor(p,q);return !isMastered(p,q)&&s.mastered&&importanceLabel(q)==='most'&&dayDiffFrom(s.lastOk)>=settings.masterCooldown});
 const reviewEasy=QUESTIONS.filter(q=>{const s=statFor(p,q);return !isMastered(p,q)&&s.mastered&&importanceLabel(q)!=='most'&&dayDiffFrom(s.lastOk)>=settings.easyCooldown});
 const knownCount=()=>out.filter(q=>p.done[q.id]).length;
 function eligible(q,allowKnown=false,relaxStem=false){
   if(!q||used.has(q.id)||isMastered(p,q))return false;
   const stem=qStem(q);
   if(!relaxStem&&(usedStems.has(stem)||todaysStems.has(stem)))return false;
   const s=statFor(p,q);
   if(recent.has(q.id))return false;
   if(s.mastered&&importanceLabel(q)!=='most'&&dayDiffFrom(s.lastOk)<settings.easyCooldown)return false;
   if(s.mastered&&importanceLabel(q)==='most'&&dayDiffFrom(s.lastOk)<settings.masterCooldown)return false;
   if(s.ok>0&&!s.mastered&&dayDiffFrom(s.lastOk)<settings.correctCooldown)return false;
   if(p.done[q.id]&&!allowKnown&&knownCount()>=settings.maxKnownToday)return false;
   return true
 }
 function mark(q){out.push(q);used.add(q.id);const th=themeKey(q);lastTheme=th;usedThemes.add(th);usedStems.add(qStem(q))}
 function pickFrom(arr,allowKnown=false,relaxStem=false){
   let best=null,bs=-9999;
   for(const q of shuffle(arr)){
     if(!eligible(q,allowKnown,relaxStem))continue;
     const th=themeKey(q);let sc=0;const s=statFor(p,q);
     if(!p.done[q.id])sc+=90;
     if((p.mistakes||{})[q.id]&&!((p.mistakes||{})[q.id].mastered))sc+=65;
     if(s.ok>0)sc-=50;
     if(s.mastered)sc-=100;
     if(importanceLabel(q)==='frequent'&&s.ok>0)sc-=35;
     if(th===lastTheme)sc-=100;
     if(usedThemes.has(th))sc-=40;
     if(recentThemes.has(th))sc-=20;
     sc+=(q.importance||3)*3;
     sc+=Math.random()*5;
     const catCount=out.filter(x=>groupId(x)===groupId(q)).length;sc-=catCount*12;
     if(sc>bs){bs=sc;best=q}
   }
   return best
 }
 function fill(arr,limit,allowKnown=false){
   let guard=0;while(out.length<count&&out.filter(x=>arr.includes(x)).length<limit&&guard++<500){let q=pickFrom(arr,allowKnown,false);if(!q)break;mark(q)}
 }
 fill(due,Math.ceil(count*.25),true);
 fill(wrong,Math.ceil(count*.20),true);
 fill(fresh,Math.ceil(count*.65),false);
 fill(oneCorrect,Math.min(settings.maxKnownToday,Math.ceil(count*.08)),true);
 fill(reviewImportant,Math.min(settings.maxKnownToday,Math.ceil(count*.06)),true);
 fill(reviewEasy,1,true);
 while(out.length<count){let q=pickFrom(fresh,false,false)||pickFrom(QUESTIONS,true,false);if(!q)break;mark(q)}
 return out
}
function mockSession(){let out=[];for(const t of OFFICIAL_TRACKS){const pool=QUESTIONS.filter(q=>officialTrackId(q)===t.id);out.push(...take(pool,t.quota))}return shuffle(out)}
function saveMockProgress(){if(!state.mockEnd)return;const nextIndex=state.idx+(state.answered?1:0);store.set('mockProgress',{sessionIds:state.session.map(q=>q.id),idx:nextIndex,results:state.mockResults||[],mockEnd:state.mockEnd,completed:nextIndex>=state.session.length});}
function clearMockProgress(){storageRemove(PREFIX+'mockProgress')}
function restoreMockProgress(){const saved=store.get('mockProgress');if(!saved||!Array.isArray(saved.sessionIds)||!Array.isArray(saved.results))return false;const session=saved.sessionIds.map(qById).filter(Boolean);if(session.length!==55||saved.results.length>55){clearMockProgress();return false}const idx=Math.min(Number(saved.idx)||0,session.length-1),end=Number(saved.mockEnd)||Date.now()+100*60*1000;state={...state,page:saved.completed||end<=Date.now()?'score':'question',session,idx,selected:null,answered:false,view:null,mockEnd:end,mockRecorded:false,mockResults:saved.results,mockTimedOut:end<=Date.now()};render();return true}
function startOrResumeMock(){if(state.mockEnd&&state.session.length===55){state.idx=Math.min(state.mockResults.length,state.session.length-1);state.page=state.mockResults.length>=55?'score':'question';state.answered=false;state.selected=null;state.view=null;render();return}if(!restoreMockProgress())startSession(mockSession(),'question',true)}
function startSession(arr,page='question',mock=false){if(!arr||!arr.length){alert('出題できる問題がありません。');route('home');return}state={...state,page,session:arr,idx:0,selected:null,answered:false,view:null,mockEnd:mock?Date.now()+100*60*1000:null,mockRecorded:false,mockResults:[],mockTimedOut:false};if(mock)saveMockProgress();render();}
function mockRemaining(){return state.mockEnd?Math.max(0,Math.ceil((state.mockEnd-Date.now())/1000)):0}
function mockTimerHtml(){if(!state.mockEnd||state.page!=='question')return'';const sec=mockRemaining(),cls=sec<=60?' danger':sec<=600?' caution':'';return `<div class="mock-timer${cls}" role="timer">残り ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</div>`}
function armMockTimer(){clearInterval(mockTimerHandle);if(!state.mockEnd||state.page!=='question')return;mockTimerHandle=setInterval(()=>{const sec=mockRemaining(),el=document.querySelector('.mock-timer');if(sec<=0){clearInterval(mockTimerHandle);finishMockByTimeout();return}if(el){el.textContent=`残り ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;el.className=`mock-timer${sec<=60?' danger':sec<=600?' caution':''}`}},1000)}
function finishMockByTimeout(){if(state.mockTimedOut||!state.mockEnd||state.page!=='question')return;state.mockTimedOut=true;saveMockProgress();alert('制限時間が終了しました');state.page='score';render()}
function route(page,extra={}){state={...state,page,...extra,selected:null,answered:false,view:null};render()}
const circled=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
function rankName(q){const v=(q.importance||3);return v>=5?'SS':v>=4?'S':v<=2?'B':'A'}
function rankCounts(qs){const c={SS:0,S:0,A:0,B:0};qs.forEach(q=>c[rankName(q)]++);return c}
function rankText(qs){const r=rankCounts(qs);return `<span class="rank-lines"><span><i class="rank-dot dot-red"></i>最重要　${r.SS}問</span><span><i class="rank-dot dot-pink"></i>重要　${r.S}問</span><span><i class="rank-dot dot-yellow"></i>頻出　${r.A}問</span><span><i class="rank-dot dot-gray"></i>基本　${r.B}問</span></span>`}

function importanceInfo(q){
  const v=typeof q==='number'?q:(q&&q.importance)||0;
  if(v>=5)return {cls:'red',label:'最重要',card:'imp-red'};
  if(v===4)return {cls:'orange',label:'重要',card:'imp-orange'};
  return {cls:'green',label:'頻出',card:'imp-green'};
}
function importanceBadge(q){
  const r=importanceInfo(q);
  return `<span class="importance-badge"><i class="rank-dot dot-${r.cls}"></i>${r.label}</span>`;
}
function importanceClass(q){return importanceInfo(q).card;}
function header(title='理容師国家試験 問題集'){const searchable=['home','mistakes','mastered','search'].includes(state.page);return `<header class="top"><span class="top-spacer"></span><h1>${title}</h1>${searchable?`<button onclick="route('search')" aria-label="検索">⌕</button>`:`<span class="top-spacer"></span>`}</header>${mockTimerHtml()}`}
function bottom(active){return ``}
function solvedIds(p){return new Set(Object.entries(p.answerStats||{}).filter(([id,s])=>(s&&s.ok>0)).map(([id])=>Number(id)))}
function solvedCountByCat(p,catId){const solved=solvedIds(p);return qsCat(catId).filter(q=>solved.has(q.id)).length}
function categoryProgress(c,i,p){const total=qsCat(c.id).length,done=solvedCountByCat(p,c.id),rate=pct(done,total);return `<div class="cat-progress" aria-label="${c.name} 正答達成率 ${rate}%"><div class="cat-progress-line"><em>正答達成率 ${rate}%　${done} / ${total}問 正答済み</em></div><div class="cat-progress-track"><i style="width:${rate}%"></i></div></div>`}
function needReviewList(p){return Object.values(p.mistakes||{}).filter(m=>!isMastered(p,qById(m.id)||{})).sort((a,b)=>(b.wrongCount-a.wrongCount)||String(b.lastMiss||'').localeCompare(String(a.lastMiss||'')))}
function mockStatsText(p){
 const st={pass:0,fail:0,...((p&&p.mockStats)||{})};
 return `合格${st.pass||0}回　不合格${st.fail||0}回`;
}
function mockEntryLabel(){const pending=store.get('mockProgress');return pending&&!pending.completed?'模試を続きから再開':'模試'}
function recordMockResult(pass){
 if(state.mockRecorded)return;
 const p=prog();
 p.mockStats={pass:0,fail:0,history:[],...(p.mockStats||{})};
 if(pass)p.mockStats.pass++;else p.mockStats.fail++;
 const evaluated=evaluateMock(state.mockResults||[]);
 p.mockStats.history=[...(p.mockStats.history||[]),{day:today(),pass,score:evaluated.ok,total:evaluated.total,tracks:evaluated.stats.map(x=>({id:x.id,ok:x.ok,total:x.total}))}].slice(-100);
 save(p);
 state.mockRecorded=true;
 clearMockProgress();
}
 function home(){const p=prog(),reviewCount=needReviewList(p).length;const todayArea=HOME_MODE==='category'?'':`<div class="study-hero"><div class="study-title"><span class="study-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 16c8-4 15-3 20 2v32c-5-5-12-6-20-2V16z"/><path d="M52 16c-8-4-15-3-20 2v32c5-5 12-6 20-2V16z"/></svg></span><div><h2>今日の学習</h2><i></i></div></div><p class="study-sub">最重要レベル4択・21問・分野とテーマを自動調整</p><button class="start-circle" onclick="startSession(smartSession(21),'question')"><span>▶</span><small>開始する</small></button></div><div class="summary-panel v292-summary"><button class="summary-item sm-orange" onclick="route('mistakes')"><span class="summary-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24a4 4 0 0 1 4 4v42L32 46 16 56V14a4 4 0 0 1 4-4z"/><path d="M34 18l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" opacity=".35"/></svg></span><span>🔖 要復習</span><em>${reviewCount}問</em></button><button class="summary-item sm-blue" onclick="startOrResumeMock()"><span class="summary-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 12h20v10a10 10 0 0 1-20 0V12z" fill="none" stroke="currentColor" stroke-width="6"/><path d="M22 18H12v5a12 12 0 0 0 12 12M42 18h10v5a12 12 0 0 1-12 12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M32 32v12M24 52h16M20 56h24" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M32 17l2 4 4 .6-3 3 .7 4.4-3.7-2-3.7 2 .7-4.4-3-3 4-.6 2-4z"/></svg></span><span>模試</span><em>${mockStatsText(p)}</em></button></div>`;const categoryArea=HOME_MODE==='today'?'':`<section class="problem-category-list">${CATEGORIES.map((c,i)=>catRow(c,i,p)).join('')}</section>`;return `<main>${header()}<section class="content today-page">${todayArea}${categoryArea}</section>${bottom('home')}</main>`}
function catRow(c,i,p){let qs=qsCat(c.id),clr=sub(c.subject).color;return `<button class="law law-with-progress" onclick="startCatSession('${c.id}')"><span class="num" style="background:${clr}">${i+1}</span><span class="grow"><span>${c.name}</span><small>${rankText(qs)}</small>${categoryProgress(c,i,p)}</span><span class="imp">${qs.length}問 ›</span></button>`}
function progressCard(p){return ``}
function lastNDays(n){return Array.from({length:n},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return localDateString(d)})}
function masterRate(p){const m=Object.values(p.mistakes||{});return m.length?pct(m.filter(x=>x.mastered).length,m.length):0}
function dueMistakes(p){return Object.values(p.mistakes||{}).filter(m=>!m.mastered&&m.nextReview&&m.nextReview<=today())}
function startDue(){const p=prog(),arr=needReviewList(p).map(m=>qById(m.id)).filter(Boolean).filter(q=>!isMastered(p,q));startSession(arr.length?arr:smartSession(10),'question')}
function displayQuestionText(text){
  const value=String(text||'');
  const start=value.search(/\na\.\s/);
  if(start<0)return esc(value);
  const intro=value.slice(0,start).trim();
  const statements=value.slice(start+1).trim().split(/\n(?=[a-d]\.\s)/).map(x=>x.trim()).filter(Boolean);
  if(statements.length!==4)return esc(value);
  return `${esc(intro)}<span class="combo-statements">${statements.map(x=>`<span class="combo-statement">${esc(x)}</span>`).join('')}</span>`;
}
function question(){let q=currentQ(),b=base(q),c=cat(b.gid),s=sub(q.subject),ci=state.view.choices.findIndex(x=>x.correct),ok=state.answered&&state.view.choices[state.selected]?.correct;return `<main>${header(`${state.mockEnd?'模試':'第'+(state.idx+1)+'問'} / ${state.session.length}問`,true)}${state.answered?`<div class="resultTop ${ok?'ok':'ng'}">${ok?'⭕':'❌'}<span>${ok?'正解':'不正解'}</span>${!ok?`<span>正解 ${jpNo[ci]} ${state.view.choices[ci].text}</span>`:''}</div>`:''}<section class="content questionContent ${state.answered?'withResult':''}"><div class="qcard question-card ${importanceClass(q)}"><div class="qmeta"><span>${s.name} ＞ ${c.name}</span><span>${importanceBadge(q).replace('・4択','')}</span></div><p class="qtext">${displayQuestionText(b.question)}</p>${state.view.choices.map((ch,i)=>choiceBtn(ch,i)).join('')}</div>${state.answered?answerBox(q,ci,b):''}</section><div class="fixedNext"><button class="${state.answered?'nextBtn':''}" onclick="${state.answered?'nextQ()':'submitAnswer()'}">${state.answered?'次へ':'解答する'}</button></div>${bottom('today')}</main>`}
function choiceBtn(ch,i){let cls='';if(state.selected===i)cls+=' sel';if(state.answered&&ch.correct)cls+=' ok';if(state.answered&&state.selected===i&&!ch.correct)cls+=' ng';return `<button class="choice ${cls}" onclick="selectChoice(${i})"><span>${jpNo[i]}</span>${ch.text}</button>`}
function formatLawSourceText(text){
  const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim());
  const out=[];
  for(const line of lines){
    if(!line){
      if(out.length&&out[out.length-1]!==null)out.push(null);
      continue;
    }
    if(!out.length||out[out.length-1]===null){out.push(line);continue;}
    const prev=out[out.length-1];
    const startsStructure=/^(?:（[^）]+）|第[一二三四五六七八九十百千0-9０-９]+条|[一二三四五六七八九十百千]+[ 　]|[0-9０-９]+[ 　])/.test(line);
    if(/[。！？）]$/.test(prev)||startsStructure)out.push(line);else out[out.length-1]=prev+line;
  }
  return out.filter((line,i)=>line!==null||i>0&&out[i-1]!==null).map(line=>line===null?'':line);
}
function lawArticle(q){let m=(typeof LAW_META!=='undefined'&&LAW_META[q.id])||null;if(!m)return '';let source=formatLawSourceText(m.sourceText).map(line=>esc(line)).join('<br>');return `<section class="law-detail"><h3>該当条文（原文）</h3><div class="law-reference">${esc(m.reference)}</div><div class="law-source">${source}</div></section>`}
function memoryGuide(q,b){let m=(typeof LAW_META!=='undefined'&&LAW_META[q.id])||null;if(m){let points=(m.examPoints||[]).map(x=>`<li>${esc(x)}</li>`).join('');return points?`<section class="law-detail memory-guide"><h3>ポイント</h3><ul>${points}</ul></section>`:''}if(memoryTarget(q))return `<section class="memory-guide">${memoryExplain(q,b)}</section>`;return `<section class="law-detail memory-guide"><h3>覚え方</h3><ul><li>${b.point}</li><li>正解語と似た語や数字の入れ替えに注意する。</li></ul></section>`}
function explanationItems(exp){
  const sentences=String(exp||'').replace(/\r\n?/g,'\n').split(/\n+/).flatMap(block=>block.match(/[^。！？]+[。！？]?/g)||[]).map(x=>x.trim()).filter(Boolean);
  const meta=/^(?:したがって|よって|以上から).*(?:正解|正しい|誤り|組合せ|組み合わせ)|^(?:正解|正しいもの|正しい記述|正しい選択肢|正しい組合せ|正しい組み合わせ)は|^(?:[a-d](?:と[a-d])?|[①-④1-4])(?:は|が|も)?(?:正しい|誤り|不正解)(?:。)?$/;
  const cleaned=sentences.filter(x=>!meta.test(x)).map(x=>x
    .replace(/^[a-d](?:と[a-d])?(?:は|が|も)(?:正しく|正しい|誤りであり|誤りで|誤り)[、。]*/,'')
    .replace(/^[a-d]の/,'')
    .replace(/^[①-④](?:[・、と][①-④])*(?:は|が|も)(?:正しく|正しい|誤りであり|誤りで|誤り)[、。]*/,'')
    .replace(/^[①-④](?:[・、と][①-④])*はいずれも/,'')
    .replace(/(?:ため|ので|ことから)、[^。]*とする[a-d①-④](?:と[a-d①-④])?は誤りである。?$/,'。')
    .replace(/^(.+?)とする[a-d①-④](?:と[a-d①-④])?は誤りである。?$/,'$1とは定められていない。')
    .replace(/^(.+?)[a-d①-④]は誤りである。?$/,'$1ことは認められない。')
    .replace(/、?[a-d①-④]は誤り、[a-d①-④]は正しい。?$/,'。')
    .replace(/ため、[①-④1-4]が正しい。?$/,'ことが重要である。')
    .replace(/(?:なので|ではないので|ため)、[a-d①-④1-4](?:が|は)正しい。?$/,'。')
    .replace(/^[a-d](?:と[a-d])?(?:は|も)/,'')
    .replace(/^[①-④](?:[〜・、と][①-④])*(?:は|も)/,'')
    .replace(/、[a-d①-④](?:は|も)/g,'、')
    .replace(/誤り(?:である)?。?$/,'。')
    .replace(/を認めることは認められない。?$/,'は認められない。')
    .replace(/との混同であり。?$/,'と混同している。')
    .replace(/の説明であり。?$/,'の説明に当たる。')
    .replace(/の内容であり。?$/,'の内容に当たる。')
    .replace(/の働きであり。?$/,'の働きである。')
    .replace(/短時間の清拭であり。?$/,'短時間の清拭にとどまる。')
    .replace(/おそれがあり。?$/,'おそれがある。')
    .replace(/としており。?$/,'としている。')
    .replace(/否定しており。?$/,'否定している。')
    .replace(/限定しており。?$/,'限定している。')
    .replace(/取り違えており。?$/,'取り違えている。')
    .replace(/省略しており。?$/,'省略している。')
    .replace(/無視しており。?$/,'無視している。')
    .replace(/用いており。?$/,'用いている。')
    .replace(/委ねており。?$/,'委ねている。')
    .replace(/なので。?$/,'ため、基準と異なる。')
    .replace(/説明ため、/,'説明に当たるため、')
    .replace(/ためのもの。?$/,'ためのものではない。')
    .replace(/であり。?$/,'である。')
    .replace(/おり。?$/,'いる。')
    .replace(/ため。$/,'。')
    .replace(/^適切性又は迅速性の一方を欠く①・④や、救済の対象を事業者の損害とする③は誤りである。?$/,'適切性又は迅速性の一方を欠く記述や、救済の対象を事業者の損害とする記述は、法の趣旨と異なる。')
    .replace(/^適切性又は迅速性の一方を欠く①・④や、救済の対象を事業者の損害とは定められていない。?$/,'適切性又は迅速性の一方を欠く記述や、救済の対象を事業者の損害とする記述は、法の趣旨と異なる。')
    .replace(/^②は刃が引っかかりやすく、③は過度、④は誤りである。?$/,'刃の動きを止める操作、過度な皮膚緊張、毛流を確認しない操作は、皮膚損傷の原因になる。')
    .replace(/^、/,'').trim()).filter(x=>x&&!meta.test(x));
  return cleaned.length?cleaned:['この問題で問われている用語、条件及び適用範囲を整理して覚える。'];
}
function explanationSummary(exp){return `<ul class="law-summary-list">${explanationItems(exp).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`}
function answerBox(q,ci,b){let m=(typeof LAW_META!=='undefined'&&LAW_META[q.id])||null,legal=q.currentLegalReview?`<details open><summary>現行法令・通知の最終照合</summary><dl class="review-matrix">${Object.entries(q.currentLegalReview).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p><a href="${esc(q.currentLegalUrl)}" target="_blank" rel="noopener">${esc(q.currentLegalSource)}</a></p></details>`:'',review=q.structuredReview?`<details open><summary>重点整理</summary><dl class="review-matrix">${Object.entries(q.structuredReview).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`:'',choices=(q.choiceExplanations||[]).length?`<details open><summary>選択肢別：誤り箇所と正しい表現</summary><ol>${q.choiceExplanations.map((x,i)=>`<li><strong>選択肢${i+1}</strong><br>${esc(x)}</li>`).join('')}</ol></details>`:'',detail=`<details open><summary>問題の解説</summary>${explanationSummary(b.exp)}</details>`;let body=m?`${lawArticle(q)}${legal}${review}${choices}${detail}${memoryGuide(q,b)}`:`${legal}${review}${choices}${detail}${memoryGuide(q,b)}`;return `<div class="qcard answer"><h2>解説</h2>${body}${evidenceStatus(q)}</div>`}
function memoryExplain(q,b){const gid=groupId(q);let table='';if(gid==='infection')table='<div class="compare"><span>比較</span><span>一類：エボラ出血熱など</span><span>二類：結核など</span><span>三類：コレラなど</span></div>';if(gid==='cosmetics')table='<div class="compare"><span>比較</span><span>界面活性剤：洗浄・乳化</span><span>還元剤：パーマ第1剤</span><span>酸化剤：パーマ第2剤・染毛</span></div>';if(gid==='disinfection')table='<div class="compare"><span>比較</span><span>洗浄：汚れを落とす</span><span>消毒：微生物を減らす</span><span>血液付着：強めの消毒</span></div>';return `<div class="memo"><p><span>覚え方</span><br>${b.point}</p><p><span>ひっかけ</span><br>正解語と似た語を並べて迷わせる問題です。語尾まで確認します。</p><p><span>頻出度</span><br>★★★★★</p>${table}</div>`}
function selectChoice(i){if(!state.answered){state.selected=i;render()}}
function submitAnswer(){if(state.selected===null||state.mockTimedOut)return;const q=currentQ(),ok=!!state.view.choices[state.selected]?.correct;record(q,ok);if(state.mockEnd)state.mockResults.push({id:q.id,ok});state.answered=true;if(state.mockEnd)saveMockProgress();render()}
function nextQ(){if(state.idx<state.session.length-1){state={...state,page:'question',idx:state.idx+1,selected:null,answered:false,view:null};if(state.mockEnd)saveMockProgress();render()}else route('score')}

function mastered(){const p=prog(),list=masteredList(p).filter(q=>state.filter==='all'||groupId(q)===state.filter);return `<main>${header('克服済み',true)}<section class="content"><div class="chips"><button onclick="state.filter='all';render()">すべて</button>${CATEGORIES.map(c=>`<button onclick="state.filter='${c.id}';render()">${c.name}</button>`).join('')}</div>${list.length?list.map(q=>masteredRow(q,p)).join(''):'<div class="empty">克服済みの問題はありません。</div>'}</section>${bottom('mastered')}</main>`}
function masteredRow(q,p){const s=statFor(p,q),b=base(q);return `<div class="law"><span class="num">★</span><span class="grow"><span>${cat(b.gid).name}／${b.point}</span><small>克服済み　正答 ${s.ok||0}回</small></span><span>✓</span></div>`}

function mistakes(){const p=prog(),list=needReviewList(p).filter(m=>state.filter==='all'||groupId(qById(m.id)||{})===state.filter);return `<main>${header('🔖 要復習',true)}<section class="content"><div class="chips"><button onclick="state.filter='all';render()">すべて</button>${CATEGORIES.map(c=>`<button onclick="state.filter='${c.id}';render()">${c.name}</button>`).join('')}</div>${list.length?list.map(m=>mistakeRow(m)).join(''):'<div class="empty">要復習の問題はありません。</div>'}</section>${bottom('mistake')}</main>`}
function mistakeRow(m){const q=qById(m.id),b=base(q);return `<button class="law" onclick="startSession([qById(${m.id})],'question')"><span class="num">🔖</span><span class="grow"><span>${cat(b.gid).name}／${b.point}</span><small>登録中　ミス ${m.wrongCount}回　最終 ${m.lastMiss||m.firstMiss||'記録なし'}</small></span><span>解く ›</span></button>`}
function rankingCard(p){return `<div class="qcard"><h2>苦手ランキング</h2>${rankingList(p)}<button class="primary light" onclick="route('mistakes')">🔖 要復習へ</button></div>`}
function rankingList(p){const map={};Object.values(p.mistakes||{}).forEach(m=>{if(m.mastered)return;const q=qById(m.id);if(!q)return;const b=base(q),k=b.point;map[k]=(map[k]||0)+m.wrongCount});const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);return arr.length?arr.map((x,i)=>`<div class="rank"><span>${i+1}　${x[0]}</span><span>${x[1]}回</span></div>`).join(''):'<p class="muted">まだ苦手データがありません</p>'}
function evaluateMock(results){const rows=Array.isArray(results)?results:[],ok=rows.filter(x=>x.ok).length,total=55,rate=Math.round(ok/total*100),stats=OFFICIAL_TRACKS.map(t=>{const trackRows=rows.filter(x=>{const q=qById(x.id);return q&&officialTrackId(q)===t.id}),right=trackRows.filter(x=>x.ok).length;return{id:t.id,name:t.name,total:trackRows.length,ok:right,rate:trackRows.length?Math.round(right/trackRows.length*100):0}}),zero=stats.filter(x=>x.ok===0),low=stats.filter(x=>x.rate<40),short=Math.max(0,33-ok),pass=rows.length===55&&ok>=33&&zero.length===0;return{ok,total,rate,stats,zero,low,short,pass}}
function score(){const p=prog();if(state.mockEnd){const evaluated=evaluateMock(state.mockResults),{ok,total,rate,stats,zero,low,short,pass}=evaluated,reasons=[];if(!pass){if(state.mockResults.length!==55)reasons.push('全55問の解答が完了していません。');if(ok<33)reasons.push(`合格基準の60％に達していません（あと${short}問）。`);if(zero.length)reasons.push(`無得点の課目があります：${zero.map(x=>x.name).join('、')}`);if(low.length)reasons.push(`正答率が特に低い課目があります：${low.map(x=>x.name).join('、')}`)}recordMockResult(pass);return `<main>${header('模試結果',true)}<section class="content"><div class="qcard"><h2>${pass?'合格！':'不合格！'}</h2><p class="score">${ok} / ${total}</p><p>総正答率 ${rate}％</p><p class="muted">公式合格基準：55問中60％以上かつ9課目すべて無得点なし</p><div class="mock-category-results">${stats.map(x=>`<p>${x.name}　${x.ok} / ${x.total}問　${x.rate}％</p>`).join('')}</div>${reasons.length?`<div class="mock-fail-reasons"><h3>不合格になった主な要因</h3><ul>${reasons.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}</div></section>${bottom('score')}</main>`}return `<main>${header('学習記録',true)}<section class="content"><div class="qcard"><h2>正解済み</h2><p class="score">${solvedIds(p).size} / ${QUESTIONS.length}</p></div></section>${bottom('score')}</main>`}
function catScoreRow(c,i,p){let qs=qsCat(c.id),st=p.catStats?.[c.id]||{try:0,ok:0};return `<button class="subject-row" onclick="startCatSession('${c.id}')"><span>${c.name}<small>${rankText(qs)}</small></span><span>正答率 ${pct(st.ok,st.try)}%</span></button>`}
function themeName(k){const [gid,idx]=k.split(':'),q=QUESTIONS.find(x=>groupId(x)===gid&&String(templateIndex(x))===idx);return `${cat(gid).name}／${base(q||QUESTIONS[0]).point}`}
function searchPage(){let p=prog(),t=state.search,qs=t?QUESTIONS.filter(q=>!isMastered(p,q)).filter(q=>{let b=base(q);return (b.question+b.exp+b.point+cat(b.gid).name).includes(t)}):[];return `<main>${header('検索',true)}<section class="content"><input class="search" placeholder="キーワードで検索" value="${t}" oninput="state.search=this.value;render()">${qs.map(q=>{let b=base(q);return `<button class="law" onclick="startSession([qById(${q.id})],'question')"><span class="num">⌕</span><span class="grow"><span>${cat(b.gid).name}</span><small>${b.question}</small></span><span>›</span></button>`}).join('')}</section>${bottom('home')}</main>`}
function settings(){return `<main>${header('設定',true)}<section class="content"><div class="qcard"><p>学習データはこの端末のブラウザに保存されます。</p><button class="danger" onclick="if(confirm('学習データを削除しますか？')){storageRemove(PREFIX+'prog');route('home')}">学習データをリセット</button></div></section>${bottom('settings')}</main>`}
function appBack(){if(state.page==='home')return;if(state.mockEnd&&state.page==='question')saveMockProgress();route('home')}
function syncProblemUi(){const back=document.getElementById('problemBack'),nav=back?.closest('.floating-nav');if(back)back.hidden=state.page==='home';if(nav)nav.classList.toggle('with-fixed-next',state.page==='question');if(state.page!=='home')return;const content=app.querySelector('.content');if(content&&!content.querySelector('.problem-description')){const description=document.createElement('p');description.className='problem-description';description.textContent=`${QUESTIONS.length}問の独自問題`;content.prepend(description)}const mock=app.querySelector('.summary-item.sm-blue'),pending=store.get('mockProgress');if(mock){const label=mock.querySelector(':scope > span:nth-of-type(2)'),meta=mock.querySelector('em');if(label)label.textContent=pending&&!pending.completed?'模試を続きから再開':'模試';if(meta)meta.innerHTML=`問題集から構成する55問模試<br>${mockStatsText(prog())}`}}
function render(){app.innerHTML=({home,question,mistakes,mastered,search:searchPage,score,settings}[state.page]||home)();syncProblemUi();armMockTimer()}
document.addEventListener('DOMContentLoaded',syncProblemUi);
initFromHash();
