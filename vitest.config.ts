import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Base Vitest configuration. Deeper test-infra concerns (coverage gates,
// environment-per-layer, Playwright/E2E) are owned by the testing epic; this
// keeps `npm test` green for the domain/application/infrastructure suites.
export default defineConfig({
  // Component tests use the automatic JSX runtime, matching the renderer build.
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  resolve: {
    alias: {
      "@domain": resolve(__dirname, "src/domain"),
      "@application": resolve(__dirname, "src/application"),
      "@main": resolve(__dirname, "src/main"),
      "@renderer": resolve(__dirname, "src/renderer"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  test: {
    globals: true,
    // Default to Node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock (see tests/renderer).
    environment: "node",
    passWithNoTests: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.tsx"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/domain/**", "src/application/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
