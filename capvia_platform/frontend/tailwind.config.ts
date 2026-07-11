import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "/Volumes/KINGSTON/CAPVIA/infrastructure/shared_ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ── Brand Color Palette ─────────────────────────── */
      colors: {
        primary: {
          50:  '#E8F0FB',
          100: '#C6D8F6',
          200: '#9CBDED',
          300: '#72A2E4',
          400: '#4D8EDD',
          500: '#2979D6',
          DEFAULT: '#0D47A1',
          600: '#0D47A1',
          700: '#0A3B85',
          800: '#072E69',
          900: '#04214D',
          950: '#021433',
          hover: '#0A3B85',
          light: '#E8F0FB',
          dark:  '#072E69',
        },
        secondary: {
          50:  '#E3F4FE',
          100: '#BAE5FD',
          200: '#87D3FC',
          300: '#54C0FA',
          400: '#21AEF9',
          DEFAULT: '#42A5F5',
          500: '#1E96F5',
          600: '#0D84E8',
          700: '#0A6CC0',
          800: '#075498',
          900: '#043D70',
          hover: '#1E88E5',
          light: '#E3F4FE',
          dark:  '#0A6CC0',
        },
        accent: {
          DEFAULT: '#FFC107',
          hover:   '#FFB300',
          light:   '#FFF8E1',
          dark:    '#F57F17',
        },
        success: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          DEFAULT: '#10B981',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          hover:  '#059669',
          light:  '#ECFDF5',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
          600: '#D97706',
          hover:  '#D97706',
          light:  '#FFFBEB',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          DEFAULT: '#EF4444',
          500: '#EF4444',
          600: '#DC2626',
          hover:  '#DC2626',
          light:  '#FEF2F2',
        },
        /* App shell surfaces */
        background:   '#FFFFFF',
        surface: {
          canvas:  '#F4F6F9',
          base:    '#FAFBFC',
          card:    '#FFFFFF',
          subtle:  '#F1F4F8',
          inset:   '#EDF0F4',
          DEFAULT: '#F8FAFC',
        },
        /* Sidebar dark system */
        sidebar: {
          DEFAULT: '#0B1D3A',
          hover:   '#0F2447',
          active:  '#132D56',
          border:  'rgba(255,255,255,0.06)',
        },
        /* Dark cosmos */
        cosmos: {
          950: '#030914',
          900: '#050F20',
          800: '#08152E',
          700: '#0B1D3A',
          600: '#0F2447',
          500: '#162E5C',
          400: '#1E3A6E',
        },
      },

      /* ── Typography ──────────────────────────────────── */
      fontFamily: {
        heading: ['var(--font-outfit)', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-inter)',  '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:    ['var(--font-jetbrains-mono)', 'Fira Code', 'Cascadia Code', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem',  { lineHeight: '0.875rem' }],
        'xs':  ['0.6875rem', { lineHeight: '1rem' }],
        'sm':  ['0.8125rem', { lineHeight: '1.25rem' }],
        'base':['0.875rem',  { lineHeight: '1.5rem' }],
        'md':  ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg':  ['1rem',      { lineHeight: '1.625rem' }],
        'xl':  ['1.125rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.375rem',  { lineHeight: '1.875rem' }],
        '3xl': ['1.75rem',   { lineHeight: '2.125rem' }],
        '4xl': ['2.25rem',   { lineHeight: '2.625rem' }],
        '5xl': ['3rem',      { lineHeight: '1' }],
        '6xl': ['3.75rem',   { lineHeight: '1' }],
        '7xl': ['4.5rem',    { lineHeight: '1' }],
        '8xl': ['6rem',      { lineHeight: '1' }],
        '9xl': ['8rem',      { lineHeight: '1' }],
      },

      /* ── Spacing ─────────────────────────────────────── */
      spacing: {
        '4.5':  '1.125rem',
        '5.5':  '1.375rem',
        '6.5':  '1.625rem',
        '7.5':  '1.875rem',
        '8.5':  '2.125rem',
        '9.5':  '2.375rem',
        '13':   '3.25rem',
        '15':   '3.75rem',
        '17':   '4.25rem',
        '18':   '4.5rem',
        '22':   '5.5rem',
        '26':   '6.5rem',
        '30':   '7.5rem',
      },

      /* ── Border Radius ───────────────────────────────── */
      borderRadius: {
        'xs':   '4px',
        'sm':   '8px',
        'md':   '12px',
        'lg':   '16px',
        'xl':   '20px',
        '2xl':  '24px',
        '3xl':  '32px',
        'card':    '20px',
        'button':  '16px',
        'input':   '12px',
        'dialog':  '24px',
        'sidebar': '12px',
      },

      /* ── Shadow / Elevation ──────────────────────────── */
      boxShadow: {
        '0':  'none',
        '1':  '0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
        '2':  '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        '3':  '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
        '4':  '0 8px 32px rgba(0,0,0,0.1),  0 4px 12px rgba(0,0,0,0.06)',
        '5':  '0 16px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)',
        /* Legacy aliases */
        'soft':         '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'professional': '0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.05)',
        'minimal':      '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        /* Brand shadows */
        'primary':   '0 4px 20px rgba(13,71,161,0.18),  0 2px 8px rgba(13,71,161,0.1)',
        'primary-lg':'0 8px 40px rgba(13,71,161,0.25),  0 4px 16px rgba(13,71,161,0.15)',
        'blue':      '0 4px 20px rgba(66,165,245,0.2),  0 2px 8px rgba(66,165,245,0.1)',
        'green':     '0 4px 16px rgba(16,185,129,0.18), 0 2px 6px rgba(16,185,129,0.1)',
        'dark':      '0 32px 96px rgba(3,9,20,0.85),    0 16px 40px rgba(3,9,20,0.5)',
        /* Glass / glow */
        'glow-blue': '0 0 24px rgba(66,165,245,0.3), 0 0 8px rgba(66,165,245,0.15)',
        'glow-primary': '0 0 32px rgba(13,71,161,0.35)',
        /* Inset */
        'inner-sm':  'inset 0 1px 2px rgba(0,0,0,0.06)',
        'inner-md':  'inset 0 2px 6px rgba(0,0,0,0.08)',
      },

      /* ── Backgrounds ─────────────────────────────────── */
      backgroundImage: {
        'gradient-primary':  'linear-gradient(135deg, #0D47A1, #42A5F5)',
        'gradient-primary-v':'linear-gradient(180deg, #0D47A1, #1976D2)',
        'gradient-warm':     'linear-gradient(135deg, #42A5F5, #1976D2, #FFC107)',
        'gradient-hero':     'linear-gradient(135deg, #030914 0%, #08152E 50%, #0B1D3A 100%)',
        'gradient-card':     'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
        'dot-pattern':       'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
        'dot-light':         'radial-gradient(rgba(15,23,42,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-sm': '20px 20px',
        'dot-md': '28px 28px',
        'dot-lg': '40px 40px',
      },

      /* ── Animation & Transition ──────────────────────── */
      transitionTimingFunction: {
        'out-expo':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':     'cubic-bezier(0.4, 0, 0.2, 1)',
        'sidebar':    'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '50':  '50ms',
        '80':  '80ms',
        '120': '120ms',
        '180': '180ms',
        '220': '220ms',
        '250': '250ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1000':'1000ms',
        '1200':'1200ms',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',   opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        'shimmer':        'shimmer 1.4s ease-in-out infinite',
        'fade-in':        'fade-in 0.3s ease-out both',
        'slide-down':     'slide-down 0.2s ease-out both',
        'scale-in':       'scale-in 0.2s ease-out both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
        'pulse-ring':     'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },

      /* ── Screen Breakpoints ──────────────────────────── */
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl':'1440px',
        '3xl':'1920px',
      },
    },
  },
  plugins: [],
};

export default config;
