import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const crossOriginIsolationHeaders = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const basePath = process.env.GITHUB_ACTIONS ? "/chess-coach/" : "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  worker: {
    format: "es",
  },
});
