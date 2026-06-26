import { motion } from "framer-motion";
import { steps } from "../data";
import Reveal from "./Reveal";

export default function Process() {
  return (
    <section id="proceso" className="container-app scroll-mt-20 py-10">
      <Reveal>
        <span className="chip">Cómo trabajamos</span>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">
          Un proceso claro,
          <br />
          <span className="text-brand-300">sin sorpresas</span>
        </h2>
      </Reveal>

      <div className="relative mt-8 pl-2">
        {/* animated vertical line */}
        <motion.span
          className="absolute left-[26px] top-2 w-0.5 origin-top bg-gradient-to-b from-brand-400 via-brand-500 to-gold-400"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{ height: "calc(100% - 1rem)" }}
        />

        <div className="flex flex-col gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-start gap-4"
            >
              <span className="z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-ink font-display text-sm font-extrabold text-brand-300 shadow-soft">
                {s.n}
              </span>
              <div className="pt-1">
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
