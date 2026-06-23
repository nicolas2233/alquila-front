import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa el core de React/Router del código de la app (mejor cache).
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Leaflet solo se usa en rutas lazy de mapa: queda en su propio chunk diferido.
          "leaflet-vendor": ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 120,
      awaitWriteFinish: {
        stabilityThreshold: 220,
        pollInterval: 100,
      },
    },
  },
});
