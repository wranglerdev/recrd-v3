// Stable data-testid registry for the E2E suites (electron-bzv.5). The renderer
// components tag their structural elements with these ids; flow suites select by
// id wherever structure (lists/grids/trees/badges) matters, instead of brittle
// pt-BR label text. Keep this in sync with the data-testid attributes in
// src/renderer. Values are the literal attribute values; `nav(view)` and the
// data-* lookups below cover the parameterised ones.

export const TESTID = {
  // App shell sidebar — one per View in App.tsx (nav-${view}).
  navHome: "nav-home",
  navExplorer: "nav-explorer",
  navAutomation: "nav-automation",
  navMass: "nav-mass",
  navGit: "nav-git",
  navAudit: "nav-audit",
  navEnvironment: "nav-environment",
  navSettings: "nav-settings",
  navAbout: "nav-about",

  // Recording controls.
  recordingState: "recording-state",
  recordingStart: "recording-start",
  recordingPause: "recording-pause",
  recordingResume: "recording-resume",
  recordingStop: "recording-stop",

  // Timeline (one timeline-step per recorded action; fields/selector per step).
  timeline: "timeline",
  timelineStep: "timeline-step",
  timelineStepLabel: "timeline-step-label",
  timelineStepField: "timeline-step-field",
  timelineStepSelector: "timeline-step-selector",

  // Compile result view.
  compileResult: "compile-result",
  compileStatus: "compile-status",
  compileRobotPreview: "compile-robot-preview",
  compileWarnings: "compile-warnings",
  compileErrors: "compile-errors",

  // Run log + final-result badge (data-exit-code carries the numeric code).
  runStatus: "run-status",
  runResultBadge: "run-result-badge",
  runError: "run-error",
  runLog: "run-log",
  exportStatus: "export-status",

  // Per-case execution history (data-result on each row).
  executionHistory: "execution-history",
  executionRow: "execution-row",
  executionExportLog: "execution-export-log",

  // Mass grid + import (data-row/data-column on cells, data-mass-id on selectors).
  massImport: "mass-import",
  massList: "mass-list",
  massSelect: "mass-select",
  massGrid: "mass-grid",
  massColumn: "mass-column",
  massRow: "mass-row",
  massCell: "mass-cell",
  massHistory: "mass-history",
  massHistoryRow: "mass-history-row",

  // Project explorer tree + context actions (data-node-id on tree nodes).
  treeNode: "tree-node",
  explorerContext: "explorer-context",
  explorerDelete: "explorer-delete",

  // Environment screen (data-ok on rows, data-ready on the list).
  environmentStatus: "environment-status",
  environmentStatusRow: "environment-status-row",
  installPlan: "install-plan",
  installPlanStep: "install-plan-step",
  installButton: "install-button",
  installProgress: "install-progress",

  // Git panel (data-status on each changed-file row).
  gitBranch: "git-branch",
  gitChanges: "git-changes",
  gitChangeRow: "git-change-row",
  gitOpenExternal: "git-open-external",

  // Settings form.
  settingsPython: "settings-python",
  settingsRobot: "settings-robot",
  settingsCaptureScreenshots: "settings-capture-screenshots",
  settingsTimeout: "settings-timeout",
  settingsSave: "settings-save",
  settingsSaved: "settings-saved",

  // Element inspector panel.
  inspectToggle: "inspect-toggle",
  inspectedElement: "inspected-element",
  inspectedTag: "inspected-tag",
  inspectedId: "inspected-id",
  inspectedClasses: "inspected-classes",
  inspectedXpath: "inspected-xpath",
  inspectedSelector: "inspected-selector",

  // New project form.
  newProjectName: "new-project-name",
  newProjectDescription: "new-project-description",
  newProjectRepoNew: "new-project-repo-new",
  newProjectRepoExisting: "new-project-repo-existing",
  newProjectSubmit: "new-project-submit",
} as const;

/** The sidebar nav-item test id for a primary view. */
export function navTestId(view: string): string {
  return `nav-${view}`;
}
