import { spawnSync } from "node:child_process";

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

run("npm", ["run", "typecheck"]);
run("npx", ["vitest", "run"]);
