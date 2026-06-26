/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0b1220",
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bccfff",
          300: "#8eacff",
          400: "#597fff",
          500: "#3358f4",
          600: "#1f3ad6",
          700: "#1b2eac",
          800: "#1c298a",
          900: "#1c2870",
        },
        gold: {
          400: "#ffcf6b",
          500: "#f5b53d",
          600: "#d9971f",
        },
      },
      boxShadow: {
        glow: "0 20px 60px -20px rgba(51,88,244,0.55)",
        card: "0 10px 40px -12px rgba(12,18,32,0.35)",
        soft: "0 8px 30px -10px rgba(12,18,32,0.18)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        "spin-slow": "spin-slow 26s linear infinite",
      },
    },
  },
  plugins: [],
};
