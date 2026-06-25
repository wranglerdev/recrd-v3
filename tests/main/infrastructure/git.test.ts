import { describe, expect, it } from "vitest";
import { GitService, type GitRunner } from "@main/infrastructure/git/git-service";
import { parseGitStatus } from "@main/infrastructure/git/git-status";

const SAMPLE = [
  "## main...origin/main [ahead 1]",
  " M src/foo.ts",
  "?? new.ts",
  "A  added.ts",
  "D  gone.ts",
  "R  old.ts -> renamed.ts",
  "!! ignored.ts",
  "",
].join("\n");

describe("parseGitStatus (PRD §14)", () => {
  it("extracts the branch and classifies changes", () => {
    const status = parseGitStatus(SAMPLE);
    expect(status.branch).toBe("main");
    expect(status.changes).toEqual([
      { path: "src/foo.ts", status: "modified" },
      { path: "new.ts", status: "untracked" },
      { path: "added.ts", status: "added" },
      { path: "gone.ts", status: "deleted" },
      { path: "renamed.ts", status: "renamed" },
      { path: "ignored.ts", status: "unknown" },
    ]);
  });

  it("handles a branch with no upstream", () => {
    expect(parseGitStatus("## feature/x\n").branch).toBe("feature/x");
  });
});

describe("GitService", () => {
  it("parses status from the injected runner", () => {
    const run: GitRunner = (args) => {
      expect(args).toEqual(["status", "--porcelain=v1", "--branch"]);
      return "## develop\n M a.ts\n";
    };
    const status = new GitService("/repo", run).getStatus();
    expect(status.branch).toBe("develop");
    expect(status.changes).toEqual([{ path: "a.ts", status: "modified" }]);
  });

  it("reports repository presence and absence", () => {
    expect(new GitService("/repo", () => "true").isRepository()).toBe(true);
    expect(
      new GitService("/repo", () => {
        throw new Error("not a repo");
      }).isRepository(),
    ).toBe(false);
  });

  it("works against the real repository (default runner)", () => {
    const service = new GitService(process.cwd());
    expect(service.isRepository()).toBe(true);
    expect(typeof service.getStatus().branch).toBe("string");
  });
});
