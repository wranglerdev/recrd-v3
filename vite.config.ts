import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Renderer-only Vite config. The main and preload processes are bundled with
// esbuild (see scripts/build-main.ts). The renderer never accesses Node, the
// database or the filesystem directly — all access flows through typed IPC.
export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@domain": resolve(__dirname, "src/domain"),
      "@application": resolve(__dirname, "src/application"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    sourcemap: true,
    target: "chrome128",
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
