// Firebase Cloud Messaging service worker for background push notifications.
// To activate: provide your Firebase web app config (see Firebase Console → Project Settings → Web app).
// The file is intentionally inert until you fill in the config below.
//
// Docs: https://firebase.google.com/docs/cloud-messaging/js/receive

/* eslint-disable */
try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

  const firebaseConfig = {
    apiKey: "AIzaSyDkGt3cm94SVtTW7_raEwfmpvwdUR-tU5E",
    authDomain: "omastro-42ea9.firebaseapp.com",
    projectId: "omastro-42ea9",
    messagingSenderId: "24968482924",
    appId: "1:24968482924:web:4e49dc39d76fadd7d3c849",
  };

  if (firebaseConfig.apiKey !== "REPLACE_ME") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = (payload.notification && payload.notification.title) || "Om Astro";
      const options = {
        body: (payload.notification && payload.notification.body) || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        data: payload.data || {},
      };
      self.registration.showNotification(title, options);
    });
  }
} catch (err) {
  // Swallow errors so the rest of the app keeps working even without push configured.
  // eslint-disable-next-line no-console
  console.warn("[firebase-messaging-sw] not initialized:", err && err.message);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
