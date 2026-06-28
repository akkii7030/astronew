import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.on("uncaughtException", (err) => {
  console.error("[startup] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[startup] Unhandled rejection:", reason);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

console.log(`[startup] NODE_ENV=${process.env.NODE_ENV}`);
console.log(`[startup] PORT=${PORT}`);
console.log(`[startup] Loading dist/server/server.js...`);

try {
  await import("./dist/server/server.js");
  console.log("[startup] Server module loaded successfully");
} catch (err) {
  console.error("[startup] Failed to load server module:", err);
  process.exit(1);
}
