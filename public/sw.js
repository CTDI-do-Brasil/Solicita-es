// Service Worker para Notificações Nativas do Windows 11 / Chrome (Nexus CTDI)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Ação de clique na Notificação Nativa do Windows
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Se clicou no botão de ação "Fechar"
  if (event.action === 'close') {
    return;
  }

  // Ao clicar na notificação ou no botão "Abrir Solicitação", foca a janela do Nexus no Chrome
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Suporte a mensagens enviadas pela aplicação React
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
