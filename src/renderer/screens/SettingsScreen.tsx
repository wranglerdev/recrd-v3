import { useState, type FormEvent, type JSX } from "react";
import type { SettingsDto } from "../../shared/ipc-contract.js";
import { useBridge, useIpcAction, useIpcQuery } from "../state/index.js";

// Settings screen (PRD §3, §4): edits the python/robot tool paths and recording
// preferences persisted via electron-store. Loads the current settings through
// the bridge, then a controlled form patches only what changed.

export function SettingsScreen(): JSX.Element {
  const bridge = useBridge();
  const { data, loading, error, reload } = useIpcQuery<SettingsDto>(
    bridge === null ? null : () => bridge.getSettings(),
    [bridge],
  );

  if (loading) {
    return <p>Carregando configurações…</p>;
  }
  if (error != null) {
    return (
      <section aria-label="Configurações">
        <h2>Configurações</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }
  if (data === null) {
    return (
      <section aria-label="Configurações">
        <h2>Configurações</h2>
        <p>Configurações indisponíveis.</p>
      </section>
    );
  }

  return <SettingsForm initial={data} onSaved={reload} />;
}

function SettingsForm({
  initial,
  onSaved,
}: {
  initial: SettingsDto;
  onSaved: () => void;
}): JSX.Element {
  const bridge = useBridge();
  const [python, setPython] = useState(initial.toolPaths.python ?? "");
  const [robot, setRobot] = useState(initial.toolPaths.robot ?? "");
  const [captureScreenshots, setCaptureScreenshots] = useState(
    initial.recording.captureScreenshots,
  );
  const [timeout, setTimeoutMs] = useState(String(initial.recording.defaultTimeoutMs));

  const { run, loading, status, error } = useIpcAction(async () => {
    if (bridge === null) {
      throw new Error("Recurso indisponível fora do aplicativo.");
    }
    return bridge.updateSettings({
      toolPaths: {
        python: python.trim().length === 0 ? null : python.trim(),
        robot: robot.trim().length === 0 ? null : robot.trim(),
      },
      recording: {
        captureScreenshots,
        defaultTimeoutMs: Number.parseInt(timeout, 10) || 0,
      },
    });
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void run().then((saved) => {
      if (saved !== null) {
        onSaved();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Configurações">
      <h2>Configurações</h2>

      <fieldset>
        <legend>Caminhos das ferramentas</legend>
        <label>
          Python
          <input
            data-testid="settings-python"
            value={python}
            onChange={(e) => setPython(e.target.value)}
          />
        </label>
        <label>
          Robot
          <input
            data-testid="settings-robot"
            value={robot}
            onChange={(e) => setRobot(e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Gravação</legend>
        <label>
          <input
            type="checkbox"
            data-testid="settings-capture-screenshots"
            checked={captureScreenshots}
            onChange={(e) => setCaptureScreenshots(e.target.checked)}
          />
          Capturar screenshots
        </label>
        <label>
          Timeout padrão (ms)
          <input
            type="number"
            data-testid="settings-timeout"
            value={timeout}
            onChange={(e) => setTimeoutMs(e.target.value)}
          />
        </label>
      </fieldset>

      {error != null ? <p role="alert">{error}</p> : null}
      {status === "success" ? (
        <p role="status" data-testid="settings-saved">
          Configurações salvas.
        </p>
      ) : null}
      <button type="submit" data-testid="settings-save" disabled={loading}>
        {loading ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
