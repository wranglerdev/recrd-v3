import { useState, type JSX } from "react";
import type { EnvironmentStatusDto } from "../../shared/ipc-contract.js";
import { Button, LoadingState, Page, Panel, StatusMessage } from "../components/ui/index.js";
import { useActiveProject, useBridge, useIpcEvent, useIpcQuery } from "../state/index.js";

// Environment screen (PRD §14): shows the status of Python, the virtualenv,
// Robot Framework and the Playwright browser, probed in the main process against
// the active project's Robot path. When the environment is incomplete it offers a
// 1-click install that runs the plan in the main process, streaming each command's
// output here live (env:install:* events). The bridge is absent outside Electron,
// so the query stays idle and the actions are inert.

function StatusRow({ label, ok }: { readonly label: string; readonly ok: boolean }): JSX.Element {
  return (
    <li className="rc-env-status__row" data-testid="environment-status-row" data-ok={ok}>
      <span className="rc-env-status__icon" aria-hidden>
        {ok ? "✔" : "✘"}
      </span>{" "}
      {label}: {ok ? "OK" : "Pendente"}
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
    <Page
      title="Ambiente Robot"
      description="Status do Python, virtualenv, Robot Framework e Playwright."
    >
      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}
      {loading && <LoadingState label="Verificando ambiente…" />}

      {data !== null && (
        <>
          <StatusMessage>
            {data.report.ready
              ? "Ambiente pronto para execução."
              : "Ambiente incompleto — veja o plano de instalação abaixo."}
          </StatusMessage>

          <Panel title="Status do ambiente">
            <ul
              className="rc-env-status"
              aria-label="Status do ambiente"
              data-testid="environment-status"
              data-ready={data.report.ready}
            >
              <StatusRow
                label={`Python${data.report.python.version ? ` ${data.report.python.version}` : ""}`}
                ok={data.report.python.installed}
              />
              <StatusRow label="Virtualenv (.venv)" ok={data.report.venvPresent} />
              <StatusRow label="Robot Framework" ok={data.report.robotFramework} />
              <StatusRow label="Navegador Playwright" ok={data.report.playwrightBrowser} />
            </ul>
          </Panel>

          {data.plan.length > 0 && (
            <Panel title="Plano de instalação">
              <ol className="rc-plan" data-testid="install-plan">
                {data.plan.map((command) => (
                  <li className="rc-plan__step" key={command} data-testid="install-plan-step">
                    <code>{command}</code>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {!data.report.ready &&
            (root === null ? (
              <StatusMessage>
                Selecione um projeto com repositório Robot para instalar o ambiente.
              </StatusMessage>
            ) : (
              <div className="rc-form__actions">
                <Button
                  data-testid="install-button"
                  onClick={handleInstall}
                  loading={installing}
                  disabled={installing || !canInstall}
                >
                  {installing ? "Instalando…" : "Instalar ambiente"}
                </Button>
              </div>
            ))}
        </>
      )}

      {installError !== null && <StatusMessage tone="error">{installError}</StatusMessage>}

      {log.length > 0 && (
        <Panel title="Progresso da instalação">
          <pre className="rc-log" data-testid="install-progress">
            {log.join("\n")}
          </pre>
        </Panel>
      )}
    </Page>
  );
}
