import type { JSX } from "react";
import { Panel } from "../components/ui/index.js";

// Test-mass screen (PRD §7): view and edit a mass's variable values. Prop-driven;
// edits are delegated to the parent (which applies the domain operations).

export type MassView = {
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly Readonly<Record<string, string>>[];
};

export type MassScreenProps = {
  readonly mass: MassView;
  onEditValue: (rowIndex: number, column: string, value: string) => void;
};

export function MassScreen(props: MassScreenProps): JSX.Element {
  const { mass } = props;
  return (
    <Panel title={mass.name} className="mass-grid-panel">
      <table className="rc-grid" data-testid="mass-grid">
        <thead>
          <tr>
            {mass.columns.map((column) => (
              <th key={column} data-testid="mass-column">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mass.rows.map((row, rowIndex) => (
            <tr key={rowIndex} data-testid="mass-row">
              {mass.columns.map((column) => (
                <td key={column}>
                  <input
                    className="rc-grid__cell"
                    data-testid="mass-cell"
                    data-row={rowIndex}
                    data-column={column}
                    aria-label={`${column} linha ${rowIndex + 1}`}
                    value={row[column] ?? ""}
                    onChange={(event) => props.onEditValue(rowIndex, column, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
