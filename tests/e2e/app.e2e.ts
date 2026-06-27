import { expect, test, type Page } from "@playwright/test";
import { launchApp } from "./helpers/launch.js";

// Critical-flow E2E (PRD §23). Drives the real Electron app through the flows that
// need no native dialog or external tooling: launch + shell, sidebar navigation,
// the recording lifecycle controls, Inspect mode, and settings persistence across
// a round-trip to the main process. Flows that depend on a native folder/CSV
// dialog (create project, import mass) or on Robot being installed (execute) are
// covered by stubbed harnesses, not here.
//
// Requires `npm run build:renderer && npm run build:main` first (the pretest:e2e
// hook) AND the native modules rebuilt for Electron's ABI (see electron-9ac):
// `npx electron-builder install-app-deps`. Each test gets an isolated userData
// dir (via the shared launchApp helper) so settings/db never bleed between runs.

/** Clicks a primary sidebar destination by its visible label. */
async function navigate(window: Page, label: RegExp): Promise<void> {
  await window
    .getByRole("navigation", { name: /Navegação principal/i })
    .getByRole("button", { name: label })
    .click();
}

test("launches and renders the app shell", async () => {
  const { app, window } = await launchApp();
  try {
    await expect(window.getByRole("heading", { name: /recrd-agile-testing/i })).toBeVisible();
  } finally {
    await app.close();
  }
});

test("navigates the primary destinations from the sidebar", async () => {
  const { app, window } = await launchApp();
  try {
    await navigate(window, /Automação/);
    await expect(window.getByRole("region", { name: "Timeline" })).toBeVisible();
    await expect(window.getByRole("region", { name: "Inspector" })).toBeVisible();

    await navigate(window, /Configurações/);
    await expect(window.getByRole("heading", { name: "Configurações" })).toBeVisible();

    await navigate(window, /Sobre/);
    await expect(window.getByRole("heading", { name: "Sobre" })).toBeVisible();
  } finally {
    await app.close();
  }
});

test("drives the recording lifecycle controls", async () => {
  const { app, window } = await launchApp();
  try {
    await navigate(window, /Automação/);
    const recording = window.getByRole("region", { name: "Gravação" });
    await expect(recording).toContainText("Parada");

    await recording.getByRole("button", { name: "Gravar" }).click();
    await expect(recording).toContainText("Gravando");

    await recording.getByRole("button", { name: "Pausar" }).click();
    await expect(recording).toContainText("Pausada");

    await recording.getByRole("button", { name: "Retomar" }).click();
    await expect(recording).toContainText("Gravando");

    await recording.getByRole("button", { name: "Parar" }).click();
    await expect(recording).toContainText("Parada");
  } finally {
    await app.close();
  }
});

test("toggles Inspect mode in the Element Inspector panel", async () => {
  const { app, window } = await launchApp();
  try {
    await navigate(window, /Automação/);
    const inspector = window.getByRole("region", { name: "Inspector" });
    const toggle = inspector.getByRole("checkbox", { name: /Modo Inspect/i });
    await expect(toggle).not.toBeChecked();

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(inspector).toContainText(/passe o mouse/i);
  } finally {
    await app.close();
  }
});

test("persists a settings change across navigation (IPC round-trip)", async () => {
  const { app, window } = await launchApp();
  try {
    // A fresh checkbox locator each time, since save→reload remounts the form.
    const screenshots = (): ReturnType<Page["getByRole"]> =>
      window
        .getByRole("form", { name: "Configurações" })
        .getByRole("checkbox", { name: /Capturar screenshots/i });

    await navigate(window, /Configurações/);
    const wasChecked = await screenshots().isChecked();
    await screenshots().setChecked(!wasChecked);
    await window
      .getByRole("form", { name: "Configurações" })
      .getByRole("button", { name: /Salvar/i })
      .click();

    // The save IPC resolves and triggers a reload that re-fetches from the store;
    // give the (synchronous) persist + reload a moment before leaving the screen.
    await window.waitForTimeout(300);

    // Round-trip: leave and come back; the persisted value is reloaded from store
    // (a fresh getSettings), proving it was written and not just held in local UI.
    await navigate(window, /Início/);
    await navigate(window, /Configurações/);
    await expect(screenshots()).toBeChecked({ checked: !wasChecked });
  } finally {
    await app.close();
  }
});
