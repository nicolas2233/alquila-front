/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}", "./src/**/*.html"],
  theme: {
    extend: {
      colors: {
        night: {
          900: "#0e1116",
          800: "#141821",
          700: "#1b1f2b",
          600: "#232a38",
        },
        gold: {
          500: "#caa56a",
          400: "#e0c08a",
        },
        accent: {
          500: "#8da2ff",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 20px 50px rgba(0, 0, 0, 0.45)",
        soft: "0 10px 30px rgba(0, 0, 0, 0.35)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.8s ease both",
      },
      backgroundImage: {
        hero: "linear-gradient(120deg, rgba(14, 17, 22, 0.1), rgba(14, 17, 22, 0.85)), url('https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1400&q=80')",
      },
    },
  },
  plugins: [],
};
