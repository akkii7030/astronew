// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Packages that must NEVER be bundled into the browser/client build.
// They are server-side only (firebase-admin and its deep dependency tree).
const SERVER_ONLY_PACKAGES = [
  "firebase-admin",
  "google-auth-library",
  "gcp-metadata",
  "google-gax",
  "@grpc/grpc-js",
  "@grpc/proto-loader",
  "grpc",
  "jws",
  "jwa",
  "google-logging-utils",
  "gtoken",
  "agent-base",
  "https-proxy-agent",
  "node-fetch",
  "node-domexception",
  "fetch-blob",
  "formdata-polyfill",
  "readable-stream",
  "buffer-equal-constant-time",
];

export default defineConfig({
  // Force-enable Nitro with the node-server preset so it produces a real
  // standalone HTTP server at .output/server/index.mjs (required for Render).
  // Without this the @lovable.dev config skips the Nitro build entirely.
  nitro: { preset: "node-server" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    serverFns: {
      disableCsrfMiddlewareWarning: true,
    },
  },
  vite: {
    // Prevent Vite's dev-server pre-bundler from touching server-only packages.
    optimizeDeps: {
      exclude: SERVER_ONLY_PACKAGES,
    },
    // Externalize from the SSR (server-side rendering) build.
    ssr: {
      external: SERVER_ONLY_PACKAGES,
    },
    build: {
      rollupOptions: {
        // Externalize from the CLIENT bundle as well.
        // These packages only run on the server; TanStack Start replaces
        // server-function calls with HTTP stubs so they're never needed client-side.
        external: (id: string) =>
          SERVER_ONLY_PACKAGES.some(
            (pkg) => id === pkg || id.startsWith(pkg + "/"),
          ),
      },
    },
    plugins: [
      VitePWA({
        // Generate a Workbox SW. Registered via our guarded wrapper.
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null, // never auto-inject; our wrapper owns registration
        filename: "sw.js",
        manifest: false, // we ship public/manifest.webmanifest manually
        includeAssets: [
          "favicon.ico",
          "offline.html",
          "manifest.webmanifest",
          "icons/*.png",
        ],
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/__l5e\//,
            /^\/~oauth/,
            /^\/sw\.js$/,
            /^\/firebase-messaging-sw\.js$/,
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // App navigations — network-first so users always get fresh HTML,
              // fall back to cache then offline.html.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "om-astro-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // CDN-hosted assets
              urlPattern: /^\/__l5e\/assets-v1\//,
              handler: "CacheFirst",
              options: {
                cacheName: "om-astro-cdn-assets",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google fonts
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Same-origin static images
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "om-astro-images",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
