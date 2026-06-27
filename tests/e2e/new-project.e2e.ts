import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { launchApp, type LaunchedApp } from "./helpers/launch.js";
import { queryDb } from "./helpers/db.js";
import { makeTempDir, readTree, removeDir, writeFileUnder } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.8, electron-bzv.9): the New Project flow drives the
// directory dialog (faked via RECRD_E2E_DIALOG_DIR) and asserts the produced
// artifacts, not screen presence. "Novo repositório" must scaffold a real Robot
// tree on disk and persist the project's robot_path; "repositório existente" must
// link a valid Robot layout and reject an invalid one (no robot_path written).

interface ProjectRow {
  readonly name: string;
  readonly robot_path: string | null;
}

/** Reads the persisted projects (read-only) so we assert the DB, not the UI. */
function projects(app: LaunchedApp): Promise<ProjectRow[]> {
  return queryDb<ProjectRow>(app.app, {
    dbPath: app.paths.database,
    sql: "SELECT name, robot_path FROM projects ORDER BY created_at",
  });
}

/** Fills the New Project form (reached from the Home quick action) and submits. */
async function createProject(
  window: Page,
  name: string,
  repository: "new" | "existing",
): Promise<void> {
  await window.getByTestId("nav-home").click();
  await window.getByRole("button", { name: "Novo Projeto" }).click();
  await window.getByTestId("new-project-name").fill(name);
  await window.getByTestId(`new-project-repo-${repository}`).check();
  await window.getByTestId("new-project-submit").click();
}

/** Writes the minimal files that make a directory a valid Robot project. */
function seedValidRobotRepo(root: string): void {
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileUnder(root, "requirements.txt", "robotframework\n");
}

test("scaffolds a real Robot repo tree and persists robot_path", async () => {
  const repoRoot = makeTempDir("recrd-e2e-scaffold-");
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  try {
    await createProject(app.window, "Projeto Scaffold", "new");

    // The flow returns Home once the project is created and scaffolded; the
    // project row must carry the chosen folder as its robot_path.
    await expect.poll(async () => (await projects(app))[0]?.robot_path).toBe(repoRoot);

    // The standard Robot seed tree must actually exist on disk.
    expect(readTree(repoRoot)).toEqual([".gitignore", "requirements.txt", "tests/login.robot"]);
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});

test("links a valid existing Robot repo and persists robot_path", async () => {
  const repoRoot = makeTempDir("recrd-e2e-link-valid-");
  seedValidRobotRepo(repoRoot);
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  try {
    await createProject(app.window, "Projeto Link", "existing");

    await expect.poll(async () => (await projects(app))[0]?.robot_path).toBe(repoRoot);
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});

test("rejects an invalid existing repo and leaves robot_path unset", async () => {
  // An empty directory is missing tests/ and requirements.txt, so linking fails.
  const repoRoot = makeTempDir("recrd-e2e-link-invalid-");
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  try {
    await createProject(app.window, "Projeto Inválido", "existing");

    // The link failure surfaces as an alert naming the missing paths…
    await expect(app.window.getByRole("alert")).toContainText(/Faltando/i);

    // …and the project was still created but with no Robot repo linked.
    const [project] = await projects(app);
    expect(project?.name).toBe("Projeto Inválido");
    expect(project?.robot_path).toBeNull();
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
