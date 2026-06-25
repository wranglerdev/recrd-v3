import type { MassRecord, ParsedMass } from "./mass-csv.js";

// Test-mass aggregate and its pure operations (PRD §7): rename, edit values, and
// import history. All operations are immutable and Fail Fast on invalid input.

export type MassImport = {
  readonly at: string;
  readonly rowCount: number;
  readonly source: string;
};

export type Mass = {
  readonly id: string;
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly MassRecord[];
  readonly history: readonly MassImport[];
};

/** Builds a Mass from parsed CSV with an initial import-history entry. */
export function massFromCsv(
  id: string,
  name: string,
  parsed: ParsedMass,
  importedAt: string,
  source: string,
): Mass {
  return {
    id,
    name,
    columns: parsed.columns,
    rows: parsed.rows,
    history: [{ at: importedAt, rowCount: parsed.rows.length, source }],
  };
}

/** Renames a mass. */
export function renameMass(mass: Mass, name: string): Mass {
  if (name.trim().length === 0) {
    throw new Error("Mass name must not be empty");
  }
  return { ...mass, name };
}

/** Edits a single cell value; Fail Fast on unknown column or out-of-range row. */
export function editMassValue(mass: Mass, rowIndex: number, column: string, value: string): Mass {
  if (!mass.columns.includes(column)) {
    throw new Error(`Unknown column: ${column}`);
  }
  if (rowIndex < 0 || rowIndex >= mass.rows.length) {
    throw new Error(`Row index out of range: ${rowIndex}`);
  }
  const rows = mass.rows.map((row, index) =>
    index === rowIndex ? { ...row, [column]: value } : row,
  );
  return { ...mass, rows };
}

/** Appends a new import-history entry (newest kept last). */
export function appendImport(mass: Mass, entry: MassImport): Mass {
  return { ...mass, history: [...mass.history, entry] };
}
