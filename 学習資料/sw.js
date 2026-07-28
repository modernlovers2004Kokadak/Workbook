const CACHE_PREFIX="riyoushi-9laws-final-";
const CACHE_NAME=CACHE_PREFIX+"v3-0-0-r1";
const ASSETS=["./","./index.html","./style.css?v=7","./script.js?v=7","./data.js?v=7","./manifest.json"];
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
