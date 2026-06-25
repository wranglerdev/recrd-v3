import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import type { AppInfo } from "../shared/ipc-contract.js";
import { buildIpcRegistry, composeContainer } from "./app/compose.js";
import { createUserContext } from "./infrastructure/auth/user-context-factory.js";
import { ElectronStoreConfig } from "./infrastructure/config/electron-store-config.js";
import { createElectronLogger } from "./infrastructure/logging/electron-logger.js";
import { createAppPaths, ensureAppDirectories } from "./infrastructure/paths/app-paths.js";
import { bindIpcMain } from "./ipc/electron-ipc.js";

// Electron entry point (PRD §3, §18). Composes the core services, wires the typed
// IPC layer onto ipcMain, then opens a hardened BrowserWindow: contextIsolation
// on, nodeIntegration off, sandbox on, webSecurity on. The renderer reaches the
// main process only through the preload bridge.

const here = dirname(fileURLToPath(import.meta.url));
const PRELOAD = join(here, "../preload/preload.cjs");
const RENDERER_HTML = join(here, "../renderer/index.html");

function bootstrap(): void {
  const paths = createAppPaths(app.getPath("userData"));
  ensureAppDirectories(paths);

  const logger = createElectronLogger(paths, app.isPackaged ? "info" : "debug");
  const config = new ElectronStoreConfig(paths);
  const appInfo: AppInfo = {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  };

  const userContext = createUserContext();
  const container = composeContainer({ paths, logger, config, appInfo, userContext });
  const registry = buildIpcRegistry(container);
  bindIpcMain(registry, ipcMain);

  logger.info("recrd starting", {
    version: appInfo.version,
    userData: paths.userData,
    user: userContext.username,
  });

  void createMainWindow(config);
}

async function createMainWindow(config: ElectronStoreConfig): Promise<void> {
  const { width, height } = config.get("window");
  const window = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl !== undefined && devServerUrl !== "") {
    await window.loadURL(devServerUrl);
  } else {
    await window.loadFile(RENDERER_HTML);
  }
}

app.whenReady().then(bootstrap, (error: unknown) => {
  console.error("Failed to start recrd:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  // PRD §4 is local-first/desktop; follow the platform convention.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});
