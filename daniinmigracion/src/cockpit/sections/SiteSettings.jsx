import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, KeyRound, Mail, Save, Send } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, Button, Card, Field, SectionTitle, inputClass, useToast } from "../ui";

/** Réglages du site (rubrique « Próximo live ») et vérification de l'email. */
export default function SiteSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mail, setMail] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api("/admin/settings")
      .then((res) => setSettings(res.settings))
      .catch((err) => toast(err.message, "error"));
    api("/admin/overview")
      .then((res) => setMail(res.mail))
      .catch(() => {});
  }, [toast]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api("/admin/settings", { method: "PUT", body: settings });
      setSettings(res.settings);
      toast("Cambios publicados en el sitio");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await api("/admin/mail/test", { method: "POST", body: { to: testTo } });
      toast(
        res.mode === "smtp"
          ? `Correo de prueba enviado a ${testTo}`
          : "Modo consola: el correo se guardó en storage/mails/ (no se envió)"
      );
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Sitio" subtitle="Controla lo que ven los visitantes y verifica el envío de correos." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          {settings && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <p className="font-display text-lg font-bold">Sección « Próximo live »</p>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, liveSectionEnabled: !settings.liveSectionEnabled })}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm"
                aria-pressed={settings.liveSectionEnabled}
              >
                <span className="flex items-center gap-2">
                  {settings.liveSectionEnabled ? <Eye className="h-4 w-4 text-emerald-300" /> : <EyeOff className="h-4 w-4 text-white/40" />}
                  {settings.liveSectionEnabled ? "Visible en el sitio" : "Oculta en el sitio"}
                </span>
                <span
                  className={`relative h-6 w-11 rounded-full transition ${settings.liveSectionEnabled ? "bg-emerald-500" : "bg-white/20"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      settings.liveSectionEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
              <Field label="Etiqueta de la sección">
                <input
                  className={inputClass}
                  maxLength={80}
                  required
                  value={settings.liveSectionTitle}
                  onChange={(e) => setSettings({ ...settings, liveSectionTitle: e.target.value })}
                />
              </Field>
              <Field label="Texto de presentación">
                <textarea
                  className={`${inputClass} min-h-[100px]`}
                  maxLength={400}
                  value={settings.liveSectionText}
                  onChange={(e) => setSettings({ ...settings, liveSectionText: e.target.value })}
                />
              </Field>
              <p className="text-xs text-white/40">
                El botón LIVE rojo aparece automáticamente en la cabecera del sitio cuando hay un live programado.
              </p>
              <Button type="submit" icon={Save} loading={saving}>
                Guardar y publicar
              </Button>
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <form onSubmit={sendTest} className="flex flex-col gap-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Mail className="h-5 w-5 text-brand-300" /> Correo de prueba
              </p>
              {mail && (
                <p className="text-sm text-white/60">
                  Modo actual:{" "}
                  {mail.mode === "smtp" ? <Badge tone="success">SMTP · {mail.host}</Badge> : <Badge tone="warning">Consola</Badge>}
                </p>
              )}
              <Field label="Enviar a">
                <input
                  type="email"
                  required
                  className={inputClass}
                  placeholder="tu@correo.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
              </Field>
              <Button type="submit" icon={Send} loading={testing} variant="ghost">
                Enviar prueba
              </Button>
              <p className="text-xs text-white/40">La configuración SMTP se hace en el archivo .env (ver README, sección « Live »).</p>
            </form>
          </Card>

          <Card className="flex flex-col gap-3 text-sm">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <KeyRound className="h-5 w-5 text-brand-300" /> Seguridad
            </p>
            <p className="text-white/60">
              Para cambiar la contraseña del cockpit, ejecuta en el servidor:
            </p>
            <code className="rounded-xl bg-black/40 px-3 py-2 text-xs text-brand-100">
              npm run cockpit:password -- "nueva-contraseña"
            </code>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5" /> Ver el sitio
              </a>
              <a href="/live" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5" /> Página del live
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
