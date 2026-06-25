// Pure parser for `git status --porcelain=v1 --branch` output (PRD §14). Kept
// separate from process execution so the parsing is fully unit-testable.

export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";

export type GitChange = {
  readonly path: string;
  readonly status: GitFileStatus;
};

export type GitStatus = {
  readonly branch: string;
  readonly changes: readonly GitChange[];
};

function parseBranchLine(line: string): string {
  const rest = line.slice(3).trim(); // drop "## "
  // split() always yields at least one element, so [0] is present.
  const upstreamSplit = rest.split("...")[0] as string;
  const aheadSplit = upstreamSplit.split(" [")[0] as string;
  return aheadSplit.trim();
}

function classify(code: string): GitFileStatus {
  if (code === "??") {
    return "untracked";
  }
  const xy = code.trim();
  if (xy.includes("R")) {
    return "renamed";
  }
  if (xy.includes("A")) {
    return "added";
  }
  if (xy.includes("D")) {
    return "deleted";
  }
  if (xy.includes("M")) {
    return "modified";
  }
  return "unknown";
}

export function parseGitStatus(porcelain: string): GitStatus {
  let branch = "";
  const changes: GitChange[] = [];

  for (const line of porcelain.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith("## ")) {
      branch = parseBranchLine(line);
      continue;
    }
    const code = line.slice(0, 2);
    const remainder = line.slice(3);
    // Renames are "old -> new"; record the new path.
    const path = remainder.includes(" -> ") ? (remainder.split(" -> ")[1] as string) : remainder;
    changes.push({ path: path.trim(), status: classify(code) });
  }

  return { branch, changes };
}
