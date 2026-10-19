import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

/** Dégradés rouges / roses des cœurs (style TikTok). */
const PALETTE = [
  ["#ff1744", "#ff8a80"],
  ["#ff2d55", "#ff7a9c"],
  ["#ff4d8d", "#ffb3cf"],
  ["#e91e63", "#ff80ab"],
  ["#ff5c8a", "#ffc1d6"],
  ["#ff6b81", "#ffd1dc"],
];

const MAX_HEARTS = 60; // au-delà, les plus anciens sont retirés (fluidité sur mobile)

const random = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Cœur SVG avec dégradé et léger reflet. */
export function HeartShape({ size = 32, colors = PALETTE[1], id }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="drop-shadow-[0_4px_10px_rgba(255,45,85,0.45)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[0]} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      <ellipse cx="7.6" cy="7.4" rx="2.2" ry="1.4" fill="white" opacity="0.35" transform="rotate(-35 7.6 7.4)" />
    </svg>
  );
}

let uid = 0;

/**
 * Calque des cœurs flottants. Méthodes exposées via `ref` :
 *  - `burst(n, { mine })` : n cœurs qui montent depuis le bouton (en bas à droite)
 *  - `pop(x, y)`          : gros cœur à la position d'un double-tap
 */
const HeartsLayer = forwardRef(function HeartsLayer(_props, ref) {
  const [hearts, setHearts] = useState([]);
  const containerRef = useRef(null);

  const add = useCallback((items) => {
    setHearts((current) => [...current, ...items].slice(-MAX_HEARTS));
  }, []);

  const remove = useCallback((id) => {
    setHearts((current) => current.filter((h) => h.id !== id));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      burst(n = 1, { mine = false } = {}) {
        const height = containerRef.current?.clientHeight || 600;
        const count = Math.min(n, 12);
        const items = Array.from({ length: count }, (_, i) => ({
          id: `h${(uid += 1)}`,
          type: "float",
          colors: pick(PALETTE),
          size: mine ? random(34, 42) : random(26, 36),
          style: {
            "--heart-delay": `${count > 1 ? i * random(60, 140) : 0}ms`,
            "--heart-duration": `${random(2.2, 3.4)}s`,
            "--heart-rise": `-${random(0.45, 0.7) * height}px`,
            "--heart-drift": `${random(-70, 20)}px`,
            "--heart-sway": `${random(8, 18)}px`,
            "--heart-sway-duration": `${random(0.7, 1.1)}s`,
            "--heart-scale": random(0.85, 1.2),
            right: `${random(18, 40)}px`,
            bottom: "112px",
          },
        }));
        add(items);
      },
      pop(x, y) {
        add([
          {
            id: `h${(uid += 1)}`,
            type: "pop",
            colors: pick(PALETTE),
            size: 96,
            style: { left: `${x}px`, top: `${y}px`, "--pop-rotate": `${random(-22, 22)}deg` },
          },
        ]);
      },
    }),
    [add]
  );

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className={heart.type === "pop" ? "heart-pop" : "heart-float"}
          style={heart.style}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) remove(heart.id);
          }}
        >
          <span>
            <HeartShape size={heart.size} colors={heart.colors} id={`g-${heart.id}`} />
          </span>
        </div>
      ))}
    </div>
  );
});

export default HeartsLayer;
