/**
 * Racine de la démo : affiche le site, la page /live ou le cockpit dans une
 * seule page, plus l'onglet « DÉMO » (guide, accès, public simulé, emails).
 *
 * Le cockpit reste monté (caché) quand on passe sur une autre vue pendant un
 * live : sa caméra continue de diffuser, comme si Dani gardait son onglet ouvert.
 */
import { useEffect, useReducer, useRef, useState } from "react";
import { ChevronDown, Mail, MonitorPlay, RotateCcw, Users, X } from "lucide-react";
import App from "../App.jsx";
import LivePage from "../live/LivePage.jsx";
import CockpitApp from "../cockpit/CockpitApp.jsx";
import { LiveStatusProvider } from "../lib/liveStatus";
import { currentPath, currentSearch, navigate, subscribeRoute } from "./mockNav.js";
import { ADMIN, demo, isLoggedIn, outbox, setAudience, subscribe } from "./demoServer.js";

/* ----------------------------- Notifications ----------------------------- */

const toastListeners = new Set();
export function demoToast(message) {
  toastListeners.forEach((fn) => fn(message));
}

function DemoToast() {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    let timer;
    const show = (m) => {
      setMessage(m);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 4000);
    };
    toastListeners.add(show);
    return () => toastListeners.delete(show);
  }, []);
  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-4 z-[320] flex justify-center px-4">
      <p className="rounded-2xl border border-gold-400/40 bg-[#1c1607] px-4 py-3 text-sm text-gold-400 shadow-card">{message}</p>
    </div>
  );
}

/* -------------------------------- Racine -------------------------------- */

function useDemoState() {
  const [, refresh] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribe(refresh), []);
}

export default function DemoRoot() {
  const [route, setRoute] = useState({ path: currentPath(), search: currentSearch() });
  useEffect(() => subscribeRoute(setRoute), []);
  // Seul l'état de connexion intéresse la racine (évite de redessiner tout le site à chaque événement).
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  useEffect(() => subscribe(() => setLoggedIn(isLoggedIn())), []);

  const view = route.path.startsWith("/cockpit") ? "cockpit" : route.path === "/live" ? "live" : "site";

  // Section du cockpit mémorisée quand on le quitte (le site utilise aussi l'ancre de l'URL).
  const [cockpitOpened, setCockpitOpened] = useState(false);
  const previousView = useRef(view);
  const cockpitHash = useRef("");
  useEffect(() => {
    if (view === "cockpit") {
      setCockpitOpened(true);
      if (previousView.current !== "cockpit" && cockpitHash.current) window.location.hash = cockpitHash.current;
    } else if (previousView.current === "cockpit") {
      cockpitHash.current = window.location.hash;
    }
    previousView.current = view;
  }, [view]);

  const keepCockpit = view === "cockpit" || (cockpitOpened && loggedIn);

  return (
    <>
      {keepCockpit && (
        <div hidden={view !== "cockpit"}>
          <CockpitApp />
        </div>
      )}
      {view !== "cockpit" && (
        <LiveStatusProvider>{view === "live" ? <LivePage /> : <App />}</LiveStatusProvider>
      )}
      <DemoPanel view={view} />
      <DemoToast />
    </>
  );
}

/* --------------------------- Onglet « DÉMO » --------------------------- */

const VIEWS = [
  { id: "site", label: "Site", path: "/", hint: "Bouton LIVE, inscription" },
  { id: "live", label: "Page du live", path: "/live", hint: "Ce que voit le public" },
  { id: "cockpit", label: "Cockpit", path: "/cockpit", hint: "L'espace de Dani" },
];

const KIND_LABELS = {
  confirmation: "Confirmation",
  reminder_3h: "Rappel 3 h",
  reminder_5m: "Rappel 5 min",
  manual: "Envoi manuel",
  resubscribe: "Réinscription",
  test: "Test",
};

const STEPS = [
  ["Site", "Le bouton LIVE rouge clignote dans l'en-tête, avec le chrono 05:00 → 00:00 (un live commence dans moins de 5 min). Inscrivez-vous dans « Próximo live »."],
  ["Cockpit", `Connectez-vous (${ADMIN.username} / ${ADMIN.password}), onglet « Directo », puis « Iniciar live ». Dans l'aperçu Claude, la webcam est remplacée par une caméra simulée.`],
  ["Page du live", "Envoyez des cœurs avec le bouton ou un double-tap. Le public simulé en envoie aussi : tout est compté dans le cockpit."],
  ["Emails", "« Inscritos » : cochez des inscrits puis « Enviar ». La boîte d'envoi de la démo montre chaque email, rappels 3 h et 5 min compris."],
];

