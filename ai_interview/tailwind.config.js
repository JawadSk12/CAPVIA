/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
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
        
        // Dark theme override legacy preservation
        dark: {
          bg: '#0F1117',
          card: '#1F2430',
          border: '#2D3748',
        }
      },
      fontFamily: {
        heading: ['Outfit', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}