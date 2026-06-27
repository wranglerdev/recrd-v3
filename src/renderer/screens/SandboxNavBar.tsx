import { useState, type FormEvent, type JSX } from "react";
import { Button, IconButton, Input } from "../components/ui/index.js";
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
    <form className="sandbox-nav" aria-label="Navegação do sandbox" onSubmit={handleSubmit}>
      <IconButton label="Voltar" icon="◀" onClick={() => void bridge?.sandboxBack()} />
      <IconButton label="Avançar" icon="▶" onClick={() => void bridge?.sandboxForward()} />
      <IconButton label="Recarregar" icon="⟳" onClick={() => void bridge?.sandboxReload()} />
      <Input
        className="sandbox-nav__url"
        label="Endereço"
        hideLabel
        type="text"
        placeholder="https://exemplo.com"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <Button type="submit" size="sm">
        Ir
      </Button>
    </form>
  );
}
