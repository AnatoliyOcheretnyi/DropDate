import { defineConfig } from "vitest/config";

export default defineConfig({
  // Component tests are .tsx; without the automatic runtime esbuild emits
  // React.createElement calls into files that never import React.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next*/**"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
