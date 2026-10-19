import { useEffect, useState } from "react";
import { Eye, EyeOff, Globe2, LockKeyhole, LogIn } from "lucide-react";
import { api } from "../lib/api";
import { Button, inputClass } from "./ui";

/** Destination après connexion (uniquement une page du cockpit : pas de redirection ouverte). */
function nextUrl() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && /^\/cockpit(\/|$|\?|#)/.test(next) && !next.startsWith("/cockpit/login") ? next : "/cockpit";
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Acceso · Cockpit Dani Inmigración";
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/login", { method: "POST", body: { username, password } });
      window.location.replace(nextUrl());
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(ellipse_at_top,#16224a,#0b1220)] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 shadow-card backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Globe2 className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-display text-base font-extrabold leading-tight">
              Dani<span className="text-brand-300">Inmigración</span>
            </p>
            <p className="text-xs text-white/50">Cockpit de lives</p>
          </div>
        </div>

        <h1 className="mt-7 flex items-center gap-2 font-display text-2xl font-extrabold">
          <LockKeyhole className="h-5 w-5 text-brand-300" /> Iniciar sesión
        </h1>

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
            Usuario
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
          <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
            Contraseña
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
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} icon={LogIn} className="mt-2 w-full py-3">
            Entrar
          </Button>
        </div>

        <a href="/" className="mt-6 block text-center text-xs text-white/40 hover:text-white/70">
          ← Volver al sitio
        </a>
      </form>
    </div>
  );
}
