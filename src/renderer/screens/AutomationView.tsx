import { useState, type JSX } from "react";
import { useActiveProject, useBridge, useIpcEvent } from "../state/index.js";
import { AutomationScreen } from "./AutomationScreen.js";

// Automation container (PRD §9, §15): wires the presentational AutomationScreen
// toolbar to the Robot run IPC. Play starts a run of the active project's Robot
// tree; the run's stdout streams into the log panel via the `run:*` events; Stop
// (and Pause — Robot has no pause) stops it. Export/Compile are separate features
// and stay inert here.

const NOOP = (): void => {
  /* export/compile are wired by their own features */
};

export function AutomationView(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useIpcEvent("run:line", (payload) => setLog((lines) => [...lines, payload.line]));
  useIpcEvent("run:exit", (payload) => {
    setRunning(false);
    setLog((lines) => [...lines, `— processo encerrado (código ${payload.exitCode})`]);
  });

  const handlePlay = (): void => {
    if (bridge === null || activeProject === null) {
      setError("Selecione um projeto para executar.");
      return;
    }
    setRunning(true);
    setLog([]);
    setError(null);
    void bridge.startRun({ projectId: activeProject.id }).then((result) => {
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

  return (
    <AutomationScreen
      title={activeProject?.name ?? "Automação"}
      toolbar={{
        onPlay: handlePlay,
        onPause: handleStop,
        onStop: handleStop,
        onReload: handlePlay,
        onExport: NOOP,
        onCompile: NOOP,
      }}
      sidebar={
        <section aria-label="Log de execução">
          <p>{running ? "Executando…" : "Parado"}</p>
          {error !== null && <p role="alert">{error}</p>}
          {log.length > 0 && <pre>{log.join("\n")}</pre>}
        </section>
      }
    />
  );
}
