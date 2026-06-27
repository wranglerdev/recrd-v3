import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { makeTempDir, removeDir } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.12): run a Robot test through the deterministic
// fake runner (RECRD_E2E_FAKE_RUNNER) and assert the run's real outputs — a
// passed result badge, the streamed stdout log, and a persisted Execution row
// surfaced in the per-case history — not merely that the screen rendered.

interface IdRow {
  readonly id: string;
}

interface ExecutionRow {
  readonly case_id: string;
  readonly result: string;
  readonly log: string;
}

/** Creates a child via an explorer/context NameForm and waits for the submit. */
async function submitForm(window: Page, formName: RegExp, value: string): Promise<void> {
  const form = window.getByRole("form", { name: formName });
  await form.getByRole("textbox").fill(value);
  await form.getByRole("button").click();
}

function nodeById(window: Page, id: string): ReturnType<Page["locator"]> {
  return window.locator(`[data-testid="tree-node"][data-node-id="${id}"]`);
}

/** Reads the single persisted id of a table (the only row created in the flow). */
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

test("runs a Robot test that records a passed execution with the streamed log", async () => {
  const repoRoot = makeTempDir("recrd-e2e-run-");
  const app = await launchApp({
    env: { RECRD_E2E_DIALOG_DIR: repoRoot, RECRD_E2E_FAKE_RUNNER: "1" },
  });
  const { window } = app;
  try {
    // New Project with "novo repo" scaffolds a real Robot tree and links it, so
    // the run has a robotPath to execute against. The project becomes active.
    await window.getByTestId("nav-home").click();
    await window.getByRole("button", { name: "Novo Projeto" }).click();
    await window.getByTestId("new-project-name").fill("Projeto Run");
    await window.getByTestId("new-project-repo-new").check();
    await window.getByTestId("new-project-submit").click();

    // Build a case under the project so the finished run is recorded against it.
    await window.getByTestId("nav-explorer").click();
    const projectId = await onlyId(app, "projects");
    await nodeById(window, projectId).click();
    await submitForm(window, /Novo Plano/i, "Plano Run");
    await nodeById(window, await onlyId(app, "plans")).click();
    await submitForm(window, /Novo Suíte/i, "Suíte Run");
    await nodeById(window, await onlyId(app, "suites")).click();
    await submitForm(window, /Novo Caso/i, "Caso Run");
    const caseId = await onlyId(app, "cases");
    await nodeById(window, caseId).click();

    // Run it from the Automation screen; the fake runner streams scripted PASS
    // output and exits 0.
    await window.getByTestId("nav-automation").click();
    await window.getByRole("button", { name: "Play" }).click();

    // The final-result badge reflects exit code 0 (aprovado) and the streamed
    // stdout is shown in the log panel.
    const badge = window.getByTestId("run-result-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-exit-code", "0");
    await expect(window.getByTestId("run-log")).toContainText("PASS");

    // The run is persisted as a passed Execution for the case, with its log.
    await expect
      .poll(async () =>
        queryDb<ExecutionRow>(app.app, {
          dbPath: app.paths.database,
          sql: "SELECT case_id, result, log FROM executions",
        }),
      )
      .toHaveLength(1);
    const [execution] = await queryDb<ExecutionRow>(app.app, {
      dbPath: app.paths.database,
      sql: "SELECT case_id, result, log FROM executions",
    });
    expect(execution?.case_id).toBe(caseId);
    expect(execution?.result).toBe("passed");
    expect(execution?.log).toContain("PASS");

    // And it surfaces in the per-case execution history with a passed result.
    const historyRow = window.getByTestId("execution-row");
    await expect(historyRow).toHaveCount(1);
    await expect(historyRow).toHaveAttribute("data-result", "passed");
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
