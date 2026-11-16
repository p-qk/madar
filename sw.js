const root = new URL('./',self.location.href);
const prefix = 'madar-shell-' + root.pathname + ':';
const cacheName = prefix + "b28009801a575132";
const index = new URL('index.html',root).href;
const shellFiles = new Set([index,...["style.css?v=b28009801a575132","month.css?v=b28009801a575132","studio-course.css?v=b28009801a575132","lesson-visuals.css?v=b28009801a575132","login-page.css?v=b28009801a575132","site-experience.css?v=b28009801a575132","visual-design.css?v=b28009801a575132","lesson-sketches.css?v=b28009801a575132","lesson-figures.css?v=b28009801a575132","madar-core.js?v=b28009801a575132","cloud-progress.js?v=b28009801a575132","site-experience.js?v=b28009801a575132","login-page.js?v=b28009801a575132","course-access.js?v=b28009801a575132","madar-start.js?v=b28009801a575132","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","madar-release.js?v=b28009801a575132"].map(file=>new URL(file,root).href)]);

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
