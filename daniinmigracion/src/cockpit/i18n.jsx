/**
 * Langue du cockpit : espagnol ou français (bouton ES / FR).
 *
 * Usage dans un composant :
 *   const { t, locale } = useLang();
 *   t("Texto en español", "Texte en français")
 *
 * Le choix est gardé dans le navigateur ; par défaut, la langue du site
 * (localStorage « lang ») ou celle du navigateur.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setMessagesLang } from "../lib/serverMessages";

const STORAGE_KEY = "cockpit_lang";
export const COCKPIT_LANGS = ["es", "fr"];

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (COCKPIT_LANGS.includes(saved)) return saved;
    if (localStorage.getItem("lang") === "fr") return "fr";
  } catch {
    // stockage indisponible
  }
  return (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "es";
}

const LangContext = createContext({ lang: "es", locale: "es", setLang: () => {}, t: (es) => es });

export function CockpitLangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  // Appliqué immédiatement (avant le premier appel à l'API) puis à chaque changement.
  setMessagesLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      locale: lang,
      setLang(next) {
        if (!COCKPIT_LANGS.includes(next)) return;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // stockage indisponible
        }
        setLangState(next);
      },
      t: (es, fr) => (lang === "fr" ? fr : es),
    }),
    [lang]
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Bouton ES / FR. */
export function LangSwitch({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Idioma / Langue"
      className={`inline-flex items-center rounded-full border border-site-line bg-white p-0.5 text-[11px] font-bold ${className}`}
    >
      {COCKPIT_LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wider transition ${
            lang === code ? "bg-site-ink text-white" : "text-site-gray hover:text-site-ink"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
