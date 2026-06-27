import type { JSX } from "react";
import type { InspectedElementEvent } from "../../shared/ipc-contract.js";

// Element Inspector panel (PRD §10, §11, §7ya.5). A "Modo Inspect" toggle arms the
// sandbox hover overlay; while armed, the element under the cursor is streamed
// here and broken down into tag, id, classes, the suggested selector (with its
// confidence) and the remaining ranked candidates. Presentational and prop-driven
// so it stays testable; the toggle and the live feed are wired by AutomationView.

export interface ElementInspectorPanelProps {
  /** Whether Inspect mode is currently armed. */
  readonly enabled: boolean;
  /** Toggles Inspect mode (drives the sandbox overlay). */
  readonly onToggle: (enabled: boolean) => void;
  /** The element last hovered in Inspect mode, or null before any hover. */
  readonly element: InspectedElementEvent | null;
}

export function ElementInspectorPanel(props: ElementInspectorPanelProps): JSX.Element {
  const { enabled, onToggle, element } = props;
  const best = element?.selectors[0] ?? null;

  return (
    <div>
      <label>
        <input
          type="checkbox"
          data-testid="inspect-toggle"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        Modo Inspect
      </label>

      {!enabled && <p>Ative o modo Inspect e passe o mouse sobre um elemento.</p>}

      {enabled && element === null && <p>Passe o mouse sobre um elemento no sandbox.</p>}

      {enabled && element !== null && (
        <dl aria-label="Elemento inspecionado" data-testid="inspected-element">
          <dt>Tag</dt>
          <dd data-testid="inspected-tag">{element.tag}</dd>
          <dt>Id</dt>
          <dd data-testid="inspected-id">{element.id ?? "—"}</dd>
          <dt>Classes</dt>
          <dd data-testid="inspected-classes">
            {element.classes.length > 0 ? element.classes.join(" ") : "—"}
          </dd>
          <dt>XPath</dt>
          <dd data-testid="inspected-xpath">{element.xpath ?? "—"}</dd>
          <dt>Seletor sugerido</dt>
          <dd data-testid="inspected-selector">
            {best === null ? (
              "—"
            ) : (
              <>
                <code>{best.value}</code>{" "}
                <span aria-label="Confiança">
                  ({best.strategy}, {best.confidence === "high" ? "alta" : "baixa"} confiança)
                </span>
                {best.confidence === "low" && (
                  <span role="alert"> ⚠ seletor instável</span>
                )}
              </>
            )}
          </dd>
        </dl>
      )}

      {enabled && element !== null && element.selectors.length > 1 && (
        <ul aria-label="Seletores alternativos">
          {element.selectors.slice(1).map((selector) => (
            <li key={`${selector.strategy}:${selector.value}`}>
              <code>{selector.value}</code> ({selector.strategy})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
