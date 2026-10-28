import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Download, Mail, Search, Send, Trash2, Users, XCircle } from "lucide-react";
import { api, apiFileUrl } from "../../lib/api";
import { formatDateTime, formatLiveDate } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { useLang } from "../i18n";
import { Badge, Button, Card, EmptyState, Field, SectionTitle, inputClass, useToast } from "../ui";

function kindLabel(kind, t) {
  return (
    {
      confirmation: t("Confirmación", "Confirmation"),
      reminder_3h: t("Recordatorio 3 h", "Rappel 3 h"),
      reminder_5m: t("Recordatorio 5 min", "Rappel 5 min"),
      manual: t("Envío manual", "Envoi manuel"),
    }[kind] ?? "Email"
  );
}

/** Message pré-rempli (langue du cockpit). {nombre} = prénom de chaque inscrit. */
function defaultMessage(next, lang, locale) {
  const date = next?.scheduledAt ? formatLiveDate(next.scheduledAt, locale) : null;
  if (lang === "fr") {
    return `Bonjour {nombre},\n\nNous vous rappelons que notre prochain live « ${next?.title ?? "Live avec Dani"} » aura lieu ${date ? `le ${date}` : "très bientôt"}.\n\nPréparez vos questions : on se retrouve en direct !\n\nDani`;
  }
  return `Hola {nombre}:\n\nTe recordamos que nuestro próximo live «${next?.title ?? "Live con Dani"}» será ${date ? `el ${date}` : "muy pronto"}.\n\nPrepara tus preguntas: ¡nos vemos en directo!\n\nDani`;
}

/** Statut d'envoi affiché pour un inscrit. */
/** Langue de l'inscrit (celle de ses emails). */
function LangBadge({ lang }) {
  return (
    <span className="inline-block rounded-md bg-site-bg px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-site-gray">
      {lang || "es"}
    </span>
  );
}

function EmailStatus({ status, kind, error }) {
  const { t } = useLang();
  if (!status) return <span className="text-xs text-site-gray/70">—</span>;
  const label = kindLabel(kind, t);
  if (status === "sent") {
    return (
      <Badge tone="success" title={label}>
        <CheckCircle2 className="h-3 w-3" /> {t("Enviado", "Envoyé")}
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge tone="danger" title={error || label}>
        <XCircle className="h-3 w-3" /> {t("Error", "Erreur")}
      </Badge>
    );
  }
  return (
    <Badge tone="warning" title={label}>
      <Clock className="h-3 w-3" /> {t("Enviando…", "Envoi…")}
    </Badge>
  );
}

