/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.ts', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#4D94FF',
        'primary-dark': '#3385FF',
        'primary-bg': '#E6F2FF',
        'text-primary': '#475569',
        'text-secondary': '#64748b',
        border: '#e2e8f0',
        background: '#f9fafb',
        success: '#10B981',
        error: '#EF4444',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
      },
      fontFamily: {
        sans: ['NotoSansJP', 'System'],
      },
    },
  },
  plugins: [],
};
