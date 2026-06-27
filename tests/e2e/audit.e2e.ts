import { expect, test } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { makeTempDir, removeDir, writeFileUnder } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.16): a mutating action (importing a mass) must be
// recorded in the audit trail. Asserts the persisted audit_events row (type +
// user) and that the Auditoria screen surfaces it — not just that a screen rendered.

interface IdRow {
  readonly id: string;
}

interface AuditRow {
  readonly type: string;
  readonly user: string;
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

function auditEvents(app: LaunchedApp): Promise<AuditRow[]> {
  return queryDb<AuditRow>(app.app, {
    dbPath: app.paths.database,
    sql: "SELECT type, user FROM audit_events ORDER BY at",
  });
}

async function createActiveProject(app: LaunchedApp, name: string): Promise<void> {
  const { window } = app;
  await window.getByTestId("nav-explorer").click();
  const form = window.getByRole("form", { name: /Novo projeto/i });
  await form.getByRole("textbox").fill(name);
  await form.getByRole("button").click();
  const projectId = await onlyId(app, "projects");
  await window.locator(`[data-testid="tree-node"][data-node-id="${projectId}"]`).click();
}

test("records a mutating action (mass import) in the audit trail", async () => {
  const fixtureDir = makeTempDir("recrd-e2e-audit-csv-");
  const csvPath = writeFileUnder(fixtureDir, "clientes.csv", "id,nome\n1,Ana\n");
  const app = await launchApp({ env: { RECRD_E2E_CSV_PATH: csvPath } });
  const { window } = app;
  try {
    await createActiveProject(app, "Projeto Auditoria");

    // No audit events before any mutating action.
    expect(await auditEvents(app)).toHaveLength(0);

    await window.getByTestId("nav-mass").click();
    await window.getByTestId("mass-import").click();
    await expect(window.getByTestId("mass-select")).toHaveText("clientes");

    // The import was recorded as a mass.import audit event for the current user.
    await expect
      .poll(async () => (await auditEvents(app)).map((e) => e.type))
      .toContain("mass.import");
    const [event] = await auditEvents(app);
    expect(event?.user.length ?? 0).toBeGreaterThan(0);

    // And the Auditoria screen surfaces it with its human label.
    await window.getByTestId("nav-audit").click();
    await expect(window.getByRole("cell", { name: "Importação de massa" })).toBeVisible();
  } finally {
    await app.close();
    removeDir(fixtureDir);
  }
});
