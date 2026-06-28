import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
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
  plugins: [
    tanstackStart({
      // SSR entry point
      server: { entry: "src/start.ts" },
      serverFns: {
        disableCsrfMiddlewareWarning: true,
      },
      // Use node-server preset for Nitro
      nitro: {
        moduleSideEffects: [],
      },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      manifest: false,
      disable: false,
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
          /^\/sw\.js$/,
          /^\/firebase-messaging-sw\.js$/,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "om-astro-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
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
  preview: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // Prevent Vite from touching server-only packages during dev pre-bundling
  optimizeDeps: {
    exclude: [...SERVER_ONLY_PACKAGES, "@zegocloud/zego-uikit-prebuilt"],
    include: ["firebase/app", "firebase/auth", "firebase/firestore"],
  },
  // Externalize from the SSR build
 ssr: {
  external: [
    ...SERVER_ONLY_PACKAGES,
    "@zegocloud/zego-uikit-prebuilt",
    "@cashfreepayments/cashfree-js",
  ],
  noExternal: ["firebase"],
},
  build: {
    // Raise warning limit for the Zego SDK which is unavoidably large
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      // Keep server-only packages out of the client bundle
      external: (id: string) =>
        SERVER_ONLY_PACKAGES.some(
          (pkg) => id === pkg || id.startsWith(pkg + "/"),
        ),
      output: {
        // Split heavy deps into separate chunks to reduce per-chunk memory during build
        manualChunks(id, { getModuleInfo }) {
          const info = getModuleInfo(id);
          if (!info || info.isExternal) {
            return;
          }
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (
              id.includes("firebase/app") ||
              id.includes("firebase/auth") ||
              id.includes("firebase/firestore")
            ) {
              return "vendor-firebase";
            }
            if (id.includes("@zegocloud/zego-uikit-prebuilt")) {
              return "vendor-zego";
            }
            if (
              id.includes("@tanstack/react-router") ||
              id.includes("@tanstack/react-query")
            ) {
              return "vendor-tanstack";
            }
            if (id.includes("framer-motion")) {
              return "vendor-framer";
            }
          }
        },
      },
    },
  },
});
