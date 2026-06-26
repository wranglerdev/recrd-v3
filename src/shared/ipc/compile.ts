import { defineChannelNames, type Invoke } from "./core.js";

// `compile:*` feature contract — the compilation pipeline (PRD §13). Follows the
// app template. The wire types mirror the application compile result; the manual
// script is sent as plain serialisable data (a discriminated union of actions).

export type ScriptActionDto =
  | { readonly type: "navigate"; readonly url: string }
  | { readonly type: "click"; readonly selector: string }
  | { readonly type: "input"; readonly selector: string; readonly value: string }
  | { readonly type: "pressKey"; readonly selector: string; readonly key: string }
  | { readonly type: "wait"; readonly selector: string }
  | { readonly type: "assertText"; readonly selector: string; readonly text: string };

export interface ManualScriptDto {
  readonly name: string;
  readonly actions: readonly ScriptActionDto[];
}

export interface SelectorWarningDto {
  readonly index: number;
  readonly selector: string;
  readonly message: string;
}

export interface ValidationIssueDto {
  readonly index: number | null;
  readonly message: string;
}

export interface CompileRequest {
  readonly caseId: string;
  readonly projectId: string;
  readonly script: ManualScriptDto;
}

export type CompileResponse =
  | {
      readonly ok: true;
      readonly scriptId: string;
      readonly robot: string;
      readonly robotFile: string;
      readonly warnings: readonly SelectorWarningDto[];
    }
  | {
      readonly ok: false;
      readonly stage: "script" | "robot";
      readonly scriptErrors: readonly ValidationIssueDto[];
      readonly robotErrors: readonly string[];
      readonly warnings: readonly SelectorWarningDto[];
    };

export type CompileChannels = {
  "compile:run": { request: CompileRequest; response: CompileResponse };
};

export const COMPILE_CHANNELS = defineChannelNames<CompileChannels, ["compile:run"]>([
  "compile:run",
]);

/** The slice of the renderer API served by the compile feature. */
export interface CompileApi {
  /** Compiles a manual script, persisting the result and writing the .robot file. */
  compileScript(request: CompileRequest): Promise<CompileResponse>;
}

export function createCompileApi(invoke: Invoke<CompileChannels>): CompileApi {
  return {
    compileScript: (request) => invoke("compile:run", request),
  };
}
