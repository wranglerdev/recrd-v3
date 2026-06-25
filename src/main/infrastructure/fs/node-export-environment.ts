import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExportEnvironment } from "../../../application/export/export-service.js";
import type { AppPaths } from "../paths/app-paths.js";

// Node-backed ExportEnvironment writing into the userData exports directory
// (PRD §4, §17). The exports dir is created at startup by ensureAppDirectories.
export function createExportEnvironment(paths: AppPaths): ExportEnvironment {
  return {
    exportsDir: paths.exportsDir,
    join: (dir, file) => join(dir, file),
    writeFile: (path, content) => writeFile(path, content, "utf8"),
  };
}
