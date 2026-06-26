import type { DragEvent, JSX } from "react";
import { massVariableValue } from "../../domain/capture/capture.js";
import type { MassDto } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcQuery } from "../state/index.js";

// Masses panel (PRD §9, §12): lists the active project's mass data sets and
// renders each column as a draggable chip. Dropping a chip onto a sandbox field
// substitutes the literal value with a `{{variable}}` reference (the drop target
// is handled by the sandbox content-script). The bridge is absent outside
// Electron, so the panel degrades to an empty state.

/** Sets the dragged payload to the column's `{{variable}}` reference. */
function onDragStart(event: DragEvent<HTMLSpanElement>, column: string): void {
  event.dataTransfer.setData("text/plain", massVariableValue(column));
  event.dataTransfer.effectAllowed = "copy";
}

export function MassesPanel(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();
  const projectId = activeProject?.id ?? null;

  const { data } = useIpcQuery<readonly MassDto[]>(
    bridge === null || projectId === null ? null : () => bridge.listMassesByProject({ projectId }),
    [bridge, projectId],
  );
  const masses = data ?? [];

  if (masses.length === 0) {
    return <p>Nenhuma massa neste projeto.</p>;
  }

  return (
    <ul>
      {masses.map((mass) => (
        <li key={mass.id}>
          <strong>{mass.name}</strong>
          <ul>
            {mass.columns.map((column) => (
              <li key={column}>
                <span draggable onDragStart={(event) => onDragStart(event, column)}>
                  {column}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
