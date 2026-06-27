import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers/launch.js";
import { makeTempDir, removeDir, writeFileUnder } from "./helpers/fs.js";

// Real-flow E2E (electron-bzv.15): the Git panel reflects the active project's
// real repository state. We build an actual git repo (committed Robot layout +
// one untracked file), link it to the project, and assert the panel surfaces its
// branch and the pending change read from `git status` — not a stubbed status.

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

/** Creates a git repo with a committed Robot layout and one untracked file. */
function seedGitRepo(root: string): void {
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileUnder(root, "requirements.txt", "robotframework\n");
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "e2e@example.com");
  git(root, "config", "user.name", "E2E");
  git(root, "add", ".");
  git(root, "commit", "-m", "initial Robot layout");
  // An untracked file so the panel has a real pending change to show.
  writeFileUnder(root, "notes.txt", "rascunho\n");
}

test("Git panel shows the linked repository's real branch and changes", async () => {
  const repoRoot = makeTempDir("recrd-e2e-git-");
  seedGitRepo(repoRoot);
  const app = await launchApp({ env: { RECRD_E2E_DIALOG_DIR: repoRoot } });
  const { window } = app;
  try {
    // Link the existing git repo as the project's Robot repository.
    await window.getByTestId("nav-home").click();
    await window.getByRole("button", { name: "Novo Projeto" }).click();
    await window.getByTestId("new-project-name").fill("Projeto Git");
    await window.getByTestId("new-project-repo-existing").check();
    await window.getByTestId("new-project-submit").click();

    await window.getByTestId("nav-git").click();

    // The panel reads the real repo: current branch and the untracked file.
    await expect(window.getByTestId("git-branch")).toHaveText("main");
    const change = window.getByTestId("git-change-row");
    await expect(change).toHaveCount(1);
    await expect(change).toContainText("notes.txt");
    await expect(change).toHaveAttribute("data-status", "untracked");
  } finally {
    await app.close();
    removeDir(repoRoot);
  }
});
