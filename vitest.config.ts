import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Base Vitest configuration. Deeper test-infra concerns (coverage gates,
// environment-per-layer, Playwright/E2E) are owned by the testing epic; this
// keeps `npm test` green for the domain/application/infrastructure suites.
export default defineConfig({
  resolve: {
    alias: {
      "@domain": resolve(__dirname, "src/domain"),
      "@application": resolve(__dirname, "src/application"),
      "@main": resolve(__dirname, "src/main"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    passWithNoTests: true,
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
