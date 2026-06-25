import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

// Critical-flow smoke (PRD §23): the Electron app launches, opens its window and
// renders the shell. Feature flows (open project, record, compile, run) are added
// by their epics. Requires `npm run build:renderer && npm run build:main` first
// (the pretest:e2e hook does this).
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAIN_ENTRY = join(repoRoot, "dist", "main", "main.js");

test("launches and renders the app shell", async () => {
  const app = await electron.launch({ args: [MAIN_ENTRY] });
  try {
    const window = await app.firstWindow();
    await expect(window.getByRole("heading", { name: /recrd-agile-testing/i })).toBeVisible();
  } finally {
    await app.close();
  }
});
