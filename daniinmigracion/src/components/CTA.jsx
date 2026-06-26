import { motion } from "framer-motion";
import { Phone, ShieldCheck } from "lucide-react";
import { WHATSAPP } from "../data";

export default function CTA() {
  return (
    <section id="contacto" className="container-app scroll-mt-20 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-7 text-center shadow-glow"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 animate-spin-slow rounded-full border border-white/20" />
        <div className="absolute -bottom-12 -left-8 h-44 w-44 animate-spin-slow rounded-full border border-white/10" />

        <h2 className="relative font-display text-2xl font-extrabold leading-tight">
          ¿List@ para empezar
          <br /> tu proceso?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xs text-sm text-white/80">
          Agenda hoy tu consulta gratuita. Sin compromiso, con respuestas
          honestas.
        </p>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-brand-700 shadow-lg transition active:scale-95"
        >
          <Phone className="h-4 w-4" /> Hablar con Dani ahora
        </a>

        <p className="relative mt-4 flex items-center justify-center gap-1.5 text-xs text-white/80">
          <ShieldCheck className="h-4 w-4" /> Respuesta en menos de 24 horas
        </p>
      </motion.div>
    </section>
  );
}
