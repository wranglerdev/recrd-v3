import { execFileSync } from "node:child_process";
import { parseGitStatus, type GitStatus } from "./git-status.js";

// Read-only Git integration (PRD §14): current branch + changed files. Runs the
// git CLI in a child process; the runner is injectable for testing. recrd never
// mutates the repository.

export type GitRunner = (args: string[], cwd: string) => string;

const defaultRunner: GitRunner = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" });

export class GitService {
  constructor(
    private readonly cwd: string,
    private readonly run: GitRunner = defaultRunner,
  ) {}

  /** True when cwd is inside a git work tree. */
  isRepository(): boolean {
    try {
      this.run(["rev-parse", "--is-inside-work-tree"], this.cwd);
      return true;
    } catch {
      return false;
    }
  }

  /** Current branch and changed files (read-only). */
  getStatus(): GitStatus {
    return parseGitStatus(this.run(["status", "--porcelain=v1", "--branch"], this.cwd));
  }
}
