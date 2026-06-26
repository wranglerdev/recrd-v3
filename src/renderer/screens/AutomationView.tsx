import { useCallback, useState, type JSX } from "react";
import { useActiveProject, useBridge, useIpcEvent } from "../state/index.js";
import { errorMessage } from "../state/useIpc.js";
import { AutomationScreen } from "./AutomationScreen.js";
import { CaseExecutionHistory } from "./CaseExecutionHistory.js";
import { PropertiesPanel } from "./PropertiesPanel.js";
import { SandboxNavBar } from "./SandboxNavBar.js";
import { TogglesPanel } from "./TogglesPanel.js";
import type { ViewportRect } from "./use-resize-rect.js";

// Automation container (PRD §9, §15, §17): wires the presentational
// AutomationScreen toolbar to the Robot run + export IPC. Play starts a run of
// the active project's Robot tree; the run's stdout streams into the log panel
// via the `run:*` events; Stop (and Pause — Robot has no pause) stops it. When a
// case is selected its past runs are listed in the sidebar (PRD §8), refreshed
// when a run finishes, and each can have its log exported; Export writes the
// case's manual-script JSON and compiled .robot to the exports dir (PRD §17).
// Compile is a separate feature and stays inert here.

const NOOP = (): void => {
  /* compile is wired by its own feature */
};

export function AutomationView(): JSX.Element {
  const bridge = useBridge();
  const { activeProject, activeCase } = useActiveProject();

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // The last run's exit code, or null before any run finishes — drives the
  // final-result badge (PRD §15: 0 = aprovado, anything else = falhou).
  const [exitCode, setExitCode] = useState<number | null>(null);
  // Bumped when a run finishes so the per-case history re-fetches the new row.
  const [historyKey, setHistoryKey] = useState(0);
  // Feedback for the export actions (written paths, or a failure message).
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useIpcEvent("run:line", (payload) => setLog((lines) => [...lines, payload.line]));
  useIpcEvent("run:exit", (payload) => {
    setRunning(false);
    setExitCode(payload.exitCode);
    setLog((lines) => [...lines, `— processo encerrado (código ${payload.exitCode})`]);
    setHistoryKey((key) => key + 1);
  });

  const handlePlay = (): void => {
    if (bridge === null || activeProject === null) {
      setError("Selecione um projeto para executar.");
      return;
    }
    setRunning(true);
    setLog([]);
    setError(null);
    setExitCode(null);
    // A selected case scopes the run so the finished execution is recorded.
    const request =
      activeCase === null
        ? { projectId: activeProject.id }
        : { projectId: activeProject.id, caseId: activeCase.id };
    void bridge.startRun(request).then((result) => {
      if (!result.started) {
        setRunning(false);
        setError(result.reason);
      }
    });
  };

  const handleStop = (): void => {
    if (bridge !== null) {
      void bridge.stopRun();
    }
  };

  // Keep the embedded BrowserView aligned with the sandbox region: push its rect
  // and show it; hide it when the region unmounts (PRD §9, §10).
  const handleSandboxViewport = useCallback(
    (rect: ViewportRect | null): void => {
      if (bridge === null) {
        return;
      }
      if (rect === null) {
        void bridge.setSandboxVisible({ visible: false });
        return;
      }
      void bridge.setSandboxBounds(rect);
      void bridge.setSandboxVisible({ visible: true });
    },
    [bridge],
  );

  const handleExport = (): void => {
    if (bridge === null || activeCase === null) {
      setExportMsg("Selecione um caso para exportar.");
      return;
    }
    setExportMsg("Exportando…");
    const caseId = activeCase.id;
    void Promise.all([bridge.exportJson({ caseId }), bridge.exportRobot({ caseId })])
      .then(([json, robot]) => setExportMsg(`Exportado: ${json.path}, ${robot.path}`))
      .catch((cause: unknown) => setExportMsg(errorMessage(cause)));
  };

  const handleExportLog = (executionId: string): void => {
    if (bridge === null) {
      return;
    }
    setExportMsg("Exportando log…");
    void bridge
      .exportLog({ executionId })
      .then((result) => setExportMsg(`Log exportado: ${result.path}`))
      .catch((cause: unknown) => setExportMsg(errorMessage(cause)));
  };

  return (
    <AutomationScreen
      title={activeCase?.name ?? activeProject?.name ?? "Automação"}
      toolbar={{
        onPlay: handlePlay,
        onPause: handleStop,
        onStop: handleStop,
        onReload: handlePlay,
        onExport: handleExport,
        onCompile: NOOP,
      }}
      navBar={<SandboxNavBar />}
      panels={{ properties: <PropertiesPanel />, toggles: <TogglesPanel /> }}
      onSandboxViewportChange={handleSandboxViewport}
      sidebar={
        <>
          <section aria-label="Log de execução">
            <p>{running ? "Executando…" : "Parado"}</p>
            {!running && exitCode !== null && (
              <p>
                Resultado:{" "}
                <strong>{exitCode === 0 ? "Aprovado ✓" : `Falhou ✗ (código ${exitCode})`}</strong>
              </p>
            )}
            {error !== null && <p role="alert">{error}</p>}
            {exportMsg !== null && <p aria-label="Status da exportação">{exportMsg}</p>}
            {log.length > 0 && <pre>{log.join("\n")}</pre>}
          </section>
          {activeCase !== null && (
            <CaseExecutionHistory
              caseId={activeCase.id}
              reloadKey={historyKey}
              onExportLog={handleExportLog}
            />
          )}
        </>
      }
    />
  );
}
