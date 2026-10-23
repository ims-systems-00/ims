import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // pdfjs-dist (used lazily by the signature placement editor) ships
  // top-level await in both its modern and legacy builds. Vite's default
  // target (es2020 / chrome87 / safari14 …) makes esbuild reject that
  // during dependency optimisation, which white-screened the whole app
  // when the Request Signature dialog loaded pdf.js. es2022 supports
  // top-level await and is safe for every browser Vite 6 targets.
  build: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
