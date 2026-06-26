import { describe, expect, it, vi } from "vitest";
import { registerDialogHandlers } from "@main/ipc/handlers/dialog-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { DirectoryDialog } from "@main/infrastructure/dialog/directory-dialog";

describe("registerDialogHandlers", () => {
  it("delegates dialog:selectDirectory to the directory dialog", async () => {
    const dialog: DirectoryDialog = { selectDirectory: vi.fn(async () => "/repo") };
    const registry = new IpcRegistry();
    registerDialogHandlers(registry, dialog);

    await expect(registry.dispatch("dialog:selectDirectory", undefined)).resolves.toBe("/repo");
    expect(dialog.selectDirectory).toHaveBeenCalled();
  });
});
