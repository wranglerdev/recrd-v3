import { build, type BuildOptions } from "esbuild";

// Bundles the Electron main and preload processes with esbuild. Native modules
// (better-sqlite3, electron) are kept external — they are resolved at runtime
// from node_modules inside the packaged app.
const EXTERNAL = ["electron", "better-sqlite3", "electron-store", "electron-log"];

const common: BuildOptions = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  external: EXTERNAL,
  logLevel: "info",
};

async function main(): Promise<void> {
  await Promise.all([
    build({
      ...common,
      entryPoints: ["src/main/main.ts"],
      outfile: "dist/main/main.js",
    }),
    build({
      ...common,
      entryPoints: ["src/preload/preload.ts"],
      outfile: "dist/preload/preload.js",
    }),
  ]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
