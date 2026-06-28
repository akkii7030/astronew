import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

process.on("uncaughtException", (err) => {
  console.error("[startup] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[startup] Unhandled rejection:", reason);
  process.exit(1);
});

console.log(`[startup] PORT=${PORT} HOST=${HOST}`);
console.log(`[startup] __dirname=${__dirname}`);
console.log(`[startup] cwd=${process.cwd()}`);

// Log dist structure to debug asset paths
function logDir(dir, prefix = "") {
  try {
    if (!fs.existsSync(dir)) { console.log(`[startup] ${prefix} MISSING: ${dir}`); return; }
    const entries = fs.readdirSync(dir).slice(0, 20);
    console.log(`[startup] ${prefix} ${dir}: [${entries.join(", ")}]`);
  } catch (e) { console.log(`[startup] ${prefix} ERROR reading ${dir}: ${e.message}`); }
}

logDir(path.join(__dirname, "dist"));
logDir(path.join(__dirname, "dist", "public"));
logDir(path.join(__dirname, "dist", "public", "assets"));
logDir(path.join(__dirname, "dist", "assets"));

const MIME_TYPES = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain",
  ".html": "text/html",
};

// TanStack Start (Vinxi) outputs client assets to dist/client/
const STATIC_ROOTS = [
  path.join(__dirname, "dist", "client"),
  path.join(__dirname, "dist", "public"),
  path.join(__dirname, "dist"),
];

function tryServeStatic(req, res) {
  try {
    const urlPath = new URL(req.url, `http://localhost`).pathname;
    for (const root of STATIC_ROOTS) {
      const filePath = path.join(root, urlPath);
      if (!filePath.startsWith(root)) continue;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        if (urlPath.startsWith("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        createReadStream(filePath).pipe(res);
        return true;
      }
    }
  } catch {
    // fall through to SSR
  }
  return false;
}

const serverModule = await import("./dist/server/server.js");
const exportKeys = Object.keys(serverModule);
console.log("[startup] Module exports:", exportKeys.join(", "));

const handler = serverModule.default ?? serverModule.app ?? serverModule.handler;

if (!handler) {
  console.error("[startup] No handler found:", exportKeys);
  process.exit(1);
}

console.log("[startup] Handler type:", typeof handler);

try {
  const { toNodeListener } = await import("h3");
  const h3Listener = toNodeListener(handler);

  const server = createServer((req, res) => {
    if (tryServeStatic(req, res)) return;
    h3Listener(req, res);
  });

  server.on("error", (err) => console.error("[startup] Server error:", err));
  server.listen(PORT, HOST, () => {
    console.log(`[startup] Server listening on ${HOST}:${PORT}`);
  });
} catch (h3Err) {
  console.error("[startup] H3 failed:", h3Err.message);

  const server = createServer((req, res) => {
    if (tryServeStatic(req, res)) return;
    handler(req, res);
  });

  server.on("error", (err) => console.error("[startup] Server error:", err));
  server.listen(PORT, HOST, () => {
    console.log(`[startup] Server listening (direct) on ${HOST}:${PORT}`);
  });
}
