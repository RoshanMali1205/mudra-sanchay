import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import type { ServerResponse } from "node:http";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "logo.svg",
        "icons/apple-touch-icon.png",
        "icons/pwa-192x192.png",
        "icons/pwa-512x512.png",
        "icons/maskable-512x512.png"
      ],
      manifest: {
        id: "/",
        name: "Mudra Sanchay",
        short_name: "Mudra Sanchay",
        description:
          "Transport income, farmer accounts and expenses for Radhe Krishna Transport.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#f4f7f7",
        theme_color: "#0f766e",
        lang: "en",
        categories: ["business", "finance", "productivity"],
        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Keep the install shell lean; large farm photos are cached on demand.
        globPatterns: ["**/*.{js,css,html,ico,svg,webp,woff2,webmanifest}"],
        globIgnores: ["**/images/farm-fields.png", "**/images/tomato-crates.png", "**/images/tomato-crate-square.png"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly"
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/images/") && url.pathname.endsWith(".png"),
            handler: "CacheFirst",
            options: {
              cacheName: "mudra-photo-assets",
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        navigateFallback: "index.html"
      }
    })
  ],
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
                    message: "The API is not running. Start it with pnpm --filter @mudra-sanchay/api --filter @mudra-sanchay/web dev."
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
