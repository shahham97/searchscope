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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Robotic Jet Black Palette
        jet: {
          950: "#040507",
          900: "#07080D",
          850: "#0B0D14",
          800: "#10131E",
          700: "#171B2B",
          600: "#21263B",
          500: "#323A56",
        },
        // Cerulean Blue Palette
        cerulean: {
          DEFAULT: "#00A8FF",
          glow: "#38BDF8",
          light: "#70D6FF",
          dark: "#0077B6",
          deep: "#023E8A",
          muted: "rgba(0, 168, 255, 0.15)",
        },
        // Neon Rose Palette
        neon: {
          DEFAULT: "#FF007F",
          glow: "#FF2A85",
          light: "#FF5EAA",
          dark: "#D0006F",
          deep: "#8F004C",
          muted: "rgba(255, 0, 127, 0.15)",
        },
        scope: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "Orbitron", "sans-serif"],
        rajdhani: ["var(--font-rajdhani)", "Rajdhani", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-cerulean": "0 0 25px rgba(0, 168, 255, 0.35)",
        "glow-cerulean-lg": "0 0 50px rgba(0, 168, 255, 0.45)",
        "glow-rose": "0 0 25px rgba(255, 0, 127, 0.35)",
        "glow-rose-lg": "0 0 50px rgba(255, 0, 127, 0.45)",
        "glow-dual": "0 0 30px rgba(0, 168, 255, 0.25), 0 0 30px rgba(255, 0, 127, 0.25)",
        "cyber-card": "0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scanline": "scanline 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
