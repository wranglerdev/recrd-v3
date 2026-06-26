import { generateRobot } from "../../domain/compiler/robot-generator.js";
import { optimizeScript } from "../../domain/compiler/optimize-script.js";
import { validateRobotSyntax } from "../../domain/compiler/validate-robot.js";
import type { ManualScript, ScriptAction } from "../../domain/scripts/script-action.js";
import { isAbsoluteXpath, isStableCss } from "../../domain/selectors/selector-stability.js";
import { validateScript, type ValidationIssue } from "../../domain/scripts/validate-script.js";

// Compilation pipeline use case (PRD §13). Orchestrates the existing domain steps
// into a single call: validate the manual script → analyse selector stability →
// optimise → generate Robot Framework code → validate the generated syntax.
// Pure orchestration (no Node/Electron); side effects (persisting/writing the
// .robot file) belong to the IPC handler that consumes this result.

const XPATH_PREFIX = "xpath=";

/** A non-blocking warning about a brittle selector used by an action (PRD §11). */
export interface SelectorWarning {
  readonly index: number;
  readonly selector: string;
  readonly message: string;
}

export interface CompileSuccess {
  readonly ok: true;
  /** The generated, syntactically-valid Robot Framework source. */
  readonly robot: string;
  readonly warnings: readonly SelectorWarning[];
}

export interface CompileFailure {
  readonly ok: false;
  /** Which stage rejected the input: the manual script, or the generated Robot. */
  readonly stage: "script" | "robot";
  readonly scriptErrors: readonly ValidationIssue[];
  readonly robotErrors: readonly string[];
  readonly warnings: readonly SelectorWarning[];
}

export type CompileResult = CompileSuccess | CompileFailure;

function selectorOf(action: ScriptAction): string | null {
  return "selector" in action ? action.selector : null;
}

/** A selector is brittle when it is positional CSS or an absolute XPath (PRD §11). */
function isUnstableSelector(selector: string): boolean {
  if (selector.startsWith(XPATH_PREFIX)) {
    return isAbsoluteXpath(selector.slice(XPATH_PREFIX.length));
  }
  return !isStableCss(selector);
}

function analyseSelectors(actions: readonly ScriptAction[]): SelectorWarning[] {
  const warnings: SelectorWarning[] = [];
  actions.forEach((action, index) => {
    const selector = selectorOf(action);
    if (selector !== null && isUnstableSelector(selector)) {
      warnings.push({
        index,
        selector,
        message: `Ação ${index + 1}: seletor instável "${selector}". Prefira um seletor mais estável.`,
      });
    }
  });
  return warnings;
}

/** Runs the full compile pipeline, returning the Robot source or aggregated errors. */
export function compileScript(script: ManualScript): CompileResult {
  const scriptValidation = validateScript(script);
  if (!scriptValidation.valid) {
    return {
      ok: false,
      stage: "script",
      scriptErrors: scriptValidation.errors,
      robotErrors: [],
      warnings: [],
    };
  }

  const warnings = analyseSelectors(script.actions);
  const robot = generateRobot(optimizeScript(script));
  const robotValidation = validateRobotSyntax(robot);
  if (!robotValidation.valid) {
    return {
      ok: false,
      stage: "robot",
      scriptErrors: [],
      robotErrors: robotValidation.errors,
      warnings,
    };
  }

  return { ok: true, robot, warnings };
}
