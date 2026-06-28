import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0a0a0a',
        paper: '#fafafa',
        muted: '#6b7280',
        line: '#e5e5e5',
        accent: '#ff4d2e',
      },
      letterSpacing: {
        wider2: '0.18em',
      },
    },
  },
  plugins: [],
};

export default config;
