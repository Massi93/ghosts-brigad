/**
 * Point d'entrée de la démo autonome (npm run build:demo → dist-demo/).
 * Le site, la page /live et le cockpit sont les vrais composants ; le serveur
 * est simulé par demoServer.js.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import DemoRoot, { demoToast } from "./DemoRoot.jsx";
import { installCameraFallback } from "./fakeCamera.js";
import { getDownload } from "./demoServer.js";
import { navigate } from "./mockNav.js";

// Dans l'aperçu Claude, confirm() répond toujours « non » : la démo confirme d'office.
window.confirm = () => true;

// Webcam réelle si le navigateur l'autorise, sinon caméra simulée.
installCameraFallback();

// Téléchargements (export CSV, enregistrements) via la capacité « downloads » de Claude.
let downloads = Promise.resolve(null);
setTimeout(() => {
  downloads = window.claude?.use?.("downloads") ?? Promise.resolve(null);
}, 0);

async function download(href) {
  const file = getDownload(href);
  if (!file) {
    demoToast("Ce fichier n'est pas encore disponible.");
    return;
  }
  const saver = await downloads;
  if (saver) {
    try {
      await saver.save(file);
    } catch (err) {
      if (err?.code !== "declined") demoToast("Téléchargement impossible dans cette vue.");
    }
    return;
  }
  // Hors de Claude (fichier ouvert dans un navigateur) : téléchargement classique.
  const url = URL.createObjectURL(file.data instanceof Blob ? file.data : new Blob([file.data]));
  const a = Object.assign(document.createElement("a"), { href: url, download: file.filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Les liens internes (/live, /cockpit, /api/...) restent dans la démo.
document.addEventListener(
  "click",
  (event) => {
    const link = event.target.closest?.("a[href]");
    const href = link?.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    event.preventDefault();
    if (href.startsWith("/api/")) download(href);
    else navigate(href);
  },
  true
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DemoRoot />
  </React.StrictMode>
);
