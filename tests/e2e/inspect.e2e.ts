import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers/launch.js";
import { hoverInSandbox, isSandboxAttached, loadFixture } from "./helpers/sandbox.js";

// Real-flow E2E (electron-bzv.18): arm Inspect mode and hover a real element in
// the sandbox fixture, then assert the Inspector panel surfaces that element's
// actual tag/id and a selector targeting it — driven through the real content
// script, not a stubbed payload.

test("Inspect mode surfaces the real element hovered in the sandbox", async () => {
  const app = await launchApp();
  const { window } = app;
  try {
    await window.getByTestId("nav-automation").click();
    await expect.poll(() => isSandboxAttached(app.app)).toBe(true);
    await loadFixture(app.app);

    // Arm Inspect mode (this tells the sandbox content-script to start snapshotting
    // the element under the cursor over `inspect:hover`).
    await window.getByTestId("inspect-toggle").check();
    await expect(window.getByTestId("inspect-toggle")).toBeChecked();

    // Hover the submit button; its real descriptor must reach the panel.
    await hoverInSandbox(app.app, "#submit");

    await expect(window.getByTestId("inspected-element")).toBeVisible();
    await expect(window.getByTestId("inspected-tag")).toHaveText("button");
    await expect(window.getByTestId("inspected-id")).toHaveText("submit");
    // The suggested selector must actually target the hovered element (#submit).
    await expect(window.getByTestId("inspected-selector")).toContainText("submit");
  } finally {
    await app.close();
  }
});
