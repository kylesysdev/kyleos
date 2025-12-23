import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // REQUIRED for the Light/Dark toggle to work
  theme: {
    extend: {
      colors: {
        kyle: {
          green: "#00ff41",
          blue: "#00f3ff",
          dark: "#050505",
          light: "#f0f2f5",
        },
      },
      animation: {
        'breath': 'breath 4s ease-in-out infinite',
        'speak': 'speak 0.5s ease-in-out infinite',
        'listen': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.1)', opacity: '0.5' },
        },
        speak: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
