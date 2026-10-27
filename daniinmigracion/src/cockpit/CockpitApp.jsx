import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  Film,
  LayoutDashboard,
  Loader2,
  LogOut,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { currentPath, navigate } from "../lib/nav";
import { formatDuration, useNow } from "../lib/time";
import LoginPage from "./LoginPage";
import { CockpitProvider, useCockpit } from "./CockpitContext";
import { ToastProvider } from "./ui";
import { CockpitLangProvider, LangSwitch, useLang } from "./i18n";
import logoUrl from "../assets/logo-dani.jpg";
import Overview from "./sections/Overview";
import LiveStudio from "./sections/LiveStudio";
import Schedule from "./sections/Schedule";
import Registrants from "./sections/Registrants";
import Recordings from "./sections/Recordings";
import SiteSettings from "./sections/SiteSettings";

/** Sections du tableau de bord (la section active est dans l'ancre de l'URL). */
const SECTIONS = [
  { id: "resumen", label: ["Resumen", "Résumé"], icon: LayoutDashboard, component: Overview },
  { id: "directo", label: ["Directo", "Direct"], icon: Radio, component: LiveStudio },
  { id: "programacion", label: ["Programación", "Programmation"], icon: CalendarClock, component: Schedule },
  { id: "inscritos", label: ["Inscritos", "Inscrits"], icon: Users, component: Registrants },
  { id: "grabaciones", label: ["Grabaciones", "Enregistrements"], icon: Film, component: Recordings },
  { id: "sitio", label: ["Sitio", "Site"], icon: Settings2, component: SiteSettings },
];

function goToLogin() {
  const next = encodeURIComponent(currentPath() + window.location.hash);
  navigate(`/cockpit/login?next=${next}`, { replace: true });
}

export default function CockpitApp() {
  const path = currentPath().replace(/\/+$/, "");
  return <CockpitLangProvider>{path === "/cockpit/login" ? <LoginPage /> : <AuthGate />}</CockpitLangProvider>;
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
      <div className="cockpit-theme grid min-h-screen place-items-center bg-site-bg">
        <Loader2 className="h-8 w-8 animate-spin text-site-red" />
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
  const { t } = useLang();
  const section = useHashSection();
  const current = SECTIONS.find((s) => s.id === section);
  const Section = current.component;

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    navigate("/cockpit/login", { replace: true });
  };

  const tabsRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Mobile : l'onglet actif reste visible dans la barre d'onglets défilante.
    const tab = tabsRef.current?.querySelector('[aria-current="page"]');
    if (tab) {
      const nav = tabsRef.current;
      const a = tab.getBoundingClientRect();
      const b = nav.getBoundingClientRect();
      nav.scrollLeft += a.left - b.left - (b.width - a.width) / 2;
    }
  }, [section]);

  return (
    <div className="cockpit-theme min-h-[100dvh] bg-site-bg text-site-ink lg:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-site-line bg-white lg:flex">
        <div className="site-stripe" />
        <div className="flex min-h-0 flex-1 flex-col p-5">
          <Brand />
          <nav className="mt-8 flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <NavLink key={s.id} item={s} active={s.id === section} />
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-site-line pt-4">
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-site-gray">{t("Idioma", "Langue")}</span>
              <LangSwitch />
            </div>
            <ExternalNav href="/" label={t("Ver el sitio", "Voir le site")} />
            <ExternalNav href="/live" label={t("Página del live", "Page du live")} />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-site-text transition hover:bg-site-red-l hover:text-site-red"
            >
              <LogOut className="h-4 w-4" /> {t("Cerrar sesión", "Se déconnecter")} ({admin.username})
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* En-tête (mobile + état du live toujours visible) */}
        <header className="sticky top-0 z-40 border-b border-site-line bg-white/95 backdrop-blur-xl">
          <div className="site-stripe lg:hidden" />
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-site-ink lg:block">{t(...current.label)}</p>
            <div className="flex items-center gap-2">
              <LivePill />
              <LangSwitch className="lg:hidden" />
              <button
                type="button"
                onClick={logout}
                aria-label={t("Cerrar sesión", "Se déconnecter")}
                className="grid h-9 w-9 place-items-center rounded-full border border-site-line bg-white text-site-text lg:hidden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Onglets (mobile / tablette) */}
          <nav ref={tabsRef} className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={s.id === section ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    s.id === section
                      ? "bg-site-red text-white shadow-site-red"
                      : "border border-site-line bg-white text-site-text hover:text-site-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t(...s.label)}
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
    <a href="#resumen" className="flex items-center gap-3">
      <img
        src={logoUrl}
        alt="Dani Inmigración"
        className={`${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 rounded-full bg-white shadow-[0_3px_14px_rgba(0,0,0,0.12)]`}
      />
      <span className={compact ? "hidden leading-tight sm:block" : "leading-tight"}>
        <span className="block text-[15px] font-extrabold tracking-tight text-site-ink">Dani Inmigración</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-site-gray">
          {compact ? "Cockpit" : "Cockpit · Lives"}
        </span>
      </span>
    </a>
  );
}

function NavLink({ item, active }) {
  const { t } = useLang();
  const Icon = item.icon;
  return (
    <a
      href={`#${item.id}`}
      className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red"
          : "text-site-text hover:bg-site-bg hover:text-site-ink"
      }`}
    >
      <Icon className="h-4 w-4" /> {t(...item.label)}
    </a>
  );
}

function ExternalNav({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-site-text transition hover:bg-site-bg hover:text-site-teal-d"
    >
      <ExternalLink className="h-4 w-4" /> {label}
    </a>
  );
}

/** Indicateur permanent : en direct (durée, viewers, cœurs) ou hors ligne. */
function LivePill() {
  const { live, stats, offset, connected } = useCockpit();
  const { t } = useLang();
  const now = useNow(1000, { enabled: Boolean(live), offset });

  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("Conectando…", "Connexion…")}
      </span>
    );
  }
  if (!live) {
    return (
      <span className="whitespace-nowrap rounded-full border border-site-line bg-white px-3 py-1.5 text-xs font-semibold text-site-gray">
        {t("Sin directo", "Hors direct")}
      </span>
    );
  }
  return (
    <a
      href="#directo"
      className="flex items-center gap-2 whitespace-nowrap rounded-full bg-site-red px-3.5 py-1.5 text-xs font-bold text-white shadow-site-red"
    >
      <span className="live-blink">
        ● <span className="sm:hidden">LIVE</span>
        <span className="hidden sm:inline">{t("EN DIRECTO", "EN DIRECT")}</span>
      </span>
      <span className="font-mono tabular-nums">{formatDuration(now - Date.parse(live.startedAt))}</span>
      <span className="hidden sm:inline">· 👁 {stats.viewers} · ❤️ {stats.hearts}</span>
    </a>
  );
}
