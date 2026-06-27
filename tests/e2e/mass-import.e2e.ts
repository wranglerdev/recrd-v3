import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { makeTempDir, removeDir, writeFileUnder } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.13): import a CSV through the native file dialog
// (faked via RECRD_E2E_CSV_PATH), then assert the mass is actually persisted
// (DB rows + import history), rendered in the grid, and editable — with the edit
// written back to the database, not just held in the UI.

interface MassRow {
  readonly name: string;
  readonly columns: string;
  readonly rows: string;
  readonly history: string;
}

interface ProjectRow {
  readonly id: string;
}

/** Reads the single persisted mass for assertions (columns/rows/history are JSON). */
async function readMass(app: LaunchedApp): Promise<{
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly Record<string, string>[];
  readonly history: readonly { rowCount: number; source: string }[];
}> {
  const [row] = await queryDb<MassRow>(app.app, {
    dbPath: app.paths.database,
    sql: "SELECT name, columns, rows, history FROM masses ORDER BY created_at",
  });
  if (row === undefined) {
    throw new Error("no mass persisted");
  }
  return {
    name: row.name,
    columns: JSON.parse(row.columns) as string[],
    rows: JSON.parse(row.rows) as Record<string, string>[],
    history: JSON.parse(row.history) as { rowCount: number; source: string }[],
  };
}

/** Creates a project via the explorer and selects it so it becomes active. */
async function createActiveProject(app: LaunchedApp, name: string): Promise<string> {
  const { window } = app;
  await window.getByTestId("nav-explorer").click();
  const form = window.getByRole("form", { name: /Novo projeto/i });
  await form.getByRole("textbox").fill(name);
  await form.getByRole("button").click();

  const [project] = await queryDb<ProjectRow>(app.app, {
    dbPath: app.paths.database,
    sql: "SELECT id FROM projects ORDER BY created_at",
  });
  if (project === undefined) {
    throw new Error("project not created");
  }
  await window.locator(`[data-testid="tree-node"][data-node-id="${project.id}"]`).click();
  return project.id;
}

/** A cell input in the rendered grid, addressed by row index + column. */
function cell(window: Page, rowIndex: number, column: string): ReturnType<Page["locator"]> {
  return window.locator(
    `[data-testid="mass-cell"][data-row="${rowIndex}"][data-column="${column}"]`,
  );
}

test("imports a CSV that persists, renders in the grid, and is editable", async () => {
  const fixtureDir = makeTempDir("recrd-e2e-csv-");
  const csvPath = writeFileUnder(
    fixtureDir,
    "usuarios.csv",
    "nome,email\nAna,ana@example.com\nBob,bob@example.com\n",
  );
  const app = await launchApp({ env: { RECRD_E2E_CSV_PATH: csvPath } });
  const { window } = app;
  try {
    await createActiveProject(app, "Projeto Massa");

    await window.getByTestId("nav-mass").click();
    await window.getByTestId("mass-import").click();

    // The imported mass appears in the list and the grid renders its CSV shape.
    await expect(window.getByTestId("mass-select")).toHaveText("usuarios");
    await expect(window.getByTestId("mass-column")).toHaveText(["nome", "email"]);
    await expect(window.getByTestId("mass-row")).toHaveCount(2);
    await expect(cell(window, 0, "nome")).toHaveValue("Ana");

    // The import is persisted with a history entry recording the source + count.
    const imported = await readMass(app);
    expect(imported.columns).toEqual(["nome", "email"]);
    expect(imported.rows).toEqual([
      { nome: "Ana", email: "ana@example.com" },
      { nome: "Bob", email: "bob@example.com" },
    ]);
    expect(imported.history).toHaveLength(1);
    expect(imported.history[0]).toMatchObject({ rowCount: 2, source: csvPath });

    // Editing a cell writes back to the DB (not just the local mirror).
    await cell(window, 1, "email").fill("robert@example.com");
    await expect.poll(async () => (await readMass(app)).rows[1]?.email).toBe("robert@example.com");
  } finally {
    await app.close();
    removeDir(fixtureDir);
  }
});
