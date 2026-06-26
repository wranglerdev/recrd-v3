import type { AppInfo } from "../../../shared/ipc-contract.js";
import type { VersionInfo } from "../../../shared/version-info.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `app:*` IPC handlers. `info` and `versionInfo` are supplied by
// the composition root (Electron's app metadata + the build's version.json), so
// this stays pure and testable without Electron.
export function registerAppHandlers(
  registry: IpcRegistry,
  info: AppInfo,
  versionInfo: VersionInfo,
): void {
  registry.handle("app:getInfo", () => info);
  registry.handle("app:getVersionInfo", () => versionInfo);
}
