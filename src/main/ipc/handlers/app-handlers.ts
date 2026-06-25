import type { AppInfo } from "../../../shared/ipc-contract.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `app:*` IPC handlers. `info` is supplied by the composition root
// (Electron's app name/version + process.platform) so this stays pure and
// testable without Electron.
export function registerAppHandlers(registry: IpcRegistry, info: AppInfo): void {
  registry.handle("app:getInfo", () => info);
}
