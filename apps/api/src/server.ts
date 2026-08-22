import { serve } from "@hono/node-server";
import app from "./app.js";
import { loadStore, persistStore } from "./store.js";

loadStore();

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
