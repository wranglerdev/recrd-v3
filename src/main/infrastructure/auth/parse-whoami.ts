// Pure parser for `whoami /user /fqdn` output (PRD §5). Extracted from
// WindowsUserContext so the brittle string handling is unit-testable on any OS.

const SID_PATTERN = /S-\d-\d+(?:-\d+)+/;

/**
 * Extracts the Windows SID from `whoami /user` output. Throws (Fail Fast) when no
 * SID is present, so a malformed environment surfaces immediately.
 */
export function parseSidFromWhoami(output: string): string {
  const match = SID_PATTERN.exec(output);
  if (match === null) {
    throw new Error("Could not find a SID in whoami output");
  }
  return match[0];
}
