import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type ViteDevServer } from "vite";
import { context, type BuildContext, type Plugin } from "esbuild";
import { ensureAbi } from "./lib/native-abi.js";

// Dev runner (PRD §28). Ensures the native ABI, bundles main/preload with esbuild
// in watch mode, starts the Vite dev server for the renderer, then launches
// Electron pointed at the dev-server URL. The renderer hot-reloads through Vite;
// the main/preload bundles restart Electron on change; Ctrl+C (or closing the
// window) tears everything down cleanly.

const isWindows = process.platform === "win32";

async function main(): Promise<void> {
  // Electron 34 needs better-sqlite3's Electron ABI; the unit suite leaves it on
  // the Node ABI. Flip it before launch so `npm run dev` just works regardless of
  // what ran last (no more NODE_MODULE_VERSION crash on startup).
  ensureAbi("electron");

  let server: ViteDevServer | null = null;
  let electron: ChildProcess | null = null;
  let viteUrl = "";
  let started = false; // Electron has been launched at least once
  let restarting = false; // a restart-kill is in progress (not a user close)
  let shuttingDown = false;
  let restartTimer: NodeJS.Timeout | null = null;

  // Restart Electron after a successful main/preload rebuild. Debounced so the
  // three bundles' rebuilds from a single save coalesce into one restart.
  const scheduleRestart = (): void => {
    if (!started || shuttingDown) return;
    if (restartTimer !== null) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      void restartElectron();
    }, 120);
  };

  const restartOnRebuild = (name: string): Plugin => ({
    name: `restart-on-rebuild:${name}`,
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) scheduleRestart();
      });
    },
  });

  const mainCtx = await context({
    entryPoints: ["src/main/main.ts"],
    outfile: "dist/main/main.js",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    sourcemap: true,
    external: ["electron", "better-sqlite3", "electron-store", "electron-log"],
    plugins: [restartOnRebuild("main")],
  });
  const preloadCtx = await context({
    entryPoints: ["src/preload/preload.ts"],
    outfile: "dist/preload/preload.cjs",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    external: ["electron"],
    plugins: [restartOnRebuild("preload")],
  });
  const sandboxPreloadCtx = await context({
    entryPoints: ["src/preload/sandbox-preload.ts"],
    outfile: "dist/preload/sandbox-preload.cjs",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    external: ["electron"],
    plugins: [restartOnRebuild("sandbox-preload")],
  });
  const contexts: BuildContext[] = [mainCtx, preloadCtx, sandboxPreloadCtx];
  await Promise.all(contexts.map((ctx) => ctx.watch()));

  server = await createServer();
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (url === undefined) {
    throw new Error("Vite dev server did not report a local URL");
  }
  viteUrl = url;
  server.printUrls();

  const electronBin = (await import("electron")).default as unknown as string;

  // Forcefully terminate Electron and its child processes, resolving once gone.
  // Electron spawns a tree of helper processes; on Windows child.kill() leaves
  // them orphaned, so we use taskkill /T to take down the whole tree.
  const killElectron = (): Promise<void> =>
    new Promise((resolve) => {
      const child = electron;
      if (child === null || child.exitCode !== null || child.pid === undefined) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
    });

  const launchElectron = (): void => {
    const launchedAt = Date.now();
    const child = spawn(electronBin, ["."], {
      stdio: "inherit",
      env: { ...process.env, VITE_DEV_SERVER_URL: viteUrl },
    });
    electron = child;
    child.on("exit", (code) => {
      if (restarting || shuttingDown) return;
      // Electron exited on its own. A near-instant non-zero exit almost always
      // means a startup crash (e.g. the native ABI) — hint, then shut down.
      if ((code ?? 0) !== 0 && Date.now() - launchedAt < 3000) {
        console.error(
          "\n[dev] Electron exited immediately. If this is a NODE_MODULE_VERSION error, run `npm run rebuild:electron`.",
        );
      }
      void shutdown(code ?? 0);
    });
  };

  const restartElectron = async (): Promise<void> => {
    if (!started || shuttingDown) return;
    restarting = true;
    await killElectron();
    restarting = false;
    if (shuttingDown) return;
    console.log("[dev] main/preload changed — restarting Electron…");
    launchElectron();
  };

  const shutdown = async (code = 0): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (restartTimer !== null) clearTimeout(restartTimer);
    await killElectron();
    await server?.close().catch(() => undefined);
    await Promise.all(contexts.map((ctx) => ctx.dispose().catch(() => undefined)));
    process.exit(code);
  };

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  launchElectron();
  started = true;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
