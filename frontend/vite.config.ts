/** Vite config — Telegram miniapp frontend */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  /* Явно цепляем PostCSS (tailwind) — в части сценариев Vite 8 иначе не подхватывал postcss.config */
  css: {
    postcss: path.resolve(__dirname, "postcss.config.cjs"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo-shared": path.resolve(__dirname, "../src/shared"),
    },
  },
});