import { generateRobot } from "../../domain/compiler/robot-generator.js";
import {
  executionLogFileName,
  recrdJsonFileName,
  robotFileName,
  serializeManualScript,
} from "../../domain/export/export-format.js";
import type { ManualScript } from "../../domain/scripts/script-action.js";

// Export use cases (PRD §17). Side effects (writing files, joining paths) are
// injected via ExportEnvironment so the orchestration is unit-testable and the
// application layer stays free of Node/Electron.

export interface ExportEnvironment {
  readonly exportsDir: string;
  join(dir: string, file: string): string;
  writeFile(path: string, content: string): Promise<void>;
}

/** Exports the raw manual script as `<name>.recrd.json`; returns the written path. */
export async function exportManualScriptJson(
  script: ManualScript,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, recrdJsonFileName(script.name));
  await env.writeFile(path, serializeManualScript(script));
  return path;
}

/** Compiles and exports the script as `<name>.robot`; returns the written path. */
export async function exportCompiledRobot(
  script: ManualScript,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, robotFileName(script.name));
  await env.writeFile(path, generateRobot(script));
  return path;
}

/** Exports an execution log as `execution-YYYY-MM-DD.log`; returns the written path. */
export async function exportExecutionLog(
  log: string,
  date: Date,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, executionLogFileName(date));
  await env.writeFile(path, log);
  return path;
}
