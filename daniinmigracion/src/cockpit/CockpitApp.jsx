import { useEffect, useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  Film,
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { formatDuration, useNow } from "../lib/time";
import LoginPage from "./LoginPage";
import { CockpitProvider, useCockpit } from "./CockpitContext";
import { ToastProvider } from "./ui";
import Overview from "./sections/Overview";
import LiveStudio from "./sections/LiveStudio";
import Schedule from "./sections/Schedule";
import Registrants from "./sections/Registrants";
import Recordings from "./sections/Recordings";
import SiteSettings from "./sections/SiteSettings";

/** Sections du tableau de bord (la section active est dans l'ancre de l'URL). */
const SECTIONS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard, component: Overview },
  { id: "directo", label: "Directo", icon: Radio, component: LiveStudio },
  { id: "programacion", label: "Programación", icon: CalendarClock, component: Schedule },
  { id: "inscritos", label: "Inscritos", icon: Users, component: Registrants },
  { id: "grabaciones", label: "Grabaciones", icon: Film, component: Recordings },
  { id: "sitio", label: "Sitio", icon: Settings2, component: SiteSettings },
];

function goToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.hash);
  window.location.replace(`/cockpit/login?next=${next}`);
}

export default function CockpitApp() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/cockpit/login") return <LoginPage />;
  return <AuthGate />;
}

/** Vérifie la session avant d'afficher le tableau de bord. */
function AuthGate() {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    document.title = "Cockpit · Dani Inmigración";
    setUnauthorizedHandler(goToLogin);
    api("/auth/me")
      .then((res) => setAdmin(res.admin))
      .catch(goToLogin);
  }, []);

  if (!admin) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <CockpitProvider>
        <Dashboard admin={admin} />
      </CockpitProvider>
    </ToastProvider>
  );
}

function useHashSection() {
  const read = () => {
    const id = window.location.hash.replace("#", "").split("?")[0];
    return SECTIONS.some((s) => s.id === id) ? id : "resumen";
  };
  const [section, setSection] = useState(read);
  useEffect(() => {
    const onHash = () => setSection(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return section;
}

function Dashboard({ admin }) {
  const section = useHashSection();
  const current = SECTIONS.find((s) => s.id === section);
  const Section = current.component;

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.replace("/cockpit/login");
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  return (
    <div className="min-h-[100dvh] bg-[#0a101d] text-white lg:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-ink/80 p-5 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <NavLink key={s.id} item={s} active={s.id === section} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <ExternalNav href="/" label="Ver el sitio" />
          <ExternalNav href="/live" label="Página del live" />
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión ({admin.username})
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* En-tête (mobile + état du live toujours visible) */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a101d]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <p className="hidden font-display text-lg font-bold lg:block">{current.label}</p>
            <div className="flex items-center gap-2">
              <LivePill />
              <button
                type="button"
                onClick={logout}
                aria-label="Cerrar sesión"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 lg:hidden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Onglets (mobile / tablette) */}
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    s.id === section ? "bg-brand-500 text-white" : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {s.label}
                </a>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 lg:px-8 lg:py-8">
          <Section />
        </main>
      </div>
    </div>
  );
}

function Brand({ compact = false }) {
  return (
    <a href="#resumen" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
        <Globe2 className="h-5 w-5 text-white" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-extrabold">
          Dani<span className="text-brand-300">Inmigración</span>
        </span>
        {!compact && <span className="block text-xs text-white/50">Cockpit de lives</span>}
      </span>
    </a>
  );
}

function NavLink({ item, active }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.id}`}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-brand-500 text-white shadow-glow" : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" /> {item.label}
    </a>
  );
}

function ExternalNav({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
    >
      <ExternalLink className="h-4 w-4" /> {label}
    </a>
  );
}

/** Indicateur permanent : en direct (durée, viewers, cœurs) ou hors ligne. */
function LivePill() {
  const { live, stats, offset, connected } = useCockpit();
  const now = useNow(1000, { enabled: Boolean(live), offset });

  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando…
      </span>
    );
  }
  if (!live) {
    return <span className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50">Sin directo</span>;
  }
  return (
    <a
      href="#directo"
      className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_-4px_rgba(255,45,85,0.8)]"
    >
      <span className="live-blink">
        ● <span className="sm:hidden">LIVE</span>
        <span className="hidden sm:inline">EN DIRECTO</span>
      </span>
      <span className="font-mono tabular-nums">{formatDuration(now - Date.parse(live.startedAt))}</span>
      <span className="hidden sm:inline">· 👁 {stats.viewers} · ❤️ {stats.hearts}</span>
    </a>
  );
}
