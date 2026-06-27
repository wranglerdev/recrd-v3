import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { listDir, makeTempDir, readFileIn, removeDir } from "./helpers/fs.js";
import {
  clickInSandbox,
  fillInSandbox,
  isSandboxAttached,
  loadFixture,
} from "./helpers/sandbox.js";

// Real-flow E2E (electron-bzv.11): export a recorded case and assert the produced
// artifacts on disk — a manual-script `.recrd.json` and a compiled `.robot`,
// written into the userData exports dir — not just that the export status changed.

interface IdRow {
  readonly id: string;
}

async function submitForm(window: Page, formName: RegExp, value: string): Promise<void> {
  const form = window.getByRole("form", { name: formName });
  await form.getByRole("textbox").fill(value);
  await form.getByRole("button").click();
}

function nodeById(window: Page, id: string): ReturnType<Page["locator"]> {
  return window.locator(`[data-testid="tree-node"][data-node-id="${id}"]`);
}

async function onlyId(app: LaunchedApp, table: string): Promise<string> {
  const [row] = await queryDb<IdRow>(app.app, {
    dbPath: app.paths.database,
    sql: `SELECT id FROM ${table} ORDER BY created_at`,
  });
  if (row === undefined) {
    throw new Error(`no row in ${table}`);
  }
  return row.id;
}

test("exports a recorded case to a real .recrd.json and .robot on disk", async () => {
  const repoRoot = makeTempDir("recrd-e2e-export-");
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  const { window } = app;
  try {
    // Scaffold a project (export:robot compiles, which needs a robotPath).
    await window.getByTestId("nav-home").click();
    await window.getByRole("button", { name: "Novo Projeto" }).click();
    await window.getByTestId("new-project-name").fill("Projeto Export");
    await window.getByTestId("new-project-repo-new").check();
    await window.getByTestId("new-project-submit").click();

    await window.getByTestId("nav-explorer").click();
    await nodeById(window, await onlyId(app, "projects")).click();
    await submitForm(window, /Novo Plano/i, "Plano Export");
    await nodeById(window, await onlyId(app, "plans")).click();
    await submitForm(window, /Novo Suíte/i, "Suíte Export");
    await nodeById(window, await onlyId(app, "suites")).click();
    await submitForm(window, /Novo Caso/i, "Caso Export");
    await nodeById(window, await onlyId(app, "cases")).click();

    // Record a couple of actions so the case has a manual script to export.
    await window.getByTestId("nav-automation").click();
    await expect.poll(() => isSandboxAttached(app.app)).toBe(true);
    await window.getByTestId("recording-start").click();
    await loadFixture(app.app);
    await fillInSandbox(app.app, "#username", "alice");
    await clickInSandbox(app.app, "#submit");
    await expect.poll(() => window.getByTestId("timeline-step").count()).toBeGreaterThanOrEqual(2);

    // Export writes both artifacts and reports their paths.
    await window.getByRole("button", { name: "Exportar" }).click();
    await expect(window.getByTestId("export-status")).toContainText(/Exportado:/);

    // The exports dir holds a real manual-script JSON and a compiled .robot.
    const files = listDir(app.paths.exportsDir);
    const json = files.find((name) => name.endsWith(".recrd.json"));
    const robot = files.find((name) => name.endsWith(".robot"));
    expect(json, `exports: ${files.join(", ")}`).toBeDefined();
    expect(robot, `exports: ${files.join(", ")}`).toBeDefined();

    // The JSON is the case's manual script (its captured actions) and the .robot
    // is a valid compiled test.
    const script = JSON.parse(readFileIn(app.paths.exportsDir, json!)) as {
      readonly actions: readonly unknown[];
    };
    expect(script.actions.length).toBeGreaterThanOrEqual(2);
    expect(readFileIn(app.paths.exportsDir, robot!)).toContain("*** Test Cases ***");
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
