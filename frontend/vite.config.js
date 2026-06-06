import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mobile-first SPA dev server. Proxies /api to the Express backend on :4000
// so the frontend can call relative paths and avoid CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
