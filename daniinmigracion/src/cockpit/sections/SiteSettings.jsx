import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Inbox, KeyRound, Mail, Save, Send, ShieldAlert } from "lucide-react";
import { api, apiFileUrl } from "../../lib/api";
import { Button, Card, Field, MailModeBadge, SectionTitle, inputClass, useToast } from "../ui";
import { formatDateTime } from "../../lib/time";

/** Réglages du site (rubrique « Próximo live ») et vérification de l'email. */
export default function SiteSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mail, setMail] = useState(null);
  const [defaultPassword, setDefaultPassword] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [outbox, setOutbox] = useState([]);

  const loadOutbox = () =>
    api("/admin/mail/outbox")
      .then((res) => setOutbox(res.mails))
      .catch(() => {});

  useEffect(() => {
    api("/admin/settings")
      .then((res) => setSettings(res.settings))
      .catch((err) => toast(err.message, "error"));
    api("/admin/overview")
      .then((res) => {
        setMail(res.mail);
        setDefaultPassword(res.defaultPassword);
      })
      .catch(() => {});
    loadOutbox();
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
        res.mode !== "console"
          ? `Correo de prueba enviado a ${testTo}`
          : "Modo consola: el correo aparece abajo en « Correos de prueba » (no se envió)"
      );
      loadOutbox();
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
                  <MailModeBadge mail={mail} />
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
              <p className="text-xs text-white/40">
                El envío real se configura en Cloudflare (variables MAIL_MODE, SMTP… ver README, sección « Live »).
              </p>
            </form>
          </Card>

          <Card className="flex flex-col gap-3 text-sm">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <KeyRound className="h-5 w-5 text-brand-300" /> Seguridad
            </p>
            {defaultPassword && (
              <p className="flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-red-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Usas la contraseña de demostración. Cámbiala antes de anunciar el live.
              </p>
            )}
            <p className="text-white/60">
              Para cambiar la contraseña del cockpit, ejecuta en el proyecto (se guarda cifrada en Cloudflare):
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

          {mail?.mode === "console" && (
            <Card className="flex flex-col gap-3 text-sm">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Inbox className="h-5 w-5 text-brand-300" /> Correos de prueba
              </p>
              <p className="text-white/60">
                Modo consola: estos son los últimos correos que se habrían enviado (confirmaciones, recordatorios,
                envíos manuales). Nadie los recibe.
              </p>
              {outbox.length === 0 ? (
                <p className="text-white/40">Todavía no hay ninguno.</p>
              ) : (
                <ul className="flex max-h-72 flex-col divide-y divide-white/5 overflow-y-auto">
                  {outbox.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.subject}</span>
                        <span className="block truncate text-xs text-white/50">
                          {m.toEmail} · {formatDateTime(m.createdAt)}
                        </span>
                      </span>
                      <a
                        href={apiFileUrl(`/admin/mail/outbox/${m.id}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold"
                      >
                        Ver
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
