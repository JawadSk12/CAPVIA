import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "/Volumes/KINGSTON/CAPVIA/infrastructure/shared_ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D47A1',
          hover: '#0A3B85',
          light: '#E3F2FD',
          dark: '#0A3066',
        },
        secondary: {
          DEFAULT: '#42A5F5',
          hover: '#1E88E5',
          light: '#E1F5FE',
          dark: '#1565C0',
        },
        accent: {
          DEFAULT: '#FFC107',
          hover: '#FFB300',
          light: '#FFF8E1',
          dark: '#F57F17',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#ECFDF5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          light: '#FEF2F2',
        },
        background: '#FFFFFF',
        surface: '#F8FAFC',
        
        // Neutral palette fallback for compatibility
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        heading: ['var(--font-outfit)', 'Inter', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        button: '16px',
        input: '16px',
        dialog: '24px',
      },
      boxShadow: {
        soft: '0 4px 10px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        professional: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
        minimal: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease forwards",
        "slide-up":  "slideUp 0.4s ease forwards",
        "slide-in":  "slideIn 0.3s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" },                "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideIn:  { "0%": { opacity: "0", transform: "translateX(-16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;

