import { spawnSync } from "node:child_process";
import { ensureAbi } from "./lib/native-abi.js";

// `npm test` — type-check the whole solution then run the Vitest suite,
// mirroring the flow described in PRD §28.
function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// The Vitest suite loads better-sqlite3 under Node; a prior `npm run dev`/E2E run
// leaves it on the Electron ABI. Flip it back so `npm test` just works.
ensureAbi("node");

run("npm", ["run", "typecheck"]);
run("npx", ["vitest", "run"]);
