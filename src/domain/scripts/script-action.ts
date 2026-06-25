// Intermediate representation of a recorded test (PRD §6, §13). A ManualScript is
// the captured sequence of user actions; the compiler turns it into Robot
// Framework + Playwright code. Pure data — no DOM/Node.

export type ScriptAction =
  | { readonly type: "navigate"; readonly url: string }
  | { readonly type: "click"; readonly selector: string }
  | { readonly type: "input"; readonly selector: string; readonly value: string }
  | { readonly type: "wait"; readonly selector: string }
  | { readonly type: "assertText"; readonly selector: string; readonly text: string };

export type ActionType = ScriptAction["type"];

export type ManualScript = {
  readonly name: string;
  readonly actions: readonly ScriptAction[];
};
