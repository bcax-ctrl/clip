import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimal-dark editor palette (CapCut-ish)
        ink: {
          900: "#0a0a0c",
          800: "#111114",
          700: "#17171c",
          600: "#1f1f26",
          500: "#2a2a33",
          400: "#3a3a46",
        },
        brand: {
          DEFAULT: "#ff4d6d",
          soft: "#ff7a93",
          glow: "#ff2d55",
        },
        accent: "#5eead4",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,77,109,0.25), 0 8px 30px rgba(255,45,85,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
