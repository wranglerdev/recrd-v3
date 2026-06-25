import { spawnSync } from "node:child_process";

// `npm run build` — local build pipeline (PRD §28):
// type-check + lint  ->  Vite (renderer) + esbuild (main/preload)  ->  tests.
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
run("npm", ["run", "lint"]);
run("npm", ["run", "build:renderer"]);
run("npm", ["run", "build:main"]);
run("npm", ["run", "test:unit"]);
