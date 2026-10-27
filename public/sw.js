// Scope caches to this game; never clear other projects on the same Pages origin.
const CACHE='sphere-influence-0.10.0-rules6';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sphere-influence-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),asset=url.pathname.includes('/assets/');
    if(asset){const cached=await cache.match(request);if(cached)return cached;}
    try{
      const response=await fetch(request);
      if(response.ok&&response.type!=='opaque')await cache.put(request,response.clone());
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
