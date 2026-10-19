import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe2, Phone } from "lucide-react";
import { WHATSAPP } from "../data";
import LiveButton from "./LiveButton";
import { useLiveStatus } from "../lib/liveStatus";

const links = [
  { label: "Próximo live", href: "#proximo-live" },
  { label: "Servicios", href: "#servicios" },
  { label: "Proceso", href: "#proceso" },
  { label: "Testimonios", href: "#testimonios" },
  { label: "Preguntas", href: "#faq" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { live } = useLiveStatus();
  const headerRef = useRef(null);

  useEffect(() => {
    // Phase de capture : on suit aussi le défilement du cadre « téléphone » sur
    // ordinateur (l'en-tête y est sticky), en ignorant les carrousels horizontaux.
    const onScroll = (e) => {
      const target = e?.target;
      if (target && target !== document && !target.contains(headerRef.current)) return;
      const top = target && target !== document ? target.scrollTop : window.scrollY;
      setScrolled(top > 12);
    };
    onScroll();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-soft" : "bg-transparent"
      }`}
    >
      <nav className="container-app flex h-16 items-center justify-between">
        <a href="#top" className="flex min-w-0 items-center gap-2">
          {/* Sur petit écran, l'icône laisse la place au bouton LIVE quand un live est programmé. */}
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow ${
              live ? "max-[420px]:hidden" : ""
            }`}
          >
            <Globe2 className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-base font-extrabold tracking-tight">
            Dani<span className="text-brand-300">Inmigración</span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <LiveButton />
          <button
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 active:scale-90"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-50 flex h-full w-[80%] max-w-xs flex-col gap-2 border-l border-white/10 bg-ink/95 p-6 backdrop-blur-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-lg font-extrabold">Menú</span>
                <button
                  aria-label="Cerrar menú"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 active:scale-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3.5 text-lg font-semibold text-white/90 transition hover:bg-white/5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                >
                  {l.label}
                </motion.a>
              ))}

              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-4"
              >
                <Phone className="h-4 w-4" /> Agenda tu consulta
              </a>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
