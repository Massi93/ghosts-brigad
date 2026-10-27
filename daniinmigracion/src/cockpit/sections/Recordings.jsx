import { useCallback, useEffect, useState } from "react";
import { Download, Film, PlayCircle, Trash2, X } from "lucide-react";
import { api, apiFileUrl } from "../../lib/api";
import { formatBytes, formatDateTime, formatDuration } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { useLang } from "../i18n";
import { Badge, Button, Card, EmptyState, SectionTitle, useToast } from "../ui";

function statusOf(status, t) {
  return (
    {
      recording: { tone: "live", label: t("Grabando", "Enregistrement…") },
      ready: { tone: "success", label: t("Lista", "Prête") },
      failed: { tone: "danger", label: t("Error", "Erreur") },
    }[status] ?? { tone: "success", label: t("Lista", "Prête") }
  );
}

export default function Recordings() {
  const { recordingsVersion } = useCockpit();
  const { t, locale } = useLang();
  const toast = useToast();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  const load = useCallback(() => {
    api("/admin/recordings")
      .then((res) => setRecordings(res.recordings))
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  // Mise à jour automatique dès qu'un enregistrement démarre ou se termine.
  useEffect(load, [load, recordingsVersion]);

  const remove = async (r) => {
    if (!window.confirm(t(`¿Eliminar definitivamente « ${r.filename} »?`, `Supprimer définitivement « ${r.filename} » ?`))) return;
    try {
      await api(`/admin/recordings/${r.id}`, { method: "DELETE" });
      if (playing === r.id) setPlaying(null);
      toast(t("Grabación eliminada", "Enregistrement supprimé"));
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <SectionTitle
        title={t("Grabaciones", "Enregistrements")}
        subtitle={t(
          "Cada live se graba automáticamente y se guarda en Cloudflare (R2). Puedes verlo o descargarlo aquí.",
          "Chaque live est enregistré automatiquement et conservé chez Cloudflare (R2). Vous pouvez le regarder ou le télécharger ici."
        )}
      />

      {!loading && recordings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Film}
            title={t("Todavía no hay grabaciones", "Pas encore d'enregistrements")}
            text={t("Al terminar tu primer live, la grabación aparecerá aquí.", "À la fin de votre premier live, l'enregistrement apparaîtra ici.")}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recordings.map((r) => {
            const status = statusOf(r.status, t);
            const fileUrl = apiFileUrl(`/admin/recordings/${r.id}/file`);
            return (
              <Card key={r.id} className="flex flex-col gap-3">
                {playing === r.id ? (
                  <div className="relative overflow-hidden rounded-2xl bg-black">
                    <video src={fileUrl} controls autoPlay playsInline className="aspect-video w-full" />
                    <button
                      type="button"
                      onClick={() => setPlaying(null)}
                      aria-label={t("Cerrar", "Fermer")}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={r.status !== "ready"}
                    onClick={() => setPlaying(r.id)}
                    className="group grid aspect-video place-items-center rounded-2xl bg-gradient-to-br from-[#1a1b2e] to-site-red-d disabled:cursor-not-allowed"
                  >
                    <PlayCircle className="h-14 w-14 text-white/80 transition group-hover:scale-110 group-hover:text-white" />
                  </button>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.liveTitle ?? "Live"}</p>
                    <p className="text-xs text-site-gray">{formatDateTime(r.createdAt, locale)}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>

                <p className="text-xs text-site-gray">
                  ⏱ {r.durationMs ? formatDuration(r.durationMs) : "—"} · 💾 {formatBytes(r.sizeBytes, locale)} ·{" "}
                  <span className="break-all">{r.filename}</span>
                </p>

                <div className="flex gap-2">
                  <a
                    href={apiFileUrl(`/admin/recordings/${r.id}/file?download=1`)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red transition hover:-translate-y-px px-4 py-2.5 text-sm font-bold ${
                      r.status === "ready" ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <Download className="h-4 w-4" /> {t("Descargar", "Télécharger")}
                  </a>
                  <Button variant="ghost" icon={Trash2} onClick={() => remove(r)} disabled={r.status === "recording"}>
                    {t("Eliminar", "Supprimer")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
