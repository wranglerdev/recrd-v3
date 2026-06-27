import { readFile } from "node:fs/promises";
import { dialog } from "electron";

// Electron-coupled CSV file picker (PRD §7). Opens the native open dialog,
// restricted to .csv, and reads the chosen file so the renderer never touches
// the filesystem. Injected as a value at the composition root (like the
// sandbox-view factory) and resolved by the mass IPC handler.

/** A chosen CSV file: its absolute path and decoded UTF-8 content. */
export interface CsvFileSelection {
  readonly path: string;
  readonly content: string;
}

/** Port the mass IPC handler depends on; the Electron impl is injected by main.ts. */
export interface CsvFileDialog {
  /** Opens the picker and reads the file; resolves null when the user cancels. */
  selectCsv(): Promise<CsvFileSelection | null>;
}

/** Builds the Electron-backed CSV file dialog. */
export function createCsvFileDialog(): CsvFileDialog {
  return {
    async selectCsv() {
      const result = await dialog.showOpenDialog({
        title: "Selecionar arquivo CSV",
        properties: ["openFile"],
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      const [path] = result.filePaths;
      if (result.canceled || path === undefined) {
        return null;
      }
      const content = await readFile(path, "utf8");
      return { path, content };
    },
  };
}

// Headless test seam (electron-bzv.1). E2E cannot drive the modal native picker,
// so main.ts swaps in this deterministic fake when RECRD_E2E_CSV_PATH is set: it
// reads the supplied file just like the real dialog would after a selection, with
// no picker shown. Production never constructs this.
export function createFakeCsvFileDialog(path: string): CsvFileDialog {
  return {
    async selectCsv() {
      const content = await readFile(path, "utf8");
      return { path, content };
    },
  };
}
