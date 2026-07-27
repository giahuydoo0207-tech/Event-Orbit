/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Open Campus 2026 Brand Bible Palette
        oc: {
          blue: '#141BEB',       // Primary Brand Color
          turquoise: '#00EDBE',  // Accent (Used sparingly for highlights)
          indigo: '#7075FF',     // Supporting CTA / Hover
          periwinkle: '#C2C7FB', // Light borders & subtle cards
          mist: '#EFF1FF',       // Surface & background
          navy: '#07094D',       // Dark background & Sidebar
          ink: '#252021',        // Primary typography
        },
        // Mapped legacy utility aliases for seamless backwards compatibility
        navy: {
          DEFAULT: '#141BEB',
          light: '#7075FF',
          dark: '#07094D',
        },
        accent: {
          blue: '#141BEB',
          hover: '#7075FF',
          turquoise: '#00EDBE',
        },
        surface: '#EFF1FF',
        border: '#C2C7FB',
        text: {
          primary: '#252021',
          secondary: '#64748b',
        },
        success: '#10b981',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
