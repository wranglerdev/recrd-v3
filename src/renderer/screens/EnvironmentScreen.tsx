import type { JSX } from "react";
import type { EnvironmentStatusDto } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcQuery } from "../state/index.js";

// Environment screen (PRD §14): shows the status of Python, the virtualenv,
// Robot Framework and the Playwright browser, probed in the main process against
// the active project's Robot path, plus the install plan needed to make it
// ready. Read-only here; running the install (with streaming progress) is a
// separate feature. The bridge is absent outside Electron, so the query is idle.

function StatusRow({ label, ok }: { readonly label: string; readonly ok: boolean }): JSX.Element {
  return (
    <li>
      <span aria-hidden>{ok ? "✔" : "✘"}</span> {label}: {ok ? "OK" : "Pendente"}
    </li>
  );
}

export function EnvironmentScreen(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();
  const root = activeProject?.robotPath ?? null;

  const { data, loading, error } = useIpcQuery<EnvironmentStatusDto>(
    bridge === null ? null : () => bridge.checkEnvironment({ root }),
    [bridge, root],
  );

  return (
    <section aria-label="Ambiente">
      <h2>Ambiente Robot</h2>

      {error !== null && <p role="alert">{error}</p>}
      {loading && <p>Verificando ambiente…</p>}

      {data !== null && (
        <>
          <p>
            {data.report.ready
              ? "Ambiente pronto para execução."
              : "Ambiente incompleto — veja o plano de instalação abaixo."}
          </p>

          <ul aria-label="Status do ambiente">
            <StatusRow
              label={`Python${data.report.python.version ? ` ${data.report.python.version}` : ""}`}
              ok={data.report.python.installed}
            />
            <StatusRow label="Virtualenv (.venv)" ok={data.report.venvPresent} />
            <StatusRow label="Robot Framework" ok={data.report.robotFramework} />
            <StatusRow label="Navegador Playwright" ok={data.report.playwrightBrowser} />
          </ul>

          {data.plan.length > 0 && (
            <section aria-label="Plano de instalação">
              <h3>Plano de instalação</h3>
              <ol>
                {data.plan.map((command) => (
                  <li key={command}>
                    <code>{command}</code>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </section>
  );
}
