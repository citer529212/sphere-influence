// Scope caches to this game; never clear other projects on the same Pages origin.
const CACHE='sphere-influence-0.18.1-rules7';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Cache every versioned screen before replacing the previous worker.
    const response=await fetch(new URL('build-assets.json',self.registration.scope),{cache:'no-store'});
    if(!response.ok)throw new Error('Build assets unavailable');
    const assets=await response.json(),cache=await caches.open(CACHE);
    await cache.addAll(assets.map(path=>new URL(path,self.registration.scope).href));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sphere-influence-')&&key!==CACHE).slice(0,-2).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  // Let the browser stream video byte ranges; Cache.put does not accept 206 responses.
  if(request.headers.has('range')||url.pathname.includes('/cinematics/'))return;
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),asset=url.pathname.includes('/assets/');
    if(asset){const cached=await caches.match(request);if(cached)return cached;}
    try{
      const response=await fetch(request);
      if(response.ok&&response.type!=='opaque')await cache.put(request,response.clone()).catch(()=>undefined);
      return response;
    }catch{
      const cached=await cache.match(request);if(cached)return cached;
      if(request.mode==='navigate'){
        const fallback=await cache.match(new URL('index.html',scope).href)||await cache.match(scope.href);
        if(fallback)return fallback;
      }
      return Response.error();
    }
  })());
});
