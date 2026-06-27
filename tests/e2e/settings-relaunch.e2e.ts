import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchApp } from "./helpers/launch.js";
import { removeDir } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.17): settings edited in one run must survive a full
// app relaunch (persisted to electron-store under userData) and be re-applied to
// the form — proving real persistence, not in-memory state.

/** Reloads the Settings screen so the form re-fetches the persisted values. */
async function openSettings(window: Page): Promise<void> {
  await window.getByTestId("nav-home").click();
  await window.getByTestId("nav-settings").click();
}

test("settings survive an app relaunch and are re-applied", async () => {
  // A shared userData dir reused across both launches; removed at the end.
  const userDataDir = mkdtempSync(join(tmpdir(), "recrd-e2e-settings-"));
  try {
    const first = await launchApp({ userDataDir });
    try {
      await first.window.getByTestId("nav-settings").click();
      const python = first.window.getByTestId("settings-python");
      const screenshots = first.window.getByTestId("settings-capture-screenshots");

      const wasChecked = await screenshots.isChecked();
      await python.fill("C:/tools/python/python.exe");
      await screenshots.setChecked(!wasChecked);
      await first.window.getByTestId("settings-save").click();

      // Re-open Settings in the same session: the form re-fetches from the store,
      // so seeing the new value confirms the write landed (a sync barrier before
      // we relaunch and read it back from disk).
      await openSettings(first.window);
      await expect(first.window.getByTestId("settings-python")).toHaveValue(
        "C:/tools/python/python.exe",
      );

      // Relaunch against the same userData dir; the persisted values must reload.
      const second = await launchApp({ userDataDir });
      try {
        await openSettings(second.window);
        await expect(second.window.getByTestId("settings-python")).toHaveValue(
          "C:/tools/python/python.exe",
        );
        await expect(second.window.getByTestId("settings-capture-screenshots")).toBeChecked({
          checked: !wasChecked,
        });
      } finally {
        await second.close();
      }
    } finally {
      await first.close();
    }
  } finally {
    removeDir(userDataDir);
  }
});
