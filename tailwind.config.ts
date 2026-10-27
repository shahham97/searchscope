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
        // Retro Radiance & Vintage Cassette Palette
        retro: {
          orange: "#FF5A1F",
          "orange-hover": "#E64A14",
          "orange-light": "#FF7A45",
          "orange-glow": "#FFA07A",
          cream: "#FAF6F0",
          "cream-light": "#FFFDF9",
          "cream-card": "#FFFFFF",
          "cream-dark": "#F3EDE2",
          sand: "#E8DFD1",
          charcoal: "#181716",
          "charcoal-card": "#211F1D",
          "charcoal-border": "#332F2B",
          teal: "#1C8A8A",
          "teal-light": "#2A9D8F",
          amber: "#E5A00D",
          terracotta: "#C85A32",
        },
        // Mapped for backwards-compatibility so all components adopt the Retro Radiance theme
        jet: {
          950: "#141312", // Vintage Deep Cassette Black
          900: "#1C1A18", // Vintage Chassis
          850: "#24211F", // Tape Deck Surface
          800: "#2F2B28", // Analogue Border
          700: "#443F3A", // Muted Divider
          600: "#5D5650",
          500: "#7A726A",
        },
        cerulean: {
          DEFAULT: "#FF5A1F", // Retro Orange Primary
          glow: "#FF7A45",
          light: "#FF9E79",
          dark: "#E64A14",
          deep: "#C83A06",
          muted: "rgba(255, 90, 31, 0.15)",
        },
        neon: {
          DEFAULT: "#1C8A8A", // Vintage Cassette Teal Accent
          glow: "#2A9D8F",
          light: "#52B788",
          dark: "#146565",
          deep: "#0F4C4C",
          muted: "rgba(28, 138, 138, 0.15)",
        },
        scope: {
          50: "#fffdfa",
          100: "#faf6f0",
          200: "#f3ede2",
          300: "#e8dfd1",
          400: "#d3c4b0",
          500: "#b5a28c",
          600: "#8e7b65",
          700: "#695947",
          800: "#45392d",
          900: "#292119",
          950: "#141312",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Fraunces", "serif"],
        script: ["var(--font-script)", "Playfair Display", "Fraunces", "serif"],
        retro: ["var(--font-retro)", "Plus Jakarta Sans", "Outfit", "sans-serif"],
        orbitron: ["var(--font-retro)", "Plus Jakarta Sans", "Outfit", "sans-serif"],
        rajdhani: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "Space Mono", "JetBrains Mono", "monospace"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "retro-orange": "0 8px 25px -4px rgba(255, 90, 31, 0.45)",
        "retro-card": "0 10px 30px -5px rgba(20, 19, 18, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
        "retro-card-warm": "0 10px 30px -5px rgba(60, 40, 20, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)",
        "glow-cerulean": "0 8px 25px -4px rgba(255, 90, 31, 0.45)",
        "glow-cerulean-lg": "0 15px 40px -5px rgba(255, 90, 31, 0.55)",
        "glow-rose": "0 8px 25px -4px rgba(28, 138, 138, 0.45)",
        "glow-rose-lg": "0 15px 40px -5px rgba(28, 138, 138, 0.55)",
        "glow-dual": "0 0 30px rgba(255, 90, 31, 0.25), 0 0 30px rgba(28, 138, 138, 0.25)",
        "cyber-card": "0 10px 30px -5px rgba(20, 19, 18, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "spin-reverse": "spin 8s linear infinite reverse",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
