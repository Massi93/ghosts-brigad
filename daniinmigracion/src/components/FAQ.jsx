import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { faqs } from "../data";
import Reveal from "./Reveal";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="container-app scroll-mt-20 py-10">
      <Reveal>
        <span className="chip">Preguntas frecuentes</span>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">
          Resolvemos tus
          <br />
          <span className="text-brand-300">dudas</span>
        </h2>
      </Reveal>

      <div className="mt-7 flex flex-col gap-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 0.05}>
              <div className="glass overflow-hidden rounded-2xl">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-semibold">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-200"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-5 pb-5 text-[13px] leading-relaxed text-white/65">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
