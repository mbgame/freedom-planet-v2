import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-jetbrains-mono)'],
      },
      colors: {
        border: '#1e293b', // slate-800
      },
      animation: {
        scan: 'scan 3s linear infinite',
        slideIn: 'slideIn 0.3s ease-out forwards',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        slideIn: {
          from: {
            opacity: '0',
            transform: 'translateX(20px) translateY(-50%)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0) translateY(-50%)',
          },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
