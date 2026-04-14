import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_PORT = 4173;
const API_PROXY_TARGET = "http://localhost:3001";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Prefer 4173 for local development, but let Vite pick the next free port
    // instead of crashing when another frontend instance is already running.
    port: WEB_PORT,
    strictPort: false,
    proxy: {
      "/api": API_PROXY_TARGET,
    },
  },
  preview: {
    port: WEB_PORT,
    strictPort: false,
  },
});
