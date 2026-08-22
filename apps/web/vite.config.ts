import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { ServerResponse } from "node:http";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        timeout: 4000,
        configure(proxy) {
          proxy.on("error", (_error, _req, res) => {
            const response = res as ServerResponse;
            if (!response.headersSent) {
              response.writeHead(503, { "Content-Type": "application/json" });
              response.end(
                JSON.stringify({
                  error: {
                    code: "API_UNAVAILABLE",
                    message: "The API is not running. Start it with pnpm dev."
                  }
                })
              );
            }
          });
        }
      }
    }
  },
  preview: {
    port: 4173
  }
});
