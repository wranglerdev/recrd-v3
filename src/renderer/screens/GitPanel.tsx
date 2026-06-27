import type { JSX } from "react";
import type { GitStatusResult } from "../../shared/ipc-contract.js";
import {
  Button,
  EmptyState,
  LoadingState,
  Page,
  Panel,
  StatusMessage,
} from "../components/ui/index.js";
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
    <Page title="Git" description="Status do repositório Robot do projeto ativo.">
      {activeProject === null ? (
        <StatusMessage>Nenhum projeto selecionado.</StatusMessage>
      ) : null}
      {activeProject !== null && robotPath === null ? (
        <StatusMessage>O projeto não tem um repositório Robot configurado.</StatusMessage>
      ) : null}
      {loading ? <LoadingState label="Lendo status do repositório…" /> : null}
      {error != null ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {data !== null && !data.isRepository ? (
        <StatusMessage>A pasta não é um repositório Git.</StatusMessage>
      ) : null}

      {data !== null && data.isRepository ? (
        <Panel
          title={
            <>
              Branch atual: <strong data-testid="git-branch">{data.branch}</strong>
            </>
          }
          actions={
            <Button
              variant="secondary"
              size="sm"
              data-testid="git-open-external"
              onClick={openExternal}
            >
              Abrir repositório (diff externo)
            </Button>
          }
        >
          {data.changes.length === 0 ? (
            <EmptyState title="Sem alterações." description="A árvore de trabalho está limpa." />
          ) : (
            <ul className="rc-list" aria-label="Arquivos alterados" data-testid="git-changes">
              {data.changes.map((change) => (
                <li
                  key={change.path}
                  className="rc-list__item"
                  data-testid="git-change-row"
                  data-status={change.status}
                >
                  <span className="rc-git__path">{change.path}</span>
                  <span className="rc-git__status">
                    {STATUS_LABEL[change.status] ?? change.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
    </Page>
  );
}
