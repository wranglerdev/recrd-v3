import { build, type BuildOptions } from "esbuild";

// Bundles the Electron main and preload processes with esbuild.
//
// - main: ESM output (the package is "type": "module", and electron-store v10 is
//   ESM-only). Native/Electron deps stay external and are resolved at runtime.
// - preload: CJS output (.cjs) so it loads under contextIsolation regardless of
//   the package module type; only `electron` is external, the rest is bundled.
const MAIN_EXTERNAL = ["electron", "better-sqlite3", "electron-store", "electron-log"];

const common: BuildOptions = {
  bundle: true,
  platform: "node",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
};

async function main(): Promise<void> {
  await Promise.all([
    build({
      ...common,
      entryPoints: ["src/main/main.ts"],
      outfile: "dist/main/main.js",
      format: "esm",
      external: MAIN_EXTERNAL,
    }),
    build({
      ...common,
      entryPoints: ["src/preload/preload.ts"],
      outfile: "dist/preload/preload.cjs",
      format: "cjs",
      external: ["electron"],
    }),
    build({
      ...common,
      entryPoints: ["src/preload/sandbox-preload.ts"],
      outfile: "dist/preload/sandbox-preload.cjs",
      format: "cjs",
      external: ["electron"],
    }),
  ]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
