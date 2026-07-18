const CACHE='riyo-kakomon-v300-r1';
const CACHE_PREFIX='riyo-kakomon-';
const ASSETS=['./','./index.html','./style.css','./data.js','./app.js','./manifest.webmanifest'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE)
          .map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;

  e.respondWith(
    fetch(e.request)
      .then(res=>{
        if(e.request.url.startsWith(self.location.origin)&&res&&res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return res;
      })
      .catch(()=>caches.match(e.request).then(r=>{
        if(r)return r;
        if(e.request.mode==='navigate')return caches.match('./index.html');
        return undefined;
      }))
  );
});
