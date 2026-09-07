/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}", "./src/**/*.html"],
  theme: {
    extend: {
      colors: {
        night: {
          900: "#3A342F",
          800: "#474440",
          700: "#5A534C",
          600: "#6B645D",
        },
        gold: {
          100: "#E7E2DD",
          200: "#D1C7BD",
          300: "#AF8C5C",
          500: "#AF8C5C",
          400: "#D1C7BD",
        },
        accent: {
          500: "#E7E2DD",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      // Escala tipografica subida un escalon respecto de la de Tailwind.
      //
      // Medido sobre la home: el 56% de los bloques de texto estaba en 12px o menos, y
      // text-xs (12px) es el tamaño de cuerpo dominante en toda la app, con 774 usos.
      // Quien compra una casa en Bragado suele tener entre 35 y 65 años: a los 50 leer
      // 12px en un celular ya incomoda. Subir la escala desde la config levanta esos usos
      // de una vez, en vez de tocar cientos de clases y arriesgar inconsistencias.
      //
      // El interlineado va explicito porque al cambiar el tamaño Tailwind pierde el suyo.
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }], // 13px (era 12)
        sm: ["0.9375rem", { lineHeight: "1.35rem" }], // 15px (era 14)
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
        hero: "linear-gradient(120deg, rgba(58, 52, 47, 0.08), rgba(58, 52, 47, 0.52)), url('https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1400&q=80')",
      },
    },
  },
  plugins: [],
};
