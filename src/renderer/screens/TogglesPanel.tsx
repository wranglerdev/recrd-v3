import { type JSX } from "react";
import type { SettingsDto } from "../../shared/ipc-contract.js";
import { Input, StatusMessage } from "../components/ui/index.js";
import { useBridge, useIpcAction, useIpcQuery } from "../state/index.js";

// Toggles panel (PRD §9): recording preferences that drive how a session is
// captured — screenshot capture and the default step timeout — persisted through
// the settings store. Changes are written immediately and the local view is
// refreshed from the returned settings. The bridge is absent outside Electron,
// so the panel degrades to a disabled placeholder.

export function TogglesPanel(): JSX.Element {
  const bridge = useBridge();
  const { data, reload } = useIpcQuery<SettingsDto>(
    bridge === null ? null : () => bridge.getSettings(),
    [bridge],
  );

  const { run, error } = useIpcAction(async (patch: SettingsDto["recording"]) => {
    if (bridge === null) {
      throw new Error("Recurso indisponível fora do aplicativo.");
    }
    return bridge.updateSettings({ recording: patch });
  });

  if (data === null) {
    return <StatusMessage>Preferências de gravação indisponíveis.</StatusMessage>;
  }

  const recording = data.recording;

  const save = (patch: Partial<SettingsDto["recording"]>): void => {
    void run({ ...recording, ...patch }).then((result) => {
      if (result !== null) {
        reload();
      }
    });
  };

  return (
    <div className="rc-form">
      <label className="rc-check">
        <input
          type="checkbox"
          checked={recording.captureScreenshots}
          onChange={(event) => save({ captureScreenshots: event.target.checked })}
        />
        Capturar screenshots
      </label>
      <Input
        label="Timeout padrão (ms)"
        type="number"
        min={0}
        value={recording.defaultTimeoutMs}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= 0) {
            save({ defaultTimeoutMs: next });
          }
        }}
      />
      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}
    </div>
  );
}
