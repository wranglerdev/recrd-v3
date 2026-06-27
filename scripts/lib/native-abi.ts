import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Native-ABI guard for better-sqlite3 (issues electron-9ac / electron-ckd).
//
// better-sqlite3 ships a single compiled binary that matches exactly one
// NODE_MODULE_VERSION at a time: the Vitest unit suite runs under Node (ABI 115
// on Node 20) while Electron 34 needs ABI 132. They cannot both be satisfied from
// one install, so `npm run dev` (Electron) and `npm test` (Node) each ensure the
// ABI they need before they run, instead of leaving it to manual rebuild scripts.
//
// Detection runs in a short-lived child Node process — NOT in-process — so the
// native .node is never mapped into the long-running dev/test process. On Windows
// a loaded .node is locked, which would make the subsequent prebuild-install
// overwrite fail with EBUSY; the child exits first, releasing any lock.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type Abi = "node" | "electron";

// Probe: try to open an in-memory database under plain Node. A successful open
// means the binary is the Node ABI; a NODE_MODULE_VERSION error means it is the
// Electron ABI; anything else (missing/corrupt binary) is "unknown".
const PROBE = [
  "try{",
  "const D=require('better-sqlite3');",
  "new D(':memory:').close();",
  "process.exit(10);",
  "}catch(e){",
  "process.exit(/NODE_MODULE_VERSION/.test(String((e&&e.message)||e))?11:12);",
  "}",
].join("");

/** Returns which ABI better-sqlite3's binary is currently built for. */
export function detectAbi(): Abi | "unknown" {
  const result = spawnSync(process.execPath, ["-e", PROBE], { cwd: root });
  if (result.status === 10) return "node";
  if (result.status === 11) return "electron";
  return "unknown";
}

/** Reads the installed Electron version from its package.json. */
function electronVersion(): string {
  const pkgPath = join(root, "node_modules", "electron", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

/**
 * Ensures better-sqlite3's native binary matches `target`, fetching the matching
 * prebuilt via prebuild-install when it does not. Idempotent and fast when the
 * ABI is already correct (a single ~100ms probe). prebuild-install with an
 * explicit --runtime/--target is used deliberately — `electron-builder
 * install-app-deps` reports success but leaves the wrong binary in place.
 */
export function ensureAbi(target: Abi): void {
  if (detectAbi() === target) return;

  const cwd = join(root, "node_modules", "better-sqlite3");
  const args =
    target === "electron"
      ? [
          "prebuild-install",
          "--runtime",
          "electron",
          "--target",
          electronVersion(),
          "--arch",
          process.arch,
        ]
      : ["prebuild-install"];

  const label = target === "electron" ? `Electron ${electronVersion()} (${process.arch})` : "Node";
  console.log(`[native-abi] rebuilding better-sqlite3 for ${label}…`);

  const result = spawnSync("npx", args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(
      `[native-abi] prebuild-install for the ${target} ABI failed (exit ${result.status ?? "signal"}). ` +
        `Run \`npm run rebuild:${target}\` manually to diagnose.`,
    );
  }
  console.log(`[native-abi] better-sqlite3 is now the ${target} ABI.`);
}
