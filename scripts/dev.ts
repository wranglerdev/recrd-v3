import { spawn } from "node:child_process";
import { createServer } from "vite";
import { context } from "esbuild";

// Dev runner (PRD §28). Bundles main/preload with esbuild in watch mode, starts
// the Vite dev server for the renderer, then launches Electron pointed at the
// dev-server URL via VITE_DEV_SERVER_URL.
async function main(): Promise<void> {
  const mainCtx = await context({
    entryPoints: ["src/main/main.ts"],
    outfile: "dist/main/main.js",
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    sourcemap: true,
    external: ["electron", "better-sqlite3", "electron-store", "electron-log"],
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
  });
  await Promise.all([mainCtx.watch(), preloadCtx.watch(), sandboxPreloadCtx.watch()]);

  const server = await createServer();
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (url === undefined) {
    throw new Error("Vite dev server did not report a local URL");
  }
  server.printUrls();

  const electronBin = (await import("electron")).default as unknown as string;
  const child = spawn(electronBin, ["."], {
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
  });

  child.on("exit", () => {
    void server.close();
    void mainCtx.dispose();
    void preloadCtx.dispose();
    void sandboxPreloadCtx.dispose();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
