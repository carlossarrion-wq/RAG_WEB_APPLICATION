/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores principales del dashboard.css
        primary: {
          DEFAULT: '#1e4a72',
          light: '#2d5aa0',
          dark: '#1a3d5c',
        },
        secondary: {
          DEFAULT: '#2d5aa0',
          light: '#3498db',
          dark: '#1e4a72',
        },
        success: {
          DEFAULT: '#27ae60',
          light: '#2ecc71',
          dark: '#229954',
        },
        warning: {
          DEFAULT: '#e67e22',
          light: '#f39c12',
          dark: '#d35400',
        },
        error: {
          DEFAULT: '#f56565',
          light: '#e74c3c',
          dark: '#c0392b',
        },
        info: {
          DEFAULT: '#3498db',
          light: '#5dade2',
          dark: '#2980b9',
        },
        gray: {
          50: '#f8f9fa',
          100: '#f9fafb',
          200: '#edf2f7',
          300: '#e2e8f0',
          400: '#cbd5e0',
          500: '#a0aec0',
          600: '#718096',
          700: '#4a5568',
          800: '#2d3748',
          900: '#1a202c',
        },
        // Colores específicos del dashboard
        background: '#f8f9fa',
        card: '#ffffff',
        border: '#dee2e6',
        'border-light': '#eee',
        'text-muted': '#6c757d',
        'text-dark': '#1e4a72',
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'focus': '0 0 0 2px rgba(30, 74, 114, 0.25)',
      },
      borderRadius: {
        'card': '8px',
        'button': '4px',
        'badge': '12px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
