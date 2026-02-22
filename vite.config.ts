import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
