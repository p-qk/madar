const root = new URL('./',self.location.href);
const prefix = 'madar-shell-' + root.pathname + ':';
const cacheName = prefix + "95bb2060d7671387";
const index = new URL('index.html',root).href;
const shellFiles = new Set([index,...["style.css?v=95bb2060d7671387","month.css?v=95bb2060d7671387","studio-course.css?v=95bb2060d7671387","lesson-visuals.css?v=95bb2060d7671387","login-page.css?v=95bb2060d7671387","site-experience.css?v=95bb2060d7671387","visual-design.css?v=95bb2060d7671387","lesson-sketches.css?v=95bb2060d7671387","lesson-figures.css?v=95bb2060d7671387","madar-core.js?v=95bb2060d7671387","cloud-progress.js?v=95bb2060d7671387","site-experience.js?v=95bb2060d7671387","login-page.js?v=95bb2060d7671387","course-access.js?v=95bb2060d7671387","madar-start.js?v=95bb2060d7671387","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","madar-release.js?v=95bb2060d7671387"].map(file=>new URL(file,root).href)]);

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll([...shellFiles])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key!==cacheName && (key.startsWith(prefix) ||
      (root.pathname==='/madar/' && key.startsWith('madar-month1-'))))
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request = event.request;
  const url = new URL(request.url);
  const entry = request.mode==='navigate' && url.origin===root.origin &&
    (url.pathname===root.pathname || url.pathname===new URL(index).pathname);
  if (request.method!=='GET' || (!entry && !shellFiles.has(url.href))) return;
  event.respondWith(fetch(request).catch(()=>caches.match(entry?index:request).then(saved=>saved||Response.error())));
});
