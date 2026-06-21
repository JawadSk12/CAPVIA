import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        indigo: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        // Secondary / success
        emerald: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        // Warning
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        // Danger
        rose: {
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        },
        // Neutral text
        slate: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-indigo": "0 0 20px rgba(79, 70, 229, 0.25)",
        "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.25)",
        "glow-rose":   "0 0 20px rgba(244, 63, 94, 0.25)",
        "card": "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 24px rgba(79, 70, 229, 0.15)",
        "floating": "0 8px 32px rgba(0,0,0,0.12)",
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease forwards",
        "slide-up":  "slideUp 0.4s ease forwards",
        "slide-in":  "slideIn 0.3s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
        "shimmer":   "shimmer 1.5s infinite",
        "scale-in":  "scaleIn 0.2s ease forwards",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" },                "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideIn:  { "0%": { opacity: "0", transform: "translateX(-16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        bounceGentle: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-gradient": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #10B981 100%)",
        "card-gradient": "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
