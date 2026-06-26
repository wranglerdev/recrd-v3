import { createAuditFields, type AuditFields } from "../../domain/audit/audit-fields.js";
import { recordAuditEvent, type AuditSink } from "../audit/audit-service.js";
import type { UserContext } from "../../domain/auth/user-context.js";
import type { ManualScript } from "../../domain/scripts/script-action.js";

// Manual-script persistence (PRD §6, §10). As the Browser Sandbox captures
// interactions, the renderer accumulates them into a manual script and saves it
// here incrementally. The script is stored as JSON in the scripts table
// (kind = "manual"); a case has at most one manual script, so saving upserts it.
// Pure orchestration over injected ports, free of Node/Electron and unit-testable.

/** A persisted manual-script row with its audit trail. */
export interface ManualScriptRecord extends AuditFields {
  readonly id: string;
  readonly caseId: string;
  readonly kind: "manual";
  /** JSON-serialised {@link ManualScript}. */
  readonly content: string;
}

/** Persistence port for manual scripts, implemented by the infrastructure adapter. */
export interface ManualScriptStore {
  /** The manual script stored for a case, or undefined when none exists. */
  findByCase(caseId: string): ManualScriptRecord | undefined;
  create(record: ManualScriptRecord): ManualScriptRecord;
  update(id: string, patch: Partial<ManualScriptRecord>): ManualScriptRecord | undefined;
}

export interface SaveManualScriptInput {
  readonly caseId: string;
  readonly script: ManualScript;
}

export interface ScriptUseCaseDeps {
  readonly store: ManualScriptStore;
  readonly userContext: UserContext;
  readonly newId: () => string;
  readonly clock: () => Date;
  /** Optional audit trail; a save records a `test.change` event. */
  readonly audit?: AuditSink;
}

export interface ScriptUseCases {
  /** Upserts the case's manual script (create on first save, update thereafter). */
  saveManual(input: SaveManualScriptInput): ManualScriptRecord;
  /** Returns the case's recorded manual script, or undefined when none exists. */
  getManual(caseId: string): ManualScript | undefined;
}

export function createScriptUseCases(deps: ScriptUseCaseDeps): ScriptUseCases {
  const { store, userContext, newId, clock, audit } = deps;

  return {
    saveManual(input) {
      const now = clock();
      const content = JSON.stringify(input.script);
      const existing = store.findByCase(input.caseId);

      const saved =
        existing === undefined
          ? store.create({
              id: newId(),
              caseId: input.caseId,
              kind: "manual",
              content,
              ...createAuditFields(userContext.username, now),
            })
          : (store.update(existing.id, {
              content,
              updatedBy: userContext.username,
              updatedAt: now.toISOString(),
            }) ?? existing);

      if (audit) {
        recordAuditEvent(audit, {
          type: "test.change",
          user: userContext.username,
          now,
          details: {
            scriptId: saved.id,
            caseId: input.caseId,
            actions: input.script.actions.length,
          },
        });
      }
      return saved;
    },
    getManual(caseId) {
      const record = store.findByCase(caseId);
      return record === undefined ? undefined : (JSON.parse(record.content) as ManualScript);
    },
  };
}
