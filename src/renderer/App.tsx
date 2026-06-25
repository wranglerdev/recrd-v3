import { useEffect, useState, type JSX } from "react";
import type { AppInfo } from "../shared/ipc-contract.js";

// Minimal bootstrap shell that proves the IPC bridge end-to-end by reading the
// app info from the main process. The real Home screen (PRD §8) is built by the
// UI epics.
export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let active = true;
    window.recrd
      .getAppInfo()
      .then((value) => {
        if (active) {
          setInfo(value);
        }
      })
      .catch(() => {
        /* main process unavailable — leave the placeholder */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <h1>recrd-agile-testing</h1>
      {info === null ? (
        <p>Carregando…</p>
      ) : (
        <p>
          {info.name} v{info.version} ({info.platform})
        </p>
      )}
    </main>
  );
}
