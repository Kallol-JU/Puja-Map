import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["favicon.svg", "apple-touch-icon.png"],

      manifest: {
        id: "/",
        name: "Durga Puja Map",
        short_name: "Puja Map",
        description: "Find and navigate to Durga Puja pandals near you.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#b91c1c",
        background_color: "#ffffff",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // Precache the app shell: JS, CSS, HTML, images, fonts
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],

        // mapbox-gl makes the main bundle large; the default limit is 2 MiB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        // Serve index.html for any in-app route when offline (SPA)
        navigateFallback: "index.html",

        // Remove caches from older builds
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // Images you load at runtime (e.g. pandal photos in /public or a CDN you control)
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheets (skip this block if you self-host fonts)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-styles" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Lets you test the service worker with `npm run dev`
      devOptions: { enabled: true },
    }),
  ],
});
