// Pure formatting helpers for release artifacts (PRD §27, §30). Kept free of I/O
// so they are unit-testable; the release script supplies hashes and git data.

export interface ChecksumEntry {
  readonly file: string;
  readonly sha256: string;
}

/**
 * Renders a SHA256SUM.txt body in the standard `sha256sum` format:
 * `<hash><two spaces><filename>` per line, sorted by filename for reproducibility.
 */
export function formatSha256Sums(entries: readonly ChecksumEntry[]): string {
  const lines = [...entries]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((entry) => `${entry.sha256}  ${entry.file}`);
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/** A single commit line for the changelog (subject + short hash). */
export interface CommitEntry {
  readonly hash: string;
  readonly subject: string;
}

/**
 * Renders a CHANGELOG.md section for one release. `date` is formatted as
 * YYYY-MM-DD (UTC).
 */
export function formatChangelog(
  version: string,
  date: Date,
  commits: readonly CommitEntry[],
): string {
  const day = date.toISOString().slice(0, 10);
  const header = `## ${version} - ${day}`;
  const body =
    commits.length === 0
      ? "_No changes recorded._"
      : commits.map((commit) => `- ${commit.subject} (${commit.hash})`).join("\n");
  return `${header}\n\n${body}\n`;
}
