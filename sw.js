const CACHE_PREFIX='riyoshi-lawbook-';
const CACHE=CACHE_PREFIX+'v4-0-6';
const ASSETS=['./','./index.html','./style.css','./app.js','./lawArticleData.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./分野別問題/data.js','./学習資料/data.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{if(response.ok&&event.request.url.startsWith(self.location.origin)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request).then(found=>found||caches.match('./index.html'))))});
