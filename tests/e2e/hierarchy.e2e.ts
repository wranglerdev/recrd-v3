import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";

// Real-flow E2E (electron-bzv.7): the Project > Plan > Suite > Case hierarchy is
// created through the Project Explorer UI, persisted to SQLite, and still present
// after the renderer reloads and re-fetches from the database. Asserts both the
// rendered tree (data-testid hooks) and the persisted rows (read-only DB query),
// not just that the screen rendered.

interface NamedRow {
  readonly id: string;
  readonly name: string;
}

/** Creates a child via a context/explorer NameForm and waits for the tree to grow. */
async function submitForm(window: Page, formName: RegExp, value: string): Promise<void> {
  const form = window.getByRole("form", { name: formName });
  await form.getByRole("textbox").fill(value);
  await form.getByRole("button").click();
}

/** Reads the rows of a table by name from the app's DB (read-only). */
function rows(app: LaunchedApp, table: string): Promise<NamedRow[]> {
  return queryDb<NamedRow>(app.app, {
    dbPath: app.paths.database,
    sql: `SELECT id, name FROM ${table} ORDER BY created_at`,
  });
}

/** Selects a tree node by its persisted id. */
function nodeById(window: Page, id: string): ReturnType<Page["locator"]> {
  return window.locator(`[data-testid="tree-node"][data-node-id="${id}"]`);
}

test("creates a Project>Plan>Suite>Case hierarchy that persists across reload", async () => {
  const app = await launchApp();
  const { window } = app;
  try {
    await window.getByTestId("nav-explorer").click();
    await expect(window.getByRole("heading", { name: "Projetos" })).toBeVisible();

    // Create the root project, then drill down creating one child at each level.
    await submitForm(window, /Novo projeto/i, "Projeto E2E");
    const [project] = await rows(app, "projects");
    expect(project?.name).toBe("Projeto E2E");
    await nodeById(window, project!.id).click();

    await submitForm(window, /Novo Plano/i, "Plano E2E");
    const [plan] = await rows(app, "plans");
    expect(plan?.name).toBe("Plano E2E");
    await nodeById(window, plan!.id).click();

    await submitForm(window, /Novo Suíte/i, "Suíte E2E");
    const [suite] = await rows(app, "suites");
    expect(suite?.name).toBe("Suíte E2E");
    await nodeById(window, suite!.id).click();

    await submitForm(window, /Novo Caso/i, "Caso E2E");
    const [testCase] = await rows(app, "cases");
    expect(testCase?.name).toBe("Caso E2E");

    // Every level rendered in the tree.
    for (const id of [project!.id, plan!.id, suite!.id, testCase!.id]) {
      await expect(nodeById(window, id)).toBeVisible();
    }

    // Reload the renderer: it re-fetches the forest from the persisted DB, so the
    // whole hierarchy must reappear without any in-memory state.
    await window.reload();
    await window.getByTestId("nav-explorer").click();
    for (const id of [project!.id, plan!.id, suite!.id, testCase!.id]) {
      await expect(nodeById(window, id)).toBeVisible();
    }
  } finally {
    await app.close();
  }
});
