import { Quote } from "lucide-react";
import { testimonials, benefits } from "../data";
import Reveal from "./Reveal";

export default function Testimonials() {
  return (
    <section id="testimonios" className="scroll-mt-20 py-10">
      <div className="container-app">
        <Reveal>
          <span className="chip">Historias reales</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">
            Sueños que se
            <br />
            <span className="text-brand-300">hicieron realidad</span>
          </h2>
        </Reveal>
      </div>

      {/* Horizontal snap carousel */}
      <div className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
        {testimonials.map((t, i) => (
          <Reveal
            key={t.name}
            delay={i * 0.05}
            className="w-[78%] shrink-0 snap-center"
          >
            <figure className="glass flex h-full flex-col rounded-3xl p-5 shadow-soft">
              <Quote className="h-7 w-7 text-brand-400/60" />
              <blockquote className="mt-3 flex-1 text-[14px] leading-relaxed text-white/80">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-lg">
                  {t.flag}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-brand-200">{t.case}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      {/* Benefits row */}
      <div className="container-app mt-8 grid grid-cols-3 gap-3">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <Reveal key={b.title} delay={i * 0.08}>
              <div className="glass flex h-full flex-col items-center rounded-2xl p-3 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400/90 to-brand-600">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <p className="mt-2 text-xs font-bold leading-tight">{b.title}</p>
                <p className="mt-1 text-[10px] leading-tight text-white/50">
                  {b.desc}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
