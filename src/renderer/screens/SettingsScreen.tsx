import { useState, type FormEvent, type JSX } from "react";
import type { SettingsDto } from "../../shared/ipc-contract.js";
import { Button, Input, LoadingState, Page, StatusMessage } from "../components/ui/index.js";
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
    return (
      <Page title="Configurações">
        <LoadingState label="Carregando configurações…" />
      </Page>
    );
  }
  if (error != null) {
    return (
      <Page title="Configurações">
        <StatusMessage tone="error">{error}</StatusMessage>
      </Page>
    );
  }
  if (data === null) {
    return (
      <Page title="Configurações">
        <StatusMessage>Configurações indisponíveis.</StatusMessage>
      </Page>
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
    <Page title="Configurações" description="Caminhos das ferramentas e preferências de gravação.">
      <form className="rc-form" onSubmit={handleSubmit} aria-label="Configurações">
        <fieldset className="rc-fieldset">
          <legend className="rc-fieldset__legend">Caminhos das ferramentas</legend>
          <Input
            label="Python"
            data-testid="settings-python"
            value={python}
            onChange={(e) => setPython(e.target.value)}
          />
          <Input
            label="Robot"
            data-testid="settings-robot"
            value={robot}
            onChange={(e) => setRobot(e.target.value)}
          />
        </fieldset>

        <fieldset className="rc-fieldset">
          <legend className="rc-fieldset__legend">Gravação</legend>
          <label className="rc-check">
            <input
              type="checkbox"
              data-testid="settings-capture-screenshots"
              checked={captureScreenshots}
              onChange={(e) => setCaptureScreenshots(e.target.checked)}
            />
            Capturar screenshots
          </label>
          <Input
            label="Timeout padrão (ms)"
            type="number"
            data-testid="settings-timeout"
            value={timeout}
            onChange={(e) => setTimeoutMs(e.target.value)}
          />
        </fieldset>

        {error != null ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        {status === "success" ? (
          <StatusMessage tone="success" data-testid="settings-saved">
            Configurações salvas.
          </StatusMessage>
        ) : null}
        <div className="rc-form__actions">
          <Button type="submit" data-testid="settings-save" loading={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Page>
  );
}
