import { dialog } from "electron";

// Electron-coupled directory picker (PRD §14). Opens the native folder dialog so
// the renderer never touches the filesystem; used to choose where a new Robot
// repository is scaffolded. Injected as a value at the composition root.

/** Port the dialog IPC handler depends on; the Electron impl is injected by main.ts. */
export interface DirectoryDialog {
  /** Opens the folder picker; resolves the chosen absolute path, or null on cancel. */
  selectDirectory(): Promise<string | null>;
}

/** Builds the Electron-backed directory dialog. */
export function createDirectoryDialog(): DirectoryDialog {
  return {
    async selectDirectory() {
      const result = await dialog.showOpenDialog({
        title: "Selecionar pasta do repositório Robot",
        properties: ["openDirectory", "createDirectory"],
      });
      const [path] = result.filePaths;
      if (result.canceled || path === undefined) {
        return null;
      }
      return path;
    },
  };
}
