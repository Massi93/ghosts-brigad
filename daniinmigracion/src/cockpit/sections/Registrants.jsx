import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Download, Mail, Search, Send, Trash2, Users, XCircle } from "lucide-react";
import { api, apiFileUrl } from "../../lib/api";
import { formatDateTime, formatLiveDate } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { Badge, Button, Card, EmptyState, Field, SectionTitle, inputClass, useToast } from "../ui";

const KIND_LABELS = {
  confirmation: "Confirmación",
  reminder_3h: "Recordatorio 3 h",
  reminder_5m: "Recordatorio 5 min",
  manual: "Envío manual",
};

function defaultMessage(next) {
  const when = next?.scheduledAt ? `el ${formatLiveDate(next.scheduledAt)}` : "muy pronto";
  return `Hola {nombre}:\n\nTe recordamos que nuestro próximo live «${next?.title ?? "Live con Dani"}» será ${when}.\n\nPrepara tus preguntas: ¡nos vemos en directo!\n\nDani`;
}

/** Statut d'envoi affiché pour un inscrit. */
function EmailStatus({ status, kind, error }) {
  if (!status) return <span className="text-xs text-white/30">—</span>;
  const label = KIND_LABELS[kind] ?? "Email";
  if (status === "sent") {
    return (
      <Badge tone="success" title={label}>
        <CheckCircle2 className="h-3 w-3" /> Enviado
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge tone="danger" title={error || label}>
        <XCircle className="h-3 w-3" /> Error
      </Badge>
    );
  }
  return (
    <Badge tone="warning" title={label}>
      <Clock className="h-3 w-3" /> Enviando…
    </Badge>
  );
}

export default function Registrants() {
  const { next, live, onMail } = useCockpit();
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

  // Message pré-rempli avec le prochain live.
  const target = live ?? next;
  useEffect(() => {
    setSubject((s) => s || `Recordatorio: ${target?.title ?? "nuestro próximo live"}`);
    setMessage((m) => m || defaultMessage(target));
  }, [target]);

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
          toast(`Envío terminado: ${data.sent} enviados${data.failed ? `, ${data.failed} con error` : ""}`, data.failed ? "error" : "success");
        }
        setBatch((b) => (b && b.batchId === data.batchId ? { ...b, ...countOf(entry) } : b));
      }),
    [onMail, toast]
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
    if (!ids.length) return toast("Marca al menos un destinatario", "error");
    if (!window.confirm(`¿Enviar este correo a ${ids.length} inscrito(s)?`)) return;
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
    if (!window.confirm(`¿Eliminar a ${r.firstName} ${r.lastName} (${r.email})? Esta acción es definitiva.`)) return;
    try {
      await api(`/admin/registrations/${r.id}`, { method: "DELETE" });
      setRows((list) => list.filter((x) => x.id !== r.id));
      setSelected((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(r.id);
        return nextSet;
      });
      toast("Inscrito eliminado");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <SectionTitle
        title="Inscritos"
        subtitle={`${activeCount} activos · ${rows.length} en total`}
        actions={
          <a
            href={apiFileUrl("/admin/registrations.csv")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Liste */}
        <Card className="p-0 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={!selectable.length}
                className="h-4 w-4 accent-brand-500"
              />
              Seleccionar todo
            </label>
            <Badge tone="info">{selected.size} seleccionados</Badge>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                className={`${inputClass} py-2 pl-9`}
                placeholder="Buscar nombre o email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={rows.length ? "Sin resultados" : "Todavía no hay inscritos"}
              text={rows.length ? null : "Las inscripciones del formulario « Próximo live » aparecerán aquí."}
            />
          ) : (
            <>
              {/* Tableau (écrans larges) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="w-10 px-5 py-3" />
                      <th className="px-3 py-3 font-medium">Nombre</th>
                      <th className="px-3 py-3 font-medium">Apellido</th>
                      <th className="px-3 py-3 font-medium">Email</th>
                      <th className="px-3 py-3 font-medium">Inscripción</th>
                      <th className="px-3 py-3 font-medium">Último envío</th>
                      <th className="w-10 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((r) => (
                      <tr key={r.id} className={r.unsubscribedAt ? "opacity-50" : ""}>
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            disabled={Boolean(r.unsubscribedAt)}
                            aria-label={`Seleccionar ${r.email}`}
                            className="h-4 w-4 accent-brand-500"
                          />
                        </td>
                        <td className="px-3 py-3 font-medium">{r.firstName}</td>
                        <td className="px-3 py-3">{r.lastName}</td>
                        <td className="px-3 py-3 text-white/70">
                          {r.email}
                          {r.unsubscribedAt && <Badge className="ml-2">Baja</Badge>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-white/50">{formatDateTime(r.createdAt)}</td>
                        <td className="px-3 py-3">
                          <EmailStatus {...(r.lastEmail ?? {})} />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => remove(r)}
                            aria-label="Eliminar"
                            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300"
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
              <ul className="divide-y divide-white/5 md:hidden">
                {filtered.map((r) => (
                  <li key={r.id} className={`flex items-start gap-3 px-5 py-3 ${r.unsubscribedAt ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      disabled={Boolean(r.unsubscribedAt)}
                      aria-label={`Seleccionar ${r.email}`}
                      className="mt-1 h-4 w-4 accent-brand-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="truncate text-sm text-white/60">{r.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                        {formatDateTime(r.createdAt)}
                        <EmailStatus {...(r.lastEmail ?? {})} />
                        {r.unsubscribedAt && <Badge>Baja</Badge>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label="Eliminar"
                      className="rounded-lg p-1.5 text-white/40 hover:text-red-300"
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
        <Card className="flex h-fit flex-col gap-4">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <Mail className="h-5 w-5 text-brand-300" /> Notificar por email
          </p>
          <Field label="Asunto">
            <input className={inputClass} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Mensaje" hint="{nombre} se reemplaza por el nombre de cada inscrito. Se añade un enlace a la página del live.">
            <textarea
              className={`${inputClass} min-h-[180px]`}
              maxLength={10_000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Button icon={Send} loading={sending} onClick={send} disabled={!selected.size || !subject.trim() || !message.trim()}>
            Enviar a {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          </Button>

          {batch && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{batch.done ? "Envío terminado" : "Enviando…"}</span>
                <span className="tabular-nums text-white/60">
                  {batch.sent + batch.failed}/{batch.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-emerald-400 transition-all"
                  style={{ width: `${batch.total ? ((batch.sent + batch.failed) / batch.total) * 100 : 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/50">
                ✅ {batch.sent} enviados {batch.failed > 0 && <span className="text-red-300">· ❌ {batch.failed} con error</span>}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
