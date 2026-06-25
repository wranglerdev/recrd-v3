// Test-mass CSV parser/validator (PRD §7). First line is the variable names,
// following lines are value rows. Pure: no Node/fs — the caller reads the file.
// Simple comma-separated values (no embedded commas/quotes), matching the
// corporate import format in the PRD.

export type MassRecord = Readonly<Record<string, string>>;

export type ParsedMass = {
  readonly columns: readonly string[];
  readonly rows: readonly MassRecord[];
};

export type MassParseResult =
  | { readonly ok: true; readonly mass: ParsedMass }
  | { readonly ok: false; readonly errors: readonly string[] };

function splitCells(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

export function parseMassCsv(text: string): MassParseResult {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const header = lines[0];
  if (header === undefined) {
    return { ok: false, errors: ["CSV is empty"] };
  }

  const columns = splitCells(header);
  const errors: string[] = [];

  if (columns.some((column) => column.length === 0)) {
    errors.push("Column names must not be blank");
  }
  if (new Set(columns).size !== columns.length) {
    errors.push("Duplicate column names are not allowed");
  }

  const rows: MassRecord[] = [];
  lines.slice(1).forEach((line, offset) => {
    const cells = splitCells(line);
    if (cells.length !== columns.length) {
      errors.push(`Line ${offset + 2} has ${cells.length} cells, expected ${columns.length}`);
      return;
    }
    const record: Record<string, string> = {};
    // Lengths match, so the index is always present.
    columns.forEach((column, index) => {
      record[column] = cells[index] as string;
    });
    rows.push(record);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, mass: { columns, rows } };
}

/** Variable -> value map from the first record (PRD §7), or empty when none. */
export function toVariableMap(mass: ParsedMass): MassRecord {
  return mass.rows[0] ?? {};
}
