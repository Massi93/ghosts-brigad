import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Heart, History, Pencil, Play, Trash2, TrendingUp, X } from "lucide-react";
import { api } from "../../lib/api";
import { formatDateTime, formatDuration, formatLiveDate, splitDuration, useNow } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
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

function remainingLabel(ms) {
  if (ms <= 0) return "ahora";
  const { days, hours, minutes } = splitDuration(ms);
  if (days) return `en ${days} d ${hours} h`;
  if (hours) return `en ${hours} h ${minutes} min`;
  return `en ${Math.max(minutes, 1)} min`;
}

const STATUS = {
  ended: { tone: "success", label: "Terminado" },
  cancelled: { tone: "neutral", label: "Cancelado" },
  missed: { tone: "warning", label: "No realizado" },
};

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Schedule() {
  const { live, offset } = useCockpit();
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
    if (!scheduledAt) return toast("Fecha u hora inválida", "error");
    setSaving(true);
    try {
      const body = { title: form.title, description: form.description, scheduledAt };
      if (editingId) {
        await api(`/admin/lives/${editingId}`, { method: "PATCH", body });
        toast("Live actualizado");
      } else {
        await api("/admin/lives", { method: "POST", body });
        toast("Live programado. El botón LIVE ya aparece en el sitio.");
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
    if (!window.confirm(`¿Cancelar el live « ${l.title} »?`)) return;
    try {
      await api(`/admin/lives/${l.id}/cancel`, { method: "POST" });
      toast("Live cancelado");
      if (editingId === l.id) resetForm();
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <SectionTitle title="Programación" subtitle="Programa tus lives: los inscritos reciben un recordatorio 3 h y 5 min antes." />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Formulaire */}
        <Card className="lg:col-span-2">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              {editingId ? <Pencil className="h-5 w-5 text-brand-300" /> : <CalendarPlus className="h-5 w-5 text-brand-300" />}
              {editingId ? "Editar live" : "Programar un live"}
            </p>
            <Field label="Título">
              <input
                className={inputClass}
                required
                maxLength={120}
                value={form.title}
                placeholder="Ej.: Preguntas y respuestas sobre la Green Card"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea
                className={`${inputClass} min-h-[80px]`}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <input
                  type="date"
                  className={inputClass}
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Hora">
                <input
                  type="time"
                  className={inputClass}
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
            </div>
            <p className="text-xs text-white/40">Hora de este ordenador ({timezone}). Cada visitante la ve en su propia zona horaria.</p>
            <div className="flex gap-2">
              <Button type="submit" icon={CalendarClock} loading={saving} className="flex-1">
                {editingId ? "Guardar cambios" : "Programar"}
              </Button>
              {editingId && (
                <Button variant="ghost" icon={X} onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Lives à venir */}
        <Card className="p-0 lg:col-span-3">
          <p className="border-b border-white/10 px-5 py-4 font-display font-bold">Próximos lives</p>
          {lists.upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Ningún live programado" text="Programa uno con el formulario." />
          ) : (
            <ul className="divide-y divide-white/5">
              {lists.upcoming.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-sm text-white/50">{formatLiveDate(l.scheduledAt)}</p>
                  </div>
                  <Badge tone="info">{remainingLabel(Date.parse(l.scheduledAt) - now)}</Badge>
                  <div className="flex gap-1">
                    {!live && (
                      <a
                        href={`#directo?live=${l.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" /> Iniciar
                      </a>
                    )}
                    <Button variant="subtle" icon={Pencil} onClick={() => edit(l)} aria-label="Editar" className="px-3" />
                    <Button variant="subtle" icon={Trash2} onClick={() => cancel(l)} aria-label="Cancelar" className="px-3" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Historique */}
      <Card className="mt-6 p-0">
        <p className="flex items-center gap-2 border-b border-white/10 px-5 py-4 font-display font-bold">
          <History className="h-4 w-4 text-white/50" /> Historial
        </p>
        {lists.past.length === 0 ? (
          <EmptyState title="Todavía no hay lives pasados" />
        ) : (
          <ul className="divide-y divide-white/5">
            {lists.past.map((l) => {
              const status = STATUS[l.status] ?? STATUS.ended;
              const duration = l.startedAt && l.endedAt ? Date.parse(l.endedAt) - Date.parse(l.startedAt) : null;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-xs text-white/40">{formatDateTime(l.startedAt || l.scheduledAt)}</p>
                  </div>
                  {l.status === "ended" && (
                    <span className="flex items-center gap-3 text-xs text-white/60">
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