function DemoPanel({ view }) {
  useDemoState();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("guide"); // guide | emails
  const emails = outbox();

  const go = (target) => {
    navigate(target.path);
    if (window.matchMedia("(max-width: 640px)").matches) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ouvrir le panneau de démonstration"
        className="fixed top-1/2 z-[290] -translate-y-1/2 rounded-r-xl bg-gold-500 px-1.5 py-3 text-[11px] font-extrabold tracking-[0.2em] text-ink shadow-card [writing-mode:vertical-rl]"
        style={{ left: "env(safe-area-inset-left, 0px)" }}
      >
        DÉMO
      </button>

      {open && (
        <aside
          className="fixed bottom-3 top-3 z-[300] flex w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-gold-400/30 bg-[#0d1424]/95 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          style={{ left: "calc(env(safe-area-inset-left, 0px) + 12px)" }}
          aria-label="Panneau de démonstration"
        >
          <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <p className="font-display text-lg font-extrabold">
                Mode démo <span className="text-gold-400">· Live</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Serveur, public et emails sont simulés dans votre navigateur : rien n'est envoyé ni
                enregistré en ligne. Recharger la page remet tout à zéro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le panneau"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="no-scrollbar flex-1 overflow-y-auto p-4">
            {/* Navigation entre les vues */}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Aller à</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => go(v)}
                  className={`rounded-xl px-2 py-2.5 text-xs font-bold transition ${
                    view === v.id ? "bg-brand-500 text-white" : "bg-white/5 text-white/75 hover:bg-white/10"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="text-white/50">Accès cockpit</p>
              <p className="mt-1 select-all font-mono text-sm text-white">
                {ADMIN.username} · {ADMIN.password}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAudience(!demo.audience)}
              aria-pressed={demo.audience}
              className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"
            >
              <span className="flex items-start gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span>
                  <span className="block text-sm font-semibold">Public simulé</span>
                  <span className="block text-xs text-white/50">
                    Des viewers (Mexique, Colombie, États-Unis…) rejoignent le live et envoient des cœurs.
                  </span>
                </span>
              </span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${demo.audience ? "bg-emerald-500" : "bg-white/20"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${demo.audience ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>

            {/* Onglets guide / emails */}
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTab("guide")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${tab === "guide" ? "bg-white/10 text-white" : "text-white/55"}`}
              >
                <MonitorPlay className="h-3.5 w-3.5" /> À tester
              </button>
              <button
                type="button"
                onClick={() => setTab("emails")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${tab === "emails" ? "bg-white/10 text-white" : "text-white/55"}`}
              >
                <Mail className="h-3.5 w-3.5" /> Emails ({emails.length})
              </button>
            </div>

            {tab === "guide" ? (
              <ol className="mt-3 flex flex-col gap-2.5">
                {STEPS.map(([title, body], i) => (
                  <li key={title} className="flex gap-3 rounded-2xl bg-white/[0.03] p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold">{i + 1}</span>
                    <span className="text-xs leading-relaxed text-white/70">
                      <span className="block text-sm font-semibold text-white">{title}</span>
                      {body}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {emails.length === 0 && <li className="text-xs text-white/50">Aucun email pour l'instant.</li>}
                {emails.map((e) => (
                  <li key={e.id}>
                    <details className="group rounded-2xl bg-white/[0.03] p-3">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-full bg-brand-400/15 px-2 py-0.5 font-semibold text-brand-200">
                              {KIND_LABELS[e.kind] ?? e.kind}
                            </span>
                            <span className={e.status === "sent" ? "text-emerald-300" : "text-amber-300"}>
                              {e.status === "sent" ? "Envoyé" : "Envoi…"}
                            </span>
                            <span className="text-white/35">
                              {new Date(e.createdAt).toLocaleString("fr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-sm font-semibold">{e.subject}</span>
                          <span className="block truncate text-xs text-white/45">à {e.to}</span>
                        </span>
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-white/40 transition group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap border-t border-white/10 pt-2 text-xs leading-relaxed text-white/70">{e.body}</p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recommencer la démo
            </button>
          </footer>
        </aside>
      )}
    </>
  );
}
