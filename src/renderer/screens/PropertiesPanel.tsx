import type { JSX } from "react";
import { StatusMessage } from "../components/ui/index.js";
import { useActiveProject } from "../state/index.js";

// Properties panel (PRD §9): shows the current selection — the active project and
// the case being automated. Reads the shared active-project context, so it stays
// in sync with the explorer without prop-drilling.

export function PropertiesPanel(): JSX.Element {
  const { activeProject, activeCase } = useActiveProject();

  if (activeProject === null) {
    return <StatusMessage>Nenhum projeto selecionado.</StatusMessage>;
  }

  return (
    <dl className="rc-deflist">
      <dt>Projeto</dt>
      <dd>{activeProject.name}</dd>
      <dt>Caso</dt>
      <dd>{activeCase?.name ?? "—"}</dd>
    </dl>
  );
}
