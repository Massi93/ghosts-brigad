import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { services } from "../data";
import Reveal from "./Reveal";

export default function Services() {
  return (
    <section id="servicios" className="container-app scroll-mt-20 py-10">
      <Reveal>
        <span className="chip">Servicios</span>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">
          Soluciones para cada
          <br />
          <span className="text-brand-300">etapa migratoria</span>
        </h2>
        <p className="mt-3 text-sm text-white/60">
          Sea cual sea tu situación, tenemos una ruta legal para ti.
        </p>
      </Reveal>

      <div className="mt-7 grid grid-cols-1 gap-3.5">
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.a
              key={s.title}
              href="#contacto"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.98 }}
              className="group glass relative overflow-hidden rounded-3xl p-5 shadow-soft"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl transition group-hover:bg-brand-500/30" />
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/90 to-brand-600 shadow-glow">
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-white/40 transition group-hover:text-brand-300" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/60">
                    {s.desc}
                  </p>
                  <span className="mt-3 inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-brand-200">
                    {s.tag}
                  </span>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
