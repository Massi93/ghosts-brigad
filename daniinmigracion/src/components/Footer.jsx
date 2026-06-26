import { Globe2, Instagram, Facebook, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="container-app pb-28 pt-6">
      <div className="border-t border-white/10 pt-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
            <Globe2 className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-base font-extrabold">
            Dani<span className="text-brand-300">Inmigración</span>
          </span>
        </div>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/55">
          Asesoría migratoria profesional y humana. Acompañamos tu camino hacia
          una nueva vida.
        </p>

        <div className="mt-6 flex gap-3">
          {[Instagram, Facebook, Mail].map((Icon, i) => (
            <a
              key={i}
              href="#"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition active:scale-90"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-1 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Dani Inmigración. Todos los derechos reservados.</p>
          <p className="text-white/30">
            No constituye asesoría legal formal sin contrato previo.
          </p>
        </div>
      </div>
    </footer>
  );
}
