import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

const serverModule = await import("./dist/server/server.js");
const exportKeys = Object.keys(serverModule);
console.log("[startup] Module exports:", exportKeys.join(", "));

const handler = serverModule.default ?? serverModule.app ?? serverModule.handler;

if (!handler) {
  console.error("[startup] No handler found in module exports:", exportKeys);
  process.exit(1);
}

console.log("[startup] Handler type:", typeof handler);
console.log("[startup] Handler keys:", Object.keys(handler).join(", "));

// Try H3's toNodeListener (TanStack Start uses H3 internally)
try {
  const { toNodeListener } = await import("h3");
  const server = createServer(toNodeListener(handler));
  server.on("error", (err) => console.error("[startup] Server error:", err));
  server.listen(PORT, HOST, () => {
    console.log(`[startup] Server listening on ${HOST}:${PORT}`);
  });
} catch (h3Err) {
  console.error("[startup] H3 approach failed:", h3Err.message);

  // Fallback: try handler directly as node listener
  try {
    const server = createServer(handler);
    server.on("error", (err) => console.error("[startup] Server error:", err));
    server.listen(PORT, HOST, () => {
      console.log(`[startup] Server listening (direct) on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("[startup] All approaches failed:", err);
    process.exit(1);
  }
}
