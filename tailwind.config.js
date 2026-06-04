/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        base: {
          DEFAULT: '#0F0F1A',
          50: '#1A1A2E',
          100: '#16213E',
          200: '#0F3460',
        },
        neon: {
          pink: '#FF2E97',
          cyan: '#00F5FF',
          yellow: '#FFE600',
          green: '#39FF14',
          orange: '#FF6B35',
          purple: '#BF5AF2',
          blue: '#5AC8FA',
          red: '#FF3B30',
        },
        surface: {
          DEFAULT: '#1A1A2E',
          light: '#232342',
          lighter: '#2D2D50',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neon-pink': '0 0 10px rgba(255,46,151,0.4), 0 0 40px rgba(255,46,151,0.1)',
        'neon-cyan': '0 0 10px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.1)',
        'neon-yellow': '0 0 10px rgba(255,230,0,0.4), 0 0 40px rgba(255,230,0,0.1)',
        'neon-green': '0 0 10px rgba(57,255,20,0.4), 0 0 40px rgba(57,255,20,0.1)',
        'neon-purple': '0 0 10px rgba(191,90,242,0.4), 0 0 40px rgba(191,90,242,0.1)',
        glow: '0 0 20px rgba(255,46,151,0.15), 0 0 60px rgba(191,90,242,0.1)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%': { boxShadow: '0 0 5px rgba(255,46,151,0.2), 0 0 20px rgba(255,46,151,0.1)' },
          '100%': { boxShadow: '0 0 15px rgba(255,46,151,0.4), 0 0 40px rgba(255,46,151,0.2)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
