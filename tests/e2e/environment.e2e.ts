import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers/launch.js";
import { makeTempDir, removeDir } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.14): the Environment screen probes the real
// toolchain against the active project's Robot path. A freshly scaffolded repo
// has no virtualenv, so the check reports it incomplete, offers an install plan,
// and the 1-click install streams progress to completion through the
// deterministic install seam (RECRD_E2E_FAKE_RUNNER).

test("environment check reflects real state and the install streams to done", async () => {
  const repoRoot = makeTempDir("recrd-e2e-env-");
  const app = await launchApp({
    env: { RECRD_E2E_DIALOG_DIR: repoRoot, RECRD_E2E_FAKE_RUNNER: "1" },
  });
  const { window } = app;
  try {
    // Scaffold a project so the Environment screen has a real Robot path to probe.
    await window.getByTestId("nav-home").click();
    await window.getByRole("button", { name: "Novo Projeto" }).click();
    await window.getByTestId("new-project-name").fill("Projeto Ambiente");
    await window.getByTestId("new-project-repo-new").check();
    await window.getByTestId("new-project-submit").click();

    await window.getByTestId("nav-environment").click();

    // The check renders a status row per probed tool, and the freshly scaffolded
    // repo (no .venv) is reported incomplete.
    const status = window.getByTestId("environment-status");
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("data-ready", "false");
    await expect(window.getByTestId("environment-status-row")).toHaveCount(4);
    await expect(
      window.locator('[data-testid="environment-status-row"][data-ok="false"]'),
    ).not.toHaveCount(0);

    // It offers a concrete install plan.
    await expect(window.getByTestId("install-plan-step")).not.toHaveCount(0);

    // The 1-click install streams a progress line per command and finishes.
    await window.getByTestId("install-button").click();
    const progress = window.getByTestId("install-progress");
    await expect(progress).toBeVisible();
    await expect(progress).toContainText("[e2e] executando:");

    // env:install:done re-enables the button (no longer "Instalando…").
    await expect(window.getByTestId("install-button")).toHaveText(/Instalar ambiente/);
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
