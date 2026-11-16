const root = new URL('./',self.location.href);
const prefix = 'madar-shell-' + root.pathname + ':';
const cacheName = prefix + "75794fe26cf62f7e";
const index = new URL('index.html',root).href;
const shellFiles = new Set([index,...["style.css?v=75794fe26cf62f7e","month.css?v=75794fe26cf62f7e","studio-course.css?v=75794fe26cf62f7e","lesson-visuals.css?v=75794fe26cf62f7e","login-page.css?v=75794fe26cf62f7e","site-experience.css?v=75794fe26cf62f7e","visual-design.css?v=75794fe26cf62f7e","lesson-sketches.css?v=75794fe26cf62f7e","lesson-figures.css?v=75794fe26cf62f7e","madar-core.js?v=75794fe26cf62f7e","cloud-progress.js?v=75794fe26cf62f7e","site-experience.js?v=75794fe26cf62f7e","login-page.js?v=75794fe26cf62f7e","course-access.js?v=75794fe26cf62f7e","madar-start.js?v=75794fe26cf62f7e","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","madar-release.js?v=75794fe26cf62f7e"].map(file=>new URL(file,root).href)]);

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
