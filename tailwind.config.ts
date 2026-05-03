import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16211f',
        moss: '#3f6b57',
        clay: '#b46f4d',
        skywash: '#e8f2f4',
      },
    },
  },
  plugins: [],
} satisfies Config;
