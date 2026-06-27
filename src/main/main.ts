import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import type {
  AppInfo,
  CapturedActionEvent,
  InspectedElementEvent,
} from "../shared/ipc-contract.js";
import {
  buildIpcRegistry,
  composeContainer,
  registerInfrastructure,
  registerUseCases,
} from "./app/compose.js";
import { createUserContext } from "./infrastructure/auth/user-context-factory.js";
import { ElectronStoreConfig } from "./infrastructure/config/electron-store-config.js";
import { createDatabase, type DatabaseHandle } from "./infrastructure/db/connection.js";
import {
  createCsvFileDialog,
  createFakeCsvFileDialog,
} from "./infrastructure/dialog/csv-file-dialog.js";
import {
  createDirectoryDialog,
  createFakeDirectoryDialog,
} from "./infrastructure/dialog/directory-dialog.js";
import { createExternalOpener } from "./infrastructure/shell/external-opener.js";
import { RobotRunner } from "./infrastructure/robot/robot-runner.js";
import { createFakeRobotSpawner } from "./infrastructure/e2e/fake-robot-spawner.js";
import { createFakeInstallCommandRunner } from "./infrastructure/e2e/fake-install-command-runner.js";
import {
  isFakeRunnerEnabled,
  parseFakeInstallConfig,
  parseFakeRobotConfig,
} from "./infrastructure/e2e/e2e-seam-config.js";
import { createElectronLogger } from "./infrastructure/logging/electron-logger.js";
import { createAppPaths, ensureAppDirectories } from "./infrastructure/paths/app-paths.js";
import { resolveVersionInfo } from "./infrastructure/version/version-reader.js";
import { bindIpcMain } from "./ipc/electron-ipc.js";
import { createIpcEventEmitter, type SettableIpcEventEmitter } from "./ipc/ipc-event-emitter.js";
import { spawnInstallCommandRunner } from "./infrastructure/python/install-command-runner.js";
import { createSandboxController } from "../application/sandbox/sandbox-controller.js";
import { createSandboxView, createSandboxViewPort } from "./sandbox/sandbox-view.js";

// Electron entry point (PRD §3, §18). Composes the core services, wires the typed
// IPC layer onto ipcMain, then opens a hardened BrowserWindow: contextIsolation
// on, nodeIntegration off, sandbox on, webSecurity on. The renderer reaches the
// main process only through the preload bridge.

const here = dirname(fileURLToPath(import.meta.url));
const PRELOAD = join(here, "../preload/preload.cjs");
const SANDBOX_PRELOAD = join(here, "../preload/sandbox-preload.cjs");
const RENDERER_HTML = join(here, "../renderer/index.html");

// SQLite handle, opened once at bootstrap and closed on quit (PRD §4, §6).
let database: DatabaseHandle | null = null;

// Pushes streamed events (e.g. install progress) to the renderer. Created at
// bootstrap; its target webContents is attached once the window exists.
const eventEmitter: SettableIpcEventEmitter = createIpcEventEmitter();

// Coordinates the embedded Browser Sandbox view (PRD §10). Created at bootstrap
// so the IPC handlers can drive it; its Electron view port is attached once the
// main window exists.
const sandboxController = createSandboxController();

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
  // version.json is emitted next to the main bundle at build time (PRD §30);
  // absent in dev, where we fall back to the running app's version + platform.
  const versionInfo = resolveVersionInfo(join(here, "../version.json"), {
    version: app.getVersion(),
    target: `${process.platform}-${process.arch}`,
  });

  // Open the database at bootstrap (runs migrations) so use cases resolve a
  // ready connection from the container.
  database = createDatabase(paths.database);

  const userContext = createUserContext();
  const container = composeContainer({ paths, logger, config, appInfo, versionInfo, userContext });

  // E2E test seams (electron-bzv.1, electron-bzv.3), active only under RECRD_E2E_*
  // env vars: a headless directory/CSV dialog driven by a known path, and a
  // deterministic Robot/install runner. Production never sets these, so the real
  // Electron dialogs and spawn-backed runners are used.
  const dialogDir = process.env.RECRD_E2E_DIALOG_DIR;
  const directoryDialog =
    dialogDir !== undefined && dialogDir !== ""
      ? createFakeDirectoryDialog(dialogDir)
      : createDirectoryDialog();
  const csvPath = process.env.RECRD_E2E_CSV_PATH;
  const csvFileDialog =
    csvPath !== undefined && csvPath !== ""
      ? createFakeCsvFileDialog(csvPath)
      : createCsvFileDialog();
  const fakeRunner = isFakeRunnerEnabled(process.env);
  const robotRunner = fakeRunner
    ? new RobotRunner(createFakeRobotSpawner(parseFakeRobotConfig(process.env)))
    : new RobotRunner();
  const installCommandRunner = fakeRunner
    ? createFakeInstallCommandRunner(parseFakeInstallConfig(process.env))
    : spawnInstallCommandRunner;

  registerInfrastructure(container, {
    database,
    sandboxViewFactory: createSandboxView,
    sandboxController,
    csvFileDialog,
    directoryDialog,
    externalOpener: createExternalOpener(),
    eventEmitter,
    installCommandRunner,
    robotRunner,
  });
  registerUseCases(container);
  const registry = buildIpcRegistry(container);
  bindIpcMain(registry, ipcMain, logger);

  // Relay actions captured by the sandbox content-script to the renderer's
  // recording session (PRD §10). The content-script sends over `capture:action`;
  // the event emitter pushes it to the active window's webContents.
  ipcMain.on("capture:action", (_event, payload: CapturedActionEvent) => {
    eventEmitter.emit("capture:action", payload);
  });

  // Relay the element snapshotted under the cursor in Inspect mode to the
  // renderer's Element Inspector panel (PRD §10). The content-script sends over
  // `inspect:hover`; the emitter pushes it on the typed `inspect:element` channel.
  ipcMain.on("inspect:hover", (_event, payload: InspectedElementEvent) => {
    eventEmitter.emit("inspect:element", payload);
  });

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

  // Route streamed events to this window; detach on close so emits are dropped.
  eventEmitter.setTarget(window.webContents);
  window.on("closed", () => eventEmitter.setTarget(null));

  // Embed the Browser Sandbox view and let the controller coordinate its
  // bounds/visibility/navigation with the renderer layout (PRD §10).
  const sandboxView = createSandboxView(SANDBOX_PRELOAD);
  sandboxController.attach(createSandboxViewPort(window, sandboxView));

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

app.on("will-quit", () => {
  // Release the SQLite connection cleanly on shutdown (PRD §4).
  database?.close();
  database = null;
});
