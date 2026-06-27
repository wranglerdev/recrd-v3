import type { JSX } from "react";
import type { GitStatusResult } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcQuery } from "../state/index.js";

// Read-only Git panel (PRD §14): shows the current branch and changed files of
// the active project's Robot repository, with a button to open the repo folder
// externally. All reads go through the bridge; the renderer never runs git.

const STATUS_LABEL: Record<string, string> = {
  modified: "modificado",
  added: "adicionado",
  deleted: "removido",
  renamed: "renomeado",
  untracked: "novo",
  unknown: "—",
};

export function GitPanel(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();
  const robotPath = activeProject?.robotPath ?? null;

  const { data, loading, error } = useIpcQuery<GitStatusResult>(
    bridge === null || robotPath === null ? null : () => bridge.getGitStatus({ cwd: robotPath }),
    [bridge, robotPath],
  );

  const openExternal = (): void => {
    if (bridge !== null && robotPath !== null) {
      void bridge.openGitExternal({ cwd: robotPath });
    }
  };

  return (
    <section aria-label="Git">
      <h2>Git</h2>

      {activeProject === null ? <p>Nenhum projeto selecionado.</p> : null}
      {activeProject !== null && robotPath === null ? (
        <p>O projeto não tem um repositório Robot configurado.</p>
      ) : null}
      {loading ? <p>Lendo status do repositório…</p> : null}
      {error != null ? <p role="alert">{error}</p> : null}

      {data !== null && !data.isRepository ? <p>A pasta não é um repositório Git.</p> : null}

      {data !== null && data.isRepository ? (
        <>
          <p>
            Branch atual: <strong data-testid="git-branch">{data.branch}</strong>
          </p>
          {data.changes.length === 0 ? (
            <p>Sem alterações.</p>
          ) : (
            <ul aria-label="Arquivos alterados" data-testid="git-changes">
              {data.changes.map((change) => (
                <li key={change.path} data-testid="git-change-row" data-status={change.status}>
                  {change.path} — {STATUS_LABEL[change.status] ?? change.status}
                </li>
              ))}
            </ul>
          )}
          <button type="button" data-testid="git-open-external" onClick={openExternal}>
            Abrir repositório (diff externo)
          </button>
        </>
      ) : null}
    </section>
  );
}
