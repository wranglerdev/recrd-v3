import { createAuditFields, type AuditFields } from "../../domain/audit/audit-fields.js";
import { recordAuditEvent, type AuditSink } from "../audit/audit-service.js";
import type { ManualScript } from "../../domain/scripts/script-action.js";
import type { AuditContext } from "../crud/audited-crud.js";
import type { ProjectUseCases } from "../project/project-service.js";
import { compileScript, type CompileFailure, type SelectorWarning } from "./compile-pipeline.js";

// Compile-and-persist use case (PRD §13, §14). Wraps the pure compile pipeline
// with its side effects: on success it persists the compiled script
// (scripts.kind = "compiled") and writes the generated `.robot` file into the
// project's Robot tree (tests/). Pure orchestration over injected ports — the
// SQLite scripts repository, the Project use cases and an on-disk Robot file
// writer — so the Node/Electron specifics stay in infrastructure.

/** A persisted compiled script row with its audit trail. */
export interface CompiledScript extends AuditFields {
  readonly id: string;
  readonly caseId: string;
  readonly kind: "compiled";
  readonly content: string;
}

/** Persistence port for compiled scripts, implemented by the infrastructure adapter. */
export interface CompiledScriptRepository {
  create(script: CompiledScript): CompiledScript;
}

/** Writes the generated `.robot` into the project's Robot tree; returns its path. */
export interface RobotFileWriter {
  /** Writes `content` to `<robotPath>/tests/<fileName>` and returns the absolute path. */
  write(robotPath: string, fileName: string, content: string): string;
}

export interface CompileAndPersistInput {
  readonly caseId: string;
  readonly projectId: string;
  readonly script: ManualScript;
}

export interface CompileAndPersistSuccess {
  readonly ok: true;
  /** Id of the persisted compiled script row. */
  readonly scriptId: string;
  /** The generated, syntactically-valid Robot Framework source. */
  readonly robot: string;
  /** Absolute path of the `.robot` file written under the Robot project. */
  readonly robotFile: string;
  readonly warnings: readonly SelectorWarning[];
}

/** Success augments the pipeline output with the persisted id + file; failure is reused as-is. */
export type CompileAndPersistResult = CompileAndPersistSuccess | CompileFailure;

export interface CompileUseCaseDeps extends AuditContext {
  readonly scripts: CompiledScriptRepository;
  readonly robotFiles: RobotFileWriter;
  /** Only the project operations this use case needs. */
  readonly projects: Pick<ProjectUseCases, "open">;
  /** Optional audit trail; a successful compile records a `compile` event. */
  readonly audit?: AuditSink;
}

export interface CompileUseCases {
  compileAndPersist(input: CompileAndPersistInput): CompileAndPersistResult;
}

/** Turns a script name into a safe `.robot` file name (lowercase, ascii-ish). */
export function robotFileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${slug.length === 0 ? "test" : slug}.robot`;
}

export function createCompileUseCases(deps: CompileUseCaseDeps): CompileUseCases {
  const { scripts, robotFiles, projects, userContext, newId, clock, audit } = deps;
  return {
    compileAndPersist(input) {
      const result = compileScript(input.script);
      if (!result.ok) {
        return result;
      }

      // Resolve the project up front so a missing Robot path fails before we
      // persist anything (a compiled script with nowhere to write is useless).
      const project = projects.open(input.projectId);
      if (project.robotPath === null) {
        throw new Error("Projeto sem repositório Robot configurado");
      }

      const now = clock();
      const stored = scripts.create({
        id: newId(),
        caseId: input.caseId,
        kind: "compiled",
        content: result.robot,
        ...createAuditFields(userContext.username, now),
      });
      const robotFile = robotFiles.write(
        project.robotPath,
        robotFileName(input.script.name),
        result.robot,
      );

      if (audit) {
        recordAuditEvent(audit, {
          type: "compile",
          user: userContext.username,
          now,
          details: {
            scriptId: stored.id,
            caseId: input.caseId,
            projectId: input.projectId,
            robotFile,
          },
        });
      }

      return {
        ok: true,
        scriptId: stored.id,
        robot: result.robot,
        robotFile,
        warnings: result.warnings,
      };
    },
  };
}
