import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Heart, History, Pencil, Play, Trash2, TrendingUp, X } from "lucide-react";
import { api } from "../../lib/api";
import { formatDateTime, formatDuration, formatLiveDate, splitDuration, useNow } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { useLang } from "../i18n";
import { Badge, Button, Card, EmptyState, Field, SectionTitle, inputClass, useToast } from "../ui";

const pad = (n) => String(n).padStart(2, "0");

/** Valeurs par défaut du formulaire : demain à 19:00. */
function defaultDateTime() {
  const d = new Date(Date.now() + 86400_000);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: "19:00" };
}

/** Date ISO → champs date / heure locaux. */
function toLocalFields(iso) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Champs date + heure (heure locale du navigateur) → ISO UTC. */
function toIso(date, time) {
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function remainingLabel(ms, t) {
  if (ms <= 0) return t("ahora", "maintenant");
  const { days, hours, minutes } = splitDuration(ms);
  const prefix = t("en", "dans");
  if (days) return `${prefix} ${days} ${t("d", "j")} ${hours} h`;
  if (hours) return `${prefix} ${hours} h ${minutes} min`;
  return `${prefix} ${Math.max(minutes, 1)} min`;
}

function statusOf(status, t) {
  return (
    {
      ended: { tone: "success", label: t("Terminado", "Terminé") },
      cancelled: { tone: "neutral", label: t("Cancelado", "Annulé") },
      missed: { tone: "warning", label: t("No realizado", "Non réalisé") },
    }[status] ?? { tone: "success", label: t("Terminado", "Terminé") }
  );
}

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Schedule() {
  const { live, offset } = useCockpit();
  const { t, locale } = useLang();
  const toast = useToast();
  const now = useNow(30_000, { offset });

  const [lists, setLists] = useState({ upcoming: [], past: [] });
  const [form, setForm] = useState({ title: "", description: "", ...defaultDateTime() });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api("/admin/lives").then(setLists).catch((err) => toast(err.message, "error"));
  }, [toast]);

  // Rechargement aussi quand un live démarre ou se termine.
  useEffect(load, [load, live?.id, live?.status]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: "", description: "", ...defaultDateTime() });
  };

  const submit = async (e) => {
    e.preventDefault();
    const scheduledAt = toIso(form.date, form.time);
    if (!scheduledAt) return toast(t("Fecha u hora inválida", "Date ou heure invalide"), "error");
    setSaving(true);
    try {
      const body = { title: form.title, description: form.description, scheduledAt };
      if (editingId) {
        await api(`/admin/lives/${editingId}`, { method: "PATCH", body });
        toast(t("Live actualizado", "Live mis à jour"));
      } else {
        await api("/admin/lives", { method: "POST", body });
        toast(t("Live programado. El botón LIVE ya aparece en el sitio.", "Live programmé. Le bouton LIVE apparaît déjà sur le site."));
      }
      resetForm();
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const edit = (l) => {
    setEditingId(l.id);
    setForm({ title: l.title, description: l.description ?? "", ...toLocalFields(l.scheduledAt) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = async (l) => {
    if (!window.confirm(t(`¿Cancelar el live « ${l.title} »?`, `Annuler le live « ${l.title} » ?`))) return;
    try {
      await api(`/admin/lives/${l.id}/cancel`, { method: "POST" });
      toast(t("Live cancelado", "Live annulé"));
      if (editingId === l.id) resetForm();
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <SectionTitle
        title={t("Programación", "Programmation")}
        subtitle={t(
          "Programa tus lives: los inscritos reciben un recordatorio 3 h y 5 min antes.",
          "Programmez vos lives : les inscrits reçoivent un rappel 3 h et 5 min avant."
        )}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Formulaire */}
        <Card className="lg:col-span-2">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              {editingId ? <Pencil className="h-5 w-5 text-site-red" /> : <CalendarPlus className="h-5 w-5 text-site-red" />}
              {editingId ? t("Editar live", "Modifier le live") : t("Programar un live", "Programmer un live")}
            </p>
            <Field label={t("Título", "Titre")}>
              <input
                className={inputClass}
                required
                maxLength={120}
                value={form.title}
                placeholder={t("Ej.: Preguntas y respuestas sobre el arraigo", "Ex. : Questions-réponses sur l'arraigo")}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label={t("Descripción (opcional)", "Description (facultatif)")}>
              <textarea
                className={`${inputClass} min-h-[80px]`}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Fecha", "Date")}>
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label={t("Hora", "Heure")}>
                <input
                  type="time"
                  className={inputClass}
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
            </div>
            <p className="text-xs text-site-gray">
              {t(
                `Hora de este ordenador (${timezone}). Cada visitante la ve en su propia zona horaria.`,
                `Heure de cet ordinateur (${timezone}). Chaque visiteur la voit dans son propre fuseau horaire.`
              )}
            </p>
            <div className="flex gap-2">
              <Button type="submit" icon={CalendarClock} loading={saving} className="flex-1">
                {editingId ? t("Guardar cambios", "Enregistrer") : t("Programar", "Programmer")}
              </Button>
              {editingId && (
                <Button variant="ghost" icon={X} onClick={resetForm}>
                  {t("Cancelar", "Annuler")}
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Lives à venir */}
        <Card className="p-0 lg:col-span-3">
          <p className="border-b border-site-line px-5 py-4 font-display font-bold">{t("Próximos lives", "Prochains lives")}</p>
          {lists.upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={t("Ningún live programado", "Aucun live programmé")}
              text={t("Programa uno con el formulario.", "Programmez-en un avec le formulaire.")}
            />
          ) : (
            <ul className="divide-y divide-site-line">
              {lists.upcoming.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-sm text-site-gray">{formatLiveDate(l.scheduledAt, locale)}</p>
                  </div>
                  <Badge tone="info">{remainingLabel(Date.parse(l.scheduledAt) - now, t)}</Badge>
                  <div className="flex gap-1">
                    {!live && (
                      <a
                        href={`#directo?live=${l.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red transition hover:-translate-y-px px-3.5 py-2 text-xs font-bold"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" /> {t("Iniciar", "Démarrer")}
                      </a>
                    )}
                    <Button variant="subtle" icon={Pencil} onClick={() => edit(l)} aria-label={t("Editar", "Modifier")} className="px-3" />
                    <Button variant="subtle" icon={Trash2} onClick={() => cancel(l)} aria-label={t("Cancelar", "Annuler")} className="px-3" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Historique */}
      <Card className="mt-6 p-0">
        <p className="flex items-center gap-2 border-b border-site-line px-5 py-4 font-display font-bold">
          <History className="h-4 w-4 text-site-gray" /> {t("Historial", "Historique")}
        </p>
        {lists.past.length === 0 ? (
          <EmptyState title={t("Todavía no hay lives pasados", "Pas encore de lives passés")} />
        ) : (
          <ul className="divide-y divide-site-line">
            {lists.past.map((l) => {
              const status = statusOf(l.status, t);
              const duration = l.startedAt && l.endedAt ? Date.parse(l.endedAt) - Date.parse(l.startedAt) : null;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-xs text-site-gray">{formatDateTime(l.startedAt || l.scheduledAt, locale)}</p>
                  </div>
                  {l.status === "ended" && (
                    <span className="flex items-center gap-3 text-xs text-site-text">
                      <span>⏱ {formatDuration(duration ?? 0)}</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> {l.peakViewers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-pink-400" /> {l.hearts}
                      </span>
                      <span>🎬 {l.recordings ?? 0}</span>
                    </span>
                  )}
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
