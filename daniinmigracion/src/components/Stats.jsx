import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { stats } from "../data";

/** Animated count-up that triggers when scrolled into view. */
function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(value.replace(/[0-9.]+/, "0"));

  useEffect(() => {
    if (!inView) return;
    const match = value.match(/([0-9.]+)/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const target = parseFloat(match[1]);
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + match[1].length);
    const isFloat = match[1].includes(".");
    let raf;
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = target * eased;
      setDisplay(`${prefix}${isFloat ? n.toFixed(1) : Math.round(n)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

export default function Stats() {
  return (
    <section className="container-app py-8">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-2xl p-4 text-center"
          >
            <p className="font-display text-3xl font-extrabold text-gradient">
              <CountUp value={s.value} />
            </p>
            <p className="mt-1 text-xs text-white/60">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
