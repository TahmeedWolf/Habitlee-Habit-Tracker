/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0B0E14', soft: '#11151D', card: '#161B26', line: '#222838' },
        paper: { DEFAULT: '#FAF7F2', soft: '#F1ECE3', card: '#FFFFFF', line: '#E7E0D4' },
        ember: { DEFAULT: '#FF8A3D', dim: '#C9622A' },
        spark: '#FFD166',
        dusk: '#5B6478',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(255, 138, 61, 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
