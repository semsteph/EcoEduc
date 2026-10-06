// Service worker EchoEducation : affiche les notifications envoyées par
// l'école même quand l'application est fermée, et ouvre la bonne page au
// toucher. Aucun cache de données : l'application reste toujours à jour.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { titre: 'EchoEducation', texte: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titre || 'EchoEducation', {
    body: d.texte || '',
    icon: '/icones/icone-192.png',
    badge: '/icones/badge-96.png',
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    data: { lien: d.lien || '/' },
    lang: 'fr',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const lien = (event.notification.data && event.notification.data.lien) || '/';
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).origin === self.location.origin) {
        await f.focus();
        if ('navigate' in f) return f.navigate(lien);
        return undefined;
      }
    }
    return self.clients.openWindow(lien);
  })());
});
