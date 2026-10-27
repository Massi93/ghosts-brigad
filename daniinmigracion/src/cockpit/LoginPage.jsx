import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn } from "lucide-react";
import { api } from "../lib/api";
import { currentSearch, navigate } from "../lib/nav";
import { Button, inputClass } from "./ui";
import { LangSwitch, useLang } from "./i18n";
import logoUrl from "../assets/logo-dani.jpg";

/** Destination après connexion (uniquement une page du cockpit : pas de redirection ouverte). */
function nextUrl() {
  const next = new URLSearchParams(currentSearch()).get("next");
  const target = next && /^\/cockpit(\/|$|\?|#)/.test(next) && !next.startsWith("/cockpit/login") ? next : "/cockpit";
  // La section demandée (#inscritos…) n'arrive pas au serveur : elle est restée dans l'adresse de cette page.
  const hash = window.location.hash;
  return !target.includes("#") && /^#[\w-]+$/.test(hash) ? target + hash : target;
}

export default function LoginPage() {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("Acceso · Cockpit Dani Inmigración", "Connexion · Cockpit Dani Inmigración");
  }, [t]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/login", { method: "POST", body: { username, password } });
      navigate(nextUrl(), { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="cockpit-theme flex min-h-[100dvh] flex-col bg-[radial-gradient(ellipse_at_top_left,rgba(0,180,180,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(241,191,0,0.12),transparent_45%)] bg-site-bg text-site-ink">
      <div className="site-stripe" />
      <div className="flex justify-end px-4 pt-4">
        <LangSwitch />
      </div>
      <div className="grid flex-1 place-items-center px-4 pb-10 pt-4">
        <form
          onSubmit={submit}
          className="relative w-full max-w-sm overflow-hidden rounded-[22px] border border-site-line bg-white p-7 shadow-[0_24px_64px_rgba(15,16,32,0.10)]"
        >
          <div className="site-line-accent absolute left-1/2 top-0 h-[3px] w-3/5 -translate-x-1/2 rounded-b" />
          <div className="flex flex-col items-center text-center">
            <img src={logoUrl} alt="Dani Inmigración" className="h-20 w-20 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.12)]" />
            <p className="mt-3 text-lg font-extrabold tracking-tight">Dani Inmigración</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-site-gray">Cockpit · Lives</p>
          </div>

          <h1 className="mt-7 flex items-center justify-center gap-2 font-display text-xl font-black">
            <LockKeyhole className="h-5 w-5 text-site-red" /> {t("Iniciar sesión", "Connexion")}
          </h1>

          <div className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-site-ink">
              {t("Usuario", "Identifiant")}
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-site-ink">
              {t("Contraseña", "Mot de passe")}
              <div className="relative">
                <input
                  className={`${inputClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? t("Ocultar contraseña", "Masquer le mot de passe")
                      : t("Mostrar contraseña", "Afficher le mot de passe")
                  }
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-site-gray hover:text-site-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-[10px] bg-site-red-l px-3 py-2 text-sm font-semibold text-site-red-d">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} icon={LogIn} className="mt-2 w-full py-3.5 uppercase tracking-wider">
              {t("Entrar", "Se connecter")}
            </Button>
          </div>

          <a href="/" className="mt-6 block text-center text-xs font-semibold text-site-gray hover:text-site-red">
            ← {t("Volver al sitio", "Retour au site")}
          </a>
        </form>
      </div>
    </div>
  );
}