export default function Registrants() {
  const { next, live, onMail } = useCockpit();
  const { t, lang, locale } = useLang();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [batch, setBatch] = useState(null); // { batchId, total, sent, failed, done }
  // Événements reçus par lot. Le WebSocket peut annoncer les premiers envois
  // AVANT la réponse HTTP qui donne le batchId : on les mémorise ici.
  const batchEvents = useRef(new Map()); // batchId -> { progress: Map<registrationId, event>, done }

  const load = useCallback(() => {
    api("/admin/registrations")
      .then(({ registrations }) => setRows(registrations))
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  // Mode d'envoi : en mode console (test), rien ne part réellement.
  const [mailMode, setMailMode] = useState(null);
  useEffect(() => {
    api("/admin/overview")
      .then((o) => setMailMode(o.mail?.mode ?? null))
      .catch(() => {});
  }, []);
  const testMode = mailMode === "console";
  const testModeRef = useRef(false);
  testModeRef.current = testMode;

  // Message pré-rempli avec le prochain live (et réécrit au changement de langue s'il n'a pas été modifié).
  const target = live ?? next;
  const prefill = useRef({ subject: "", message: "" });
  useEffect(() => {
    const subjectText =
      lang === "fr"
        ? `Rappel : ${target?.title ?? "notre prochain live"}`
        : `Recordatorio: ${target?.title ?? "nuestro próximo live"}`;
    const messageText = defaultMessage(target, lang, locale);
    // Les fonctions passées à setState s'exécutent plus tard : on garde l'ancien texte ici.
    const previous = prefill.current;
    prefill.current = { subject: subjectText, message: messageText };
    setSubject((s) => (!s || s === previous.subject ? subjectText : s));
    setMessage((m) => (!m || m === previous.message ? messageText : m));
  }, [target, lang, locale]);

  const eventsFor = (batchId) => {
    if (!batchEvents.current.has(batchId)) batchEvents.current.set(batchId, { progress: new Map(), done: null });
    return batchEvents.current.get(batchId);
  };

  /** Compteurs d'un lot à partir des événements reçus. */
  const countOf = (entry) => {
    let sent = 0;
    let failed = 0;
    for (const e of entry.progress.values()) {
      if (e.status === "sent") sent += 1;
      else if (e.status === "failed") failed += 1;
    }
    return { sent, failed, done: Boolean(entry.done) };
  };

  // Statuts d'envoi en temps réel.
  useEffect(
    () =>
      onMail((type, data) => {
        const entry = eventsFor(data.batchId);
        if (type === "progress") {
          entry.progress.set(data.registrationId, data);
          setRows((list) =>
            list.map((r) =>
              r.id === data.registrationId
                ? { ...r, lastEmail: { kind: "manual", status: data.status, error: data.error, at: data.sentAt } }
                : r
            )
          );
        } else if (type === "done") {
          entry.done = data;
          toast(
            t(
              `Envío terminado: ${data.sent} enviados${data.failed ? `, ${data.failed} con error` : ""}${
                testModeRef.current ? " (modo prueba: nadie los recibe)" : ""
              }`,
              `Envoi terminé : ${data.sent} envoyé(s)${data.failed ? `, ${data.failed} en erreur` : ""}${
                testModeRef.current ? " (mode test : personne ne les reçoit)" : ""
              }`
            ),
            data.failed ? "error" : "success"
          );
        }
        setBatch((b) => (b && b.batchId === data.batchId ? { ...b, ...countOf(entry) } : b));
      }),
    [onMail, toast, t]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.firstName} ${r.lastName} ${r.email}`.toLowerCase().includes(q));
  }, [rows, query]);

  const selectable = filtered.filter((r) => !r.unsubscribedAt);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const activeCount = rows.filter((r) => !r.unsubscribedAt).length;

  const toggle = (id) =>
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (allSelected) selectable.forEach((r) => nextSet.delete(r.id));
      else selectable.forEach((r) => nextSet.add(r.id));
      return nextSet;
    });

  const send = async () => {
    const ids = [...selected];
    if (!ids.length) return toast(t("Marca al menos un destinatario", "Cochez au moins un destinataire"), "error");
    if (!window.confirm(t(`¿Enviar este correo a ${ids.length} inscrito(s)?`, `Envoyer cet e-mail à ${ids.length} inscrit(s) ?`))) return;
    setSending(true);
    try {
      const res = await api("/admin/notify", {
        method: "POST",
        body: { registrationIds: ids, subject, message },
      });
      const entry = eventsFor(res.batchId);
      const counts = countOf(entry);
      setBatch({ batchId: res.batchId, total: res.total, ...counts, done: counts.done || res.total === 0 });
      // Statut « en cours » sur les lignes dont l'envoi n'est pas encore annoncé.
      const pending = new Set(res.recipients.map((r) => r.registrationId));
      setRows((list) =>
        list.map((r) =>
          pending.has(r.id) && !entry.progress.has(r.id)
            ? { ...r, lastEmail: { kind: "manual", status: "pending" } }
            : r
        )
      );
      setSelected(new Set());
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const remove = async (r) => {
    if (
      !window.confirm(
        t(
          `¿Eliminar a ${r.firstName} ${r.lastName} (${r.email})? Esta acción es definitiva.`,
          `Supprimer ${r.firstName} ${r.lastName} (${r.email}) ? Cette action est définitive.`
        )
      )
    )
      return;
    try {
      await api(`/admin/registrations/${r.id}`, { method: "DELETE" });
      setRows((list) => list.filter((x) => x.id !== r.id));
      setSelected((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(r.id);
        return nextSet;
      });
      toast(t("Inscrito eliminado", "Inscrit supprimé"));
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <SectionTitle
        title={t("Inscritos", "Inscrits")}
        subtitle={t(`${activeCount} activos · ${rows.length} en total`, `${activeCount} actifs · ${rows.length} au total`)}
        actions={
          <a
            href={apiFileUrl(`/admin/registrations.csv?lang=${lang}`)}
            className="inline-flex items-center gap-2 rounded-full border border-site-line bg-white px-5 py-2.5 text-sm font-bold text-site-ink transition hover:border-site-teal hover:text-site-teal-d"
          >
            <Download className="h-4 w-4" /> {t("Exportar CSV", "Exporter en CSV")}
          </a>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        {/* Liste */}
        <Card className="min-w-0 p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-site-line px-5 py-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={!selectable.length}
                className="h-4 w-4 accent-site-red"
              />
              {t("Seleccionar todo", "Tout sélectionner")}
            </label>
            <Badge tone="info">
              {t(
                `${selected.size} seleccionado${selected.size === 1 ? "" : "s"}`,
                `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
              )}
            </Badge>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-site-gray/70" />
              <input
                className={`${inputClass} py-2 pl-9`}
                placeholder={t("Buscar nombre o email", "Rechercher un nom ou un e-mail")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={rows.length ? t("Sin resultados", "Aucun résultat") : t("Todavía no hay inscritos", "Pas encore d'inscrits")}
              text={
                rows.length
                  ? null
                  : t(
                      "Las inscripciones del formulario « Próximo live » aparecerán aquí.",
                      "Les inscriptions du formulaire « Prochain live » apparaîtront ici."
                    )
              }
            />
          ) : (
            <>
              {/* Tableau (écrans larges) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-site-gray">
                    <tr>
                      <th className="w-10 px-5 py-3" />
                      <th className="px-3 py-3 font-medium">{t("Nombre · inscripción", "Nom · inscription")}</th>
                      <th className="px-3 py-3 font-medium">Email</th>
                      <th className="px-3 py-3 font-medium">{t("Último envío", "Dernier envoi")}</th>
                      <th className="w-10 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-site-line">
                    {filtered.map((r) => (
                      <tr key={r.id} className={r.unsubscribedAt ? "opacity-50" : ""}>
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            disabled={Boolean(r.unsubscribedAt)}
                            aria-label={`${t("Seleccionar", "Sélectionner")} ${r.email}`}
                            className="h-4 w-4 accent-site-red"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <span className="block max-w-[12rem] truncate font-medium" title={`${r.firstName} ${r.lastName}`}>
                            {r.firstName} {r.lastName}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-site-gray">
                            <LangBadge lang={r.lang} /> {formatDateTime(r.createdAt, locale)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-site-text">
                          <span className="block max-w-[13rem] truncate 2xl:max-w-[18rem]" title={r.email}>
                            {r.email}
                          </span>
                          {r.unsubscribedAt && <Badge className="mt-1">{t("Baja", "Désinscrit")}</Badge>}
                        </td>
                        <td className="px-3 py-3">
                          <EmailStatus {...(r.lastEmail ?? {})} />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => remove(r)}
                            aria-label={t("Eliminar", "Supprimer")}
                            className="rounded-lg p-1.5 text-site-gray hover:bg-site-bg hover:text-site-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartes (mobile) */}
              <ul className="divide-y divide-site-line md:hidden">
                {filtered.map((r) => (
                  <li key={r.id} className={`flex items-start gap-3 px-5 py-3 ${r.unsubscribedAt ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      disabled={Boolean(r.unsubscribedAt)}
                      aria-label={`${t("Seleccionar", "Sélectionner")} ${r.email}`}
                      className="mt-1 h-4 w-4 accent-site-red"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="truncate text-sm text-site-text">{r.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-site-gray">
                        {formatDateTime(r.createdAt, locale)}
                        <LangBadge lang={r.lang} />
                        <EmailStatus {...(r.lastEmail ?? {})} />
                        {r.unsubscribedAt && <Badge>{t("Baja", "Désinscrit")}</Badge>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label={t("Eliminar", "Supprimer")}
                      className="rounded-lg p-1.5 text-site-gray hover:text-site-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Envoi manuel */}
        <Card className="flex h-fit min-w-0 flex-col gap-4">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <Mail className="h-5 w-5 text-site-red" /> {t("Notificar por email", "Prévenir par e-mail")}
          </p>
          {testMode && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              {t(
                "Modo prueba: los correos NO se envían de verdad (se ven en Sitio → Correos de prueba). Para el envío real: npm run mail:setup (ver README).",
                "Mode test : les e-mails ne partent PAS réellement (ils sont visibles dans Site → E-mails de test). Pour l'envoi réel : npm run mail:setup (voir README)."
              )}
            </p>
          )}
          <Field label={t("Asunto", "Objet")}>
            <input className={inputClass} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field
            label={t("Mensaje", "Message")}
            hint={t(
              "{nombre} se reemplaza por el nombre de cada inscrito. Se añade un enlace a la página del live.",
              "{nombre} est remplacé par le prénom de chaque inscrit. Un lien vers la page du live est ajouté."
            )}
          >
            <textarea
              className={`${inputClass} min-h-[180px]`}
              maxLength={10_000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Button icon={Send} loading={sending} onClick={send} disabled={!selected.size || !subject.trim() || !message.trim()}>
            {t(
              `Enviar a ${selected.size} seleccionado${selected.size === 1 ? "" : "s"}`,
              `Envoyer à ${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
            )}
          </Button>

          {batch && (
            <div className="rounded-2xl border border-site-line bg-site-bg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {batch.done ? t("Envío terminado", "Envoi terminé") : t("Enviando…", "Envoi…")}
                </span>
                <span className="tabular-nums text-site-text">
                  {batch.sent + batch.failed}/{batch.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-site-line">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-site-red to-site-gold transition-all"
                  style={{ width: `${batch.total ? ((batch.sent + batch.failed) / batch.total) * 100 : 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-site-gray">
                ✅ {batch.sent} {t("enviados", "envoyé(s)")}{" "}
                {batch.failed > 0 && (
                  <span className="text-site-red-d">
                    · ❌ {batch.failed} {t("con error", "en erreur")}
                  </span>
                )}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
