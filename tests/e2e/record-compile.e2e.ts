import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { makeTempDir, pathExists, readFileIn, removeDir } from "./helpers/fs.js";
import {
  clickInSandbox,
  fillInSandbox,
  isSandboxAttached,
  loadFixture,
} from "./helpers/sandbox.js";

// Real-flow E2E (electron-bzv.10): record actions in the local sandbox fixture,
// see them land in the Timeline, then Compile and assert the produced artifact —
// a real .robot file written into the project's Robot tree whose preview reflects
// the captured steps — not merely that the compile screen rendered.

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

test("records sandbox actions and compiles them into a real .robot file", async () => {
  const repoRoot = makeTempDir("recrd-e2e-compile-");
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  const { window } = app;
  try {
    // Scaffold a project so compile has a robotPath to write the .robot into.
    await window.getByTestId("nav-home").click();
    await window.getByRole("button", { name: "Novo Projeto" }).click();
    await window.getByTestId("new-project-name").fill("Projeto Compile");
    await window.getByTestId("new-project-repo-new").check();
    await window.getByTestId("new-project-submit").click();

    // A case to attribute the recording/compilation to (its name -> file name).
    await window.getByTestId("nav-explorer").click();
    await nodeById(window, await onlyId(app, "projects")).click();
    await submitForm(window, /Novo Plano/i, "Plano Compile");
    await nodeById(window, await onlyId(app, "plans")).click();
    await submitForm(window, /Novo Suíte/i, "Suíte Compile");
    await nodeById(window, await onlyId(app, "suites")).click();
    await submitForm(window, /Novo Caso/i, "Caso Compile");
    await nodeById(window, await onlyId(app, "cases")).click();

    // The sandbox view is added to the window only once the Automation screen
    // reports its viewport; wait for that before driving the fixture.
    await window.getByTestId("nav-automation").click();
    await expect.poll(() => isSandboxAttached(app.app)).toBe(true);

    // Record: start the session, then load the fixture (its DOMContentLoaded
    // records a navigate) and synthesise a fill + click that the content-script
    // captures as input/click actions.
    await window.getByTestId("recording-start").click();
    await loadFixture(app.app);
    await fillInSandbox(app.app, "#username", "alice");
    await clickInSandbox(app.app, "#submit");

    // The captured steps land in the Timeline (at least the input + the click).
    await expect.poll(() => window.getByTestId("timeline-step").count()).toBeGreaterThanOrEqual(2);
    await expect(
      window.locator('[data-testid="timeline-step"][data-step-type="click"]'),
    ).toHaveCount(1);

    // Compile the recorded script.
    await window.getByRole("button", { name: "Compilar" }).click();

    // Success: a .robot preview is shown and no compilation errors surfaced.
    await expect(window.getByTestId("compile-status")).toHaveText(/sucesso/i);
    const preview = window.getByTestId("compile-robot-preview");
    await expect(preview).toContainText("*** Test Cases ***");
    await expect(window.getByTestId("compile-errors")).toHaveCount(0);

    // The artifact is a real file written into the project's Robot tree, and its
    // content matches the on-screen preview.
    const robotFile = join(repoRoot, "tests", "caso_compile.robot");
    expect(pathExists(robotFile)).toBe(true);
    const onDisk = readFileIn(join(repoRoot, "tests"), "caso_compile.robot");
    expect(onDisk).toContain("*** Test Cases ***");
    expect(await preview.textContent()).toContain(onDisk.trim().slice(0, 40));
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
