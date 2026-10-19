/**
 * Build de la démo autonome : npm run build:demo
 *
 * - Même code que le site, mais api / socket / nav / réception vidéo sont
 *   remplacés par les versions simulées de src/demo/ (aucun serveur requis).
 * - Sortie en un seul fichier HTML (JS et CSS intégrés) :
 *     dist-demo/demo.html      → à ouvrir directement dans un navigateur
 *     dist-demo/artifact.html  → même contenu sans <html>/<head>/<body>, pour une page Claude
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

const SWAPS = {
  "src/lib/api.js": "src/demo/mockApi.js",
  "src/lib/socket.js": "src/demo/mockSocket.js",
  "src/lib/nav.js": "src/demo/mockNav.js",
  "src/live/useViewerStream.js": "src/demo/useDemoViewerStream.js",
};

/** Redirige les imports des modules réseau vers leurs versions simulées. */
function demoSwaps() {
  return {
    name: "demo-swaps",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const relative = path.relative(root, resolved.id).split(path.sep).join("/");
      return SWAPS[relative] ? path.join(root, SWAPS[relative]) : null;
    },
  };
}

/** Intègre le JS et le CSS dans le HTML, puis produit aussi la version « page Claude ». */
function singleFile() {
  return {
    name: "single-file",
    enforce: "post",
    generateBundle(_options, bundle) {
      const htmlFile = Object.values(bundle).find((f) => f.type === "asset" && f.fileName.endsWith(".html"));
      let html = String(htmlFile.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "chunk") {
          const code = file.code.replace(/<\/script/gi, "<\\/script");
          html = html.replace(/<script type="module" crossorigin src="[^"]*"><\/script>/, () => "");
          html = html.replace("</body>", () => `<script type="module">${code}</script>\n</body>`);
          delete bundle[name];
        } else if (name.endsWith(".css")) {
          html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]*">/, () => `<style>${file.source}</style>`);
          delete bundle[name];
        }
      }
      htmlFile.source = html;

      // Fragment pour une page Claude : la plateforme fournit doctype, <head> et <body>.
      const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
      const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
      const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
      const keep = [...head.matchAll(/<link\s[^>]*fonts\.(googleapis|gstatic)[^>]*>|<style>[\s\S]*?<\/style>/g)].map((m) => m[0]);
      this.emitFile({
        type: "asset",
        fileName: "artifact.html",
        source: `${title}\n${keep.join("\n")}\n${body.trim()}\n`,
      });
    },
  };
}

export default defineConfig({
  root,
  base: "./",
  plugins: [react(), demoSwaps(), singleFile()],
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: path.join(root, "demo.html"),
      output: { inlineDynamicImports: true },
    },
  },
});
