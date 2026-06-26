import { motion, useScroll, useSpring } from "framer-motion";
import { Home, Briefcase, MessageCircle, HelpCircle, Phone } from "lucide-react";
import { WHATSAPP } from "../data";

const items = [
  { icon: Home, label: "Inicio", href: "#top" },
  { icon: Briefcase, label: "Servicios", href: "#servicios" },
  { icon: HelpCircle, label: "Dudas", href: "#faq" },
  { icon: MessageCircle, label: "Testimonios", href: "#testimonios" },
];

export default function MobileBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <>
      {/* Top scroll progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand-400 via-brand-300 to-gold-400"
      />

      {/* Floating WhatsApp button */}
      <motion.a
        href={WHATSAPP}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 18 }}
        className="fixed bottom-24 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] shadow-glow active:scale-90"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
        <Phone className="relative h-6 w-6 text-white" fill="white" />
      </motion.a>

      {/* Bottom dock nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="container-app pb-3">
          <div className="glass flex items-center justify-around rounded-2xl px-2 py-2 shadow-card">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <a
                  key={it.label}
                  href={it.href}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-white/60 transition active:scale-90 active:text-brand-200"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{it.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
