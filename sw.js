const CACHE_PREFIX='riyoshi-lawbook-';
const CACHE=CACHE_PREFIX+'v4-0-22';
const LEGACY_CACHE_PREFIXES=['riyo-kakomon-','riyoushi-9laws-final-'];
const ASSETS=['./','./index.html','./style.css','./app.js','./lawArticleData.js','./commercialLawData.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./分野別問題/data.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith(CACHE_PREFIX)&&key!==CACHE)||LEGACY_CACHE_PREFIXES.some(prefix=>key.startsWith(prefix))).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{if(response.ok&&event.request.url.startsWith(self.location.origin)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(error=>caches.match(event.request).then(found=>{if(found)return found;if(event.request.mode==='navigate')return caches.match('./index.html');throw error})))});
