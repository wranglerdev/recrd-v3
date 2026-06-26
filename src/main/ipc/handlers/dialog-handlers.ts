import type { DirectoryDialog } from "../../infrastructure/dialog/directory-dialog.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `dialog:*` IPC handlers (PRD §14). Thin transport adapter over
// the native directory picker, resolved from the container at the composition
// root.
export function registerDialogHandlers(registry: IpcRegistry, dialog: DirectoryDialog): void {
  registry.handle("dialog:selectDirectory", () => dialog.selectDirectory());
}
