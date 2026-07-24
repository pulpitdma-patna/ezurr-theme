import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Use esbuild's automatic JSX runtime instead of @vitejs/plugin-react
  // (whose newer release pulls a rolldown native binding).
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "happy-dom",
    // Don't let happy-dom actually fetch iframe src attributes (the CMS sandbox
    // frame points at the API); we only assert on the rendered element.
    environmentOptions: {
      happyDOM: { settings: { disableIframePageLoading: true } },
    },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Only unit/component specs — Playwright e2e lives under /e2e.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
