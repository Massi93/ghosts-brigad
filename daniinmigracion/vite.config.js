/**
 * Build de l'application du Live (page /live + cockpit) : npm run build
 *
 * Tout est publié sous /live/ (dist/live/…) : le site principal transmet ce
 * chemin au Worker Cloudflare, sans conflit avec ses propres fichiers.
 *
 * `npm run dev:ui` : serveur Vite avec rechargement à chaud ; l'API et les
 * WebSockets sont relayés vers le Worker local (`npm run dev`, port 8787).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const WORKER = "http://localhost:8787";

export default defineConfig({
  base: "/live/",
  plugins: [react()],
  build: {
    outDir: "dist/live",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api/live": { target: WORKER, ws: true, changeOrigin: false },
    },
  },
});
