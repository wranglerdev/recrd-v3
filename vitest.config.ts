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
      reporter: ["text", "html", "lcov"],
      all: true,
      // Platform-agnostic, unit-testable code must stay at 100% (PRD §22, §28).
      // Electron-coupled entry points/adapters are integration-tested instead and
      // are excluded here; barrels (index.ts) are re-exports with no logic.
      include: [
        "src/domain/**",
        "src/application/**",
        "src/shared/**",
        "src/main/di/**",
        "src/main/app/**",
        "src/main/infrastructure/**",
        "src/main/ipc/**",
        "scripts/lib/release-format.ts",
        "scripts/lib/release-artifacts.ts",
      ],
      exclude: [
        "**/index.ts",
        "**/*.d.ts",
        "src/main/main.ts",
        "src/main/infrastructure/logging/electron-logger.ts",
        "src/main/infrastructure/config/electron-store-config.ts",
        "src/main/infrastructure/auth/windows-user-context.ts",
        "src/main/infrastructure/auth/user-context-factory.ts",
        "src/main/infrastructure/robot/robot-runner.ts",
        "src/main/infrastructure/dialog/csv-file-dialog.ts",
        "src/main/infrastructure/dialog/directory-dialog.ts",
        "src/main/infrastructure/shell/external-opener.ts",
        "src/main/sandbox/sandbox-view.ts",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
