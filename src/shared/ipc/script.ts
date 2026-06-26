import { defineChannelNames, type Invoke } from "./core.js";
import type { ManualScriptDto } from "./compile.js";

// `script:*` feature contract — the manual script recorded for a case (PRD §6,
// §10). The renderer accumulates captured actions and saves the script
// incrementally; it can also load a case's existing recording (e.g. to compile
// or resume). Plain serialisable wire types reuse the compile DTOs.

export interface SaveManualScriptRequest {
  readonly caseId: string;
  readonly script: ManualScriptDto;
}

export interface GetManualScriptRequest {
  readonly caseId: string;
}

export type ScriptChannels = {
  "script:saveManual": { request: SaveManualScriptRequest; response: void };
  "script:getManual": { request: GetManualScriptRequest; response: ManualScriptDto | null };
};

export const SCRIPT_CHANNELS = defineChannelNames<
  ScriptChannels,
  ["script:saveManual", "script:getManual"]
>(["script:saveManual", "script:getManual"]);

/** The slice of the renderer API served by the script feature. */
export interface ScriptApi {
  /** Upserts the case's manual script (called incrementally while recording). */
  saveManualScript(request: SaveManualScriptRequest): Promise<void>;
  /** Loads the case's recorded manual script, or null when none exists. */
  getManualScript(request: GetManualScriptRequest): Promise<ManualScriptDto | null>;
}

export function createScriptApi(invoke: Invoke<ScriptChannels>): ScriptApi {
  return {
    saveManualScript: (request) => invoke("script:saveManual", request),
    getManualScript: (request) => invoke("script:getManual", request),
  };
}
