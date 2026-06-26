import { shell } from "electron";

// Electron-coupled "open in the OS" capability (PRD §14). Used by the read-only
// Git panel to open a repository folder in the system file manager / external
// tooling, so the renderer never touches the shell. Injected as a value at the
// composition root.

/** Port the git IPC handler depends on; the Electron impl is injected by main.ts. */
export interface ExternalOpener {
  /** Opens an absolute filesystem path in the OS default handler. */
  openPath(path: string): Promise<void>;
}

/** Builds the Electron-backed external opener. */
export function createExternalOpener(): ExternalOpener {
  return {
    async openPath(path) {
      await shell.openPath(path);
    },
  };
}
