import type { Config } from 'tailwindcss';

// Semua nilai mengacu ke CSS variable di src/styles/design-tokens.css (satu-satunya sumber gaya).
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--c-primary-50)',
          100: 'var(--c-primary-100)',
          500: 'var(--c-accent)',
          600: 'var(--c-accent-strong)',
          700: '#1e40af',
          900: '#1e3a8a',
        },
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        heading: 'var(--c-heading)',
        success: 'var(--c-success)',
        danger: 'var(--c-danger)',
      },
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
    },
  },
  plugins: [],
};

export default config;
