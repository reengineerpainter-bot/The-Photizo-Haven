import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        haven: {
          bg: "#0a0a12",
          surface: "#12121f",
          glass: "rgba(18, 18, 31, 0.72)",
          cyan: "#00e5ff",
          emerald: "#00ff9d",
          purple: "#6b21a8",
          muted: "#8b8ba3",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 229, 255, 0.25)",
        "glow-emerald": "0 0 24px rgba(0, 255, 157, 0.25)",
      },
      backdropBlur: {
        glass: "16px",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
