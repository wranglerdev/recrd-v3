import { defineConfig } from "@playwright/test";

// E2E configuration for the Electron app (PRD §23). Tests drive a real packaged
// main process via Playwright's Electron driver and cover only critical flows.
// Requires a prior build (handled by the `pretest:e2e` npm hook); on headless CI
// run under xvfb.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    trace: "on-first-retry",
  },
});
