/**
 * Guarded service-worker registration wrapper.
 *
 * Per the Lovable PWA skill, the app SW must NEVER register in:
 *  - dev builds
 *  - the Lovable preview iframe / preview hosts
 *  - URLs containing ?sw=off (kill switch)
 *
 * In any of those contexts we also unregister an existing /sw.js so previously
 * installed workers can't keep serving stale HTML.
 */

const APP_SW_URL = "/sw.js";

function shouldSkipRegistration(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true; // cross-origin iframe
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") {
    return true;
  }
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
    // Only touch the app shell SW. Leave firebase-messaging-sw alone.
    if (url.endsWith(APP_SW_URL)) {
      try { await reg.unregister(); } catch { /* noop */ }
    }
  }
}

export async function registerPWA() {
  if (shouldSkipRegistration()) {
    await unregisterAppSW();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Check for updates hourly while the tab is open
        setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
      },
      onNeedRefresh() {
        // Auto-update on next navigation; SW uses skipWaiting via autoUpdate.
      },
      onOfflineReady() {
        // eslint-disable-next-line no-console
        console.info("[pwa] offline ready");
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[pwa] registration skipped:", err);
  }
}
