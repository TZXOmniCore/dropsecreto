import type { Config } from 'tailwindcss';

// Sistema de tokens do Drop Secreto:
// - fundo quase-preto com uma superfície "cinza escuro" (#121212, conforme o brief)
// - único acento verde (#00E676, conforme o brief) usado com moderação, reservado
//   para o que já foi verificado pelo motor de Drop Score
// - tipografia em três papéis: display (títulos), body (texto) e mono (todo dado
//   numérico — preço, score, contagem regressiva — para reforçar "isso foi medido,
//   não escrito por um redator")
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0B',
          surface: '#121212',
          raised: '#1A1B1D',
        },
        accent: {
          DEFAULT: '#00E676',
          dim: '#00A85C',
        },
        ink: {
          primary: '#F5F5F7',
          secondary: '#9A9AA2',
          faint: '#5C5C63',
        },
        danger: '#FF5C5C',
        line: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(0, 230, 118, 0.18)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-8%)' },
          '100%': { transform: 'translateX(108%)' },
        },
        countup: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        scan: 'scan 2.8s cubic-bezier(0.65, 0, 0.35, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
