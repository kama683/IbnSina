import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

// Бэкенд FastAPI. В dev браузер ходит на относительный /api, а Vite
// проксирует его сюда — так всё same-origin: CORS не нужен, httpOnly-cookie
// (access_token path=/, refresh_token path=/api/auth, SameSite=Lax) работают
// как есть. В проде то же самое делает reverse proxy перед статикой dist/.
const API_TARGET = process.env.VITE_DEV_API_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // сценарии с userEvent.type в jsdom при параллельном запуске файлов могут не
    // уложиться в 5 с по умолчанию — это не ошибка кода
    testTimeout: 20_000,
  },
});
