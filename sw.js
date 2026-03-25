// CapEye v10 — Service Worker (PWA + Push Notifications + Offline)
const CACHE_NAME = 'capeye-master';
const STATIC_ASSETS = ['/', '/index.html', '/workflow.html', '/inventory.html', '/alerts.html', '/analytics.html', '/keys.html', '/audit.html', '/team.html', '/auction.html', '/accessories.html', '/aftersales.html', '/vehicle-overview.html', '/admin.html', '/login.html', '/ac-data.js', '/firebase-config.js', '/firebase-init.js', '/auto-capital-logo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if(e.request.method!=='GET') return; e.respondWith(caches.match(e.request).then(cached => { const net=fetch(e.request).then(res=>{if(res&&res.status===200&&res.type==='basic'){const cl=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,cl))}return res}).catch(()=>cached); return cached||net; })); });
self.addEventListener('push', e => { const d=e.data?e.data.json():{title:'CapEye',body:'New notification'}; e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'/auto-capital-logo.png',data:d.url||'/'})); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data||'/')); });
