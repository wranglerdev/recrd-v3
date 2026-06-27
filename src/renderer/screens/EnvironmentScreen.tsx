import { useState, type JSX } from "react";
import type { EnvironmentStatusDto } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcEvent, useIpcQuery } from "../state/index.js";

// Environment screen (PRD §14): shows the status of Python, the virtualenv,
// Robot Framework and the Playwright browser, probed in the main process against
// the active project's Robot path. When the environment is incomplete it offers a
// 1-click install that runs the plan in the main process, streaming each command's
// output here live (env:install:* events). The bridge is absent outside Electron,
// so the query stays idle and the actions are inert.

function StatusRow({ label, ok }: { readonly label: string; readonly ok: boolean }): JSX.Element {
  return (
    <li data-testid="environment-status-row" data-ok={ok}>
      <span aria-hidden>{ok ? "✔" : "✘"}</span> {label}: {ok ? "OK" : "Pendente"}
    </li>
  );
}

export function EnvironmentScreen(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();
  const root = activeProject?.robotPath ?? null;

  const { data, loading, error, reload } = useIpcQuery<EnvironmentStatusDto>(
    bridge === null ? null : () => bridge.checkEnvironment({ root }),
    [bridge, root],
  );

  const [installing, setInstalling] = useState(false);
  const [log, setLog] = useState<readonly string[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);

  useIpcEvent("env:install:line", (payload) => {
    setLog((lines) => [...lines, payload.line]);
  });
  useIpcEvent("env:install:done", (payload) => {
    setInstalling(false);
    if (!payload.ok) {
      setInstallError(`Falha ao executar: ${payload.failedCommand ?? "comando desconhecido"}`);
    }
    reload();
  });

  const handleInstall = (): void => {
    if (bridge === null || root === null) {
      return;
    }
    setInstalling(true);
    setLog([]);
    setInstallError(null);
    void bridge.startEnvironmentInstall({ root }).then((result) => {
      if (!result.started) {
        setInstalling(false);
        setInstallError(result.reason);
      }
    });
  };

  const canInstall = data !== null && !data.report.ready && root !== null;

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

          <ul aria-label="Status do ambiente" data-testid="environment-status" data-ready={data.report.ready}>
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
              <ol data-testid="install-plan">
                {data.plan.map((command) => (
                  <li key={command} data-testid="install-plan-step">
                    <code>{command}</code>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!data.report.ready &&
            (root === null ? (
              <p>Selecione um projeto com repositório Robot para instalar o ambiente.</p>
            ) : (
              <button
                type="button"
                data-testid="install-button"
                onClick={handleInstall}
                disabled={installing || !canInstall}
              >
                {installing ? "Instalando…" : "Instalar ambiente"}
              </button>
            ))}
        </>
      )}

      {installError !== null && <p role="alert">{installError}</p>}

      {log.length > 0 && (
        <section aria-label="Progresso da instalação">
          <h3>Progresso</h3>
          <pre data-testid="install-progress">{log.join("\n")}</pre>
        </section>
      )}
    </section>
  );
}
