// public/firebase-messaging-sw.js
// Service Worker para notificaciones push de Stratium AI

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Configuración de Firebase (de tu proyecto)
firebase.initializeApp({
  apiKey: 'AIzaSyAgEy1bbqfV4ugPbEdF8pccihUogwfIVDE',
  authDomain: 'agente-financiero-ia-8548f.firebaseapp.com',
  projectId: 'agente-financiero-ia-8548f',
  storageBucket: 'agente-financiero-ia-8548f.firebasestorage.app',
  messagingSenderId: '924586612103',
  appId: '1:924586612103:web:1df0a21e7982a77a6caf22',
  measurementId: 'G-8BEN3YXTDE'
});

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano (cuando la app está cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Notificación en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'Stratium Global AI';
const notificationOptions = {
  body: payload.notification?.body || '',
  icon: '/icon-192.png',
  badge: '/icon-96.png',
  tag: 'stratium-notification',
  data: payload.data || {},
  requireInteraction: true,
  vibrate: [200, 100, 200]
};
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, la enfoca
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // Si no, abre una nueva
        return clients.openWindow('/');
      })
  );
});

