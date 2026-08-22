import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env.API_PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

console.log(`Mudra Sanchay API listening on http://localhost:${port}/api/v1/health`);
