import { useState, type FormEvent, type JSX } from "react";
import { useBridge } from "../state/index.js";

// Browser Sandbox navigation bar (PRD §10, header Reload). A URL field that
// loads an address into the embedded BrowserView, plus back/forward/reload
// controls. All commands go to the main process over the `sandbox:*` IPC; the
// bridge is absent outside Electron, so the controls degrade to no-ops.

export function SandboxNavBar(): JSX.Element {
  const bridge = useBridge();
  const [url, setUrl] = useState("");

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = url.trim();
    if (bridge === null || trimmed === "") {
      return;
    }
    // Default to https when the user omits the scheme.
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    void bridge.openSandbox({ url: target });
  };

  return (
    <form aria-label="Navegação do sandbox" onSubmit={handleSubmit}>
      <button type="button" aria-label="Voltar" onClick={() => void bridge?.sandboxBack()}>
        ◀
      </button>
      <button type="button" aria-label="Avançar" onClick={() => void bridge?.sandboxForward()}>
        ▶
      </button>
      <button type="button" aria-label="Recarregar" onClick={() => void bridge?.sandboxReload()}>
        ⟳
      </button>
      <input
        type="text"
        aria-label="Endereço"
        placeholder="https://exemplo.com"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <button type="submit">Ir</button>
    </form>
  );
}
