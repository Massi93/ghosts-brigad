import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Star, Phone } from "lucide-react";
import { WHATSAPP } from "../data";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-10 pt-6">
      {/* Aurora background */}
      <div className="absolute inset-0 -z-10">
        <div className="aurora left-[-20%] top-[-10%] h-72 w-72 animate-floaty bg-brand-500" />
        <div
          className="aurora right-[-25%] top-[20%] h-80 w-80 animate-floaty bg-gold-500"
          style={{ animationDelay: "1.5s", opacity: 0.35 }}
        />
        <div className="absolute inset-0 bg-grid-faint bg-[size:42px_42px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
        >
          <span className="chip mb-5">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" />
            Asesoría migratoria con resultados
          </span>

          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight">
            Tu camino a una
            <br />
            <span className="shimmer-text">nueva vida</span>
            <br />
            empieza hoy.
          </h1>

          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/70">
            Visas, residencia, ciudadanía y reunificación familiar. Te
            acompañamos de principio a fin con un trato humano y 100%
            transparente.
          </p>

          <div className="mt-7 flex w-full flex-col gap-3">
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-primary w-full">
              <Phone className="h-4 w-4" /> Consulta gratis por WhatsApp
            </a>
            <a href="#servicios" className="btn-ghost w-full">
              Ver servicios <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Social proof row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-8 flex items-center gap-3"
          >
            <div className="flex -space-x-3">
              {["🇲🇽", "🇨🇴", "🇻🇪", "🇵🇪"].map((f, i) => (
                <span
                  key={i}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-brand-700 text-base"
                >
                  {f}
                </span>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5 text-gold-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-white/60">+2,500 familias confían en Dani</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating glass card */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-10"
        >
          <div className="glass animate-floaty rounded-3xl p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">Estado de tu caso</p>
                <p className="font-display text-lg font-bold">Residencia · I-485</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                Aprobado
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-gold-400"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
              />
            </div>

            <div className="mt-3 flex justify-between text-[11px] text-white/50">
              <span>Documentos</span>
              <span>Entrevista</span>
              <span>Resolución</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
