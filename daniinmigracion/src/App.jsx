import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import Services from "./components/Services";
import Process from "./components/Process";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import MobileBar from "./components/MobileBar";

function Site() {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-ink">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Services />
        <Process />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
      <MobileBar />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-ink">
      {/* On large screens, present the mobile design inside a phone frame */}
      <div className="lg:flex lg:min-h-screen lg:items-center lg:justify-center lg:gap-16 lg:bg-[radial-gradient(ellipse_at_top,#16224a,#0b1220)] lg:p-12">
        <div className="hidden max-w-sm lg:block">
          <span className="chip">Rediseño mobile · 2026</span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-tight">
            Dani<span className="text-brand-300">Inmigración</span>
          </h1>
          <p className="mt-4 text-white/60">
            Nueva versión mobile con animaciones modernas: aurora dinámica,
            scroll-reveal, contadores animados, carrusel con snap y micro-
            interacciones en cada toque.
          </p>
          <p className="mt-6 text-sm text-white/40">
            👉 Vista previa en marco de teléfono. Abre en un dispositivo móvil
            para la experiencia real.
          </p>
        </div>

        {/* Phone frame on desktop, full-bleed on mobile */}
        <div className="lg:relative lg:rounded-[3rem] lg:border-[10px] lg:border-[#1a2238] lg:bg-ink lg:p-0 lg:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
          <div className="lg:h-[820px] lg:w-[390px] lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-[2.3rem] no-scrollbar">
            <Site />
          </div>
        </div>
      </div>
    </div>
  );
}
