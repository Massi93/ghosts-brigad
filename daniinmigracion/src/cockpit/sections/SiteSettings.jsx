import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Inbox, KeyRound, Mail, Save, Send, ShieldAlert } from "lucide-react";
import { api, apiFileUrl } from "../../lib/api";
import { Button, Card, Field, MailModeBadge, SectionTitle, inputClass, useToast } from "../ui";
import { formatDateTime } from "../../lib/time";
import { useLang } from "../i18n";

/** Réglages du site (rubrique « Próximo live ») et vérification de l'email. */
export default function SiteSettings() {
  const { t, locale } = useLang();
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
      toast(t("Cambios publicados en el sitio", "Modifications publiées sur le site"));
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
      const res = await api("/admin/mail/test", { method: "POST", body: { to: testTo, lang: locale } });
      toast(
        res.mode !== "console"
          ? t(`Correo de prueba enviado a ${testTo}`, `E-mail de test envoyé à ${testTo}`)
          : t(
              "Modo consola: el correo aparece abajo en « Correos de prueba » (no se envió)",
              "Mode console : l'e-mail apparaît plus bas dans « E-mails de test » (rien n'est envoyé)"
            )
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
      <SectionTitle
        title={t("Sitio", "Site")}
        subtitle={t(
          "Controla lo que ven los visitantes y verifica el envío de correos.",
          "Gérez ce que voient les visiteurs et vérifiez l'envoi des e-mails."
        )}
      />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          {settings && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <p className="font-display text-lg font-bold">{t("Sección « Próximo live »", "Rubrique « Prochain live »")}</p>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, liveSectionEnabled: !settings.liveSectionEnabled })}
                className="flex items-center justify-between rounded-2xl border border-site-line bg-site-bg px-4 py-3 text-left text-sm"
                aria-pressed={settings.liveSectionEnabled}
              >
                <span className="flex items-center gap-2">
                  {settings.liveSectionEnabled ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-site-gray" />}
                  {settings.liveSectionEnabled
                    ? t("Visible en el sitio", "Visible sur le site")
                    : t("Oculta en el sitio", "Masquée sur le site")}
                </span>
                <span
                  className={`relative h-6 w-11 rounded-full transition ${settings.liveSectionEnabled ? "bg-emerald-500" : "bg-site-line"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      settings.liveSectionEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
              <Field
                label={t("Etiqueta de la sección", "Étiquette de la rubrique")}
                hint={t(
                  "Si dejas « Próximo live », el sitio la traduce sola (francés, árabe).",
                  "Si vous laissez « Próximo live », le site la traduit tout seul (français, arabe)."
                )}
              >
                <input
                  className={inputClass}
                  maxLength={80}
                  required
                  value={settings.liveSectionTitle}
                  onChange={(e) => setSettings({ ...settings, liveSectionTitle: e.target.value })}
                />
              </Field>
              <Field
                label={t("Texto de presentación", "Texte de présentation")}
                hint={t(
                  "El texto por defecto se traduce solo en el sitio; un texto personalizado se muestra tal cual.",
                  "Le texte par défaut est traduit automatiquement sur le site ; un texte personnalisé s'affiche tel quel."
                )}
              >
                <textarea
                  className={`${inputClass} min-h-[100px]`}
                  maxLength={400}
                  value={settings.liveSectionText}
                  onChange={(e) => setSettings({ ...settings, liveSectionText: e.target.value })}
                />
              </Field>
              <p className="text-xs text-site-gray">
                {t(
                  "El botón LIVE rojo aparece automáticamente en la cabecera del sitio cuando hay un live programado.",
                  "Le bouton LIVE rouge apparaît automatiquement en haut du site dès qu'un live est programmé."
                )}
              </p>
              <Button type="submit" icon={Save} loading={saving}>
                {t("Guardar y publicar", "Enregistrer et publier")}
              </Button>
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <form onSubmit={sendTest} className="flex flex-col gap-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Mail className="h-5 w-5 text-site-red" /> {t("Correo de prueba", "E-mail de test")}
              </p>
              {mail && (
                <p className="text-sm text-site-text">
                  {t("Modo actual:", "Mode actuel :")}{" "}
                  <MailModeBadge mail={mail} />
                </p>
              )}
              <Field label={t("Enviar a", "Envoyer à")}>
                <input
                  type="email"
                  required
                  className={inputClass}
                  placeholder={t("tu@correo.com", "vous@exemple.com")}
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
              </Field>
              <Button type="submit" icon={Send} loading={testing} variant="ghost">
                {t("Enviar prueba", "Envoyer un test")}
              </Button>
              <p className="text-xs text-site-gray">
                {t(
                  "El envío real se configura en Cloudflare (variables MAIL_MODE, SMTP… ver README, sección « Live »).",
                  "L'envoi réel se configure chez Cloudflare (variables MAIL_MODE, SMTP… voir README, section « Live »)."
                )}
              </p>
            </form>
          </Card>

          <Card className="flex flex-col gap-3 text-sm">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <KeyRound className="h-5 w-5 text-site-red" /> {t("Seguridad", "Sécurité")}
            </p>
            {defaultPassword && (
              <p className="flex items-start gap-2 rounded-xl bg-site-red-l px-3 py-2 text-site-red-d">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {t(
                  "Usas la contraseña de demostración. Cámbiala antes de anunciar el live.",
                  "Vous utilisez le mot de passe de démonstration. Changez-le avant d'annoncer le live."
                )}
              </p>
            )}
            <p className="text-site-text">
              {t(
                "Para cambiar la contraseña del cockpit, ejecuta en el proyecto (se guarda cifrada en Cloudflare):",
                "Pour changer le mot de passe du cockpit, lancez dans le projet (il est conservé chiffré chez Cloudflare) :"
              )}
            </p>
            <code className="rounded-xl border border-site-line bg-site-bg px-3 py-2 font-mono text-xs text-site-ink">
              npm run cockpit:password -- "{t("nueva-contraseña", "nouveau-mot-de-passe")}"
            </code>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-site-line bg-white px-3.5 py-2 text-xs font-semibold hover:text-site-teal-d">
                <ExternalLink className="h-3.5 w-3.5" /> {t("Ver el sitio", "Voir le site")}
              </a>
              <a href="/live" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-site-line bg-white px-3.5 py-2 text-xs font-semibold hover:text-site-teal-d">
                <ExternalLink className="h-3.5 w-3.5" /> {t("Página del live", "Page du live")}
              </a>
            </div>
          </Card>

          {mail?.mode === "console" && (
            <Card className="flex flex-col gap-3 text-sm">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Inbox className="h-5 w-5 text-site-red" /> {t("Correos de prueba", "E-mails de test")}
              </p>
              <p className="text-site-text">
                {t(
                  "Modo consola: estos son los últimos correos que se habrían enviado (confirmaciones, recordatorios, envíos manuales). Nadie los recibe.",
                  "Mode console : voici les derniers e-mails qui auraient été envoyés (confirmations, rappels, envois manuels). Personne ne les reçoit."
                )}
              </p>
              {outbox.length === 0 ? (
                <p className="text-site-gray">{t("Todavía no hay ninguno.", "Aucun pour l'instant.")}</p>
              ) : (
                <ul className="flex max-h-72 flex-col divide-y divide-site-line overflow-y-auto">
                  {outbox.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{m.subject}</span>
                        <span className="block truncate text-xs text-site-gray">
                          {m.toEmail} · {formatDateTime(m.createdAt, locale)}
                        </span>
                      </span>
                      <a
                        href={apiFileUrl(`/admin/mail/outbox/${m.id}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-full border border-site-line px-3 py-1 text-xs font-semibold hover:text-site-teal-d"
                      >
                        {t("Ver", "Voir")}
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
