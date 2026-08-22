import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { loadStore, persistStore } from "./store.js";

for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env"), resolve(process.cwd(), "apps/api/.env")]) {
  if (existsSync(file) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(file);
  }
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) loadStore();

const port = Number(process.env.API_PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

process.on("SIGINT", () => {
  persistStore();
  process.exit(0);
});

console.log(`Mudra Sanchay API listening on http://localhost:${port}/api/v1/health`);
