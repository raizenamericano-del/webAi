import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        neon: {
          cyan: "#00f0ff",
          magenta: "#ff00e5",
          violet: "#7c3aed",
          lime: "#a3ff12",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        glitch: {
          "0%,100%": { transform: "translate(0)", filter: "none" },
          "20%": { transform: "translate(-2px, 2px)", filter: "hue-rotate(45deg)" },
          "40%": { transform: "translate(2px, -2px)" },
          "60%": { transform: "translate(-2px, -1px)", filter: "hue-rotate(-45deg)" },
          "80%": { transform: "translate(1px, 2px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 12px 0 rgba(0,240,255,.35)" },
          "50%": { boxShadow: "0 0 26px 6px rgba(255,0,229,.35)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        glitch: "glitch 2.5s infinite",
        "fade-up": "fade-up .6s ease-out both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        scan: "scan 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
