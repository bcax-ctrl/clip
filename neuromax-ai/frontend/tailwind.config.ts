import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Bloomberg-terminal-inspired dark palette.
        base: "#0a0a0a",
        panel: "#111114",
        border: "#1f1f24",
        accent: "#6366f1", // indigo
        bullish: "#16c784", // green
        bearish: "#ea3943", // red
        muted: "#71717a",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
