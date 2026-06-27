import type { JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type TableColumn<Row> = {
  /** Stable key for the column (used for React keys). */
  readonly key: string;
  readonly header: ReactNode;
  /** Renders the cell for a given row. */
  readonly cell: (row: Row) => ReactNode;
  /** Right-align numeric/short columns; defaults to start. */
  readonly align?: "start" | "end";
};

export type TableProps<Row> = {
  /** Accessible name for the table when there is no visible caption. */
  readonly label?: string;
  readonly caption?: ReactNode;
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  readonly className?: string;
};

// A styled, accessible data table (PRD §8, §16). Column-driven so screens declare
// headers + cell renderers instead of hand-rolling <table> markup; every surface,
// border and weight comes from the design tokens.
export function Table<Row>({
  label,
  caption,
  columns,
  rows,
  rowKey,
  className,
}: TableProps<Row>): JSX.Element {
  return (
    <table className={cx("rc-table", className)} aria-label={label}>
      {caption !== undefined && <caption className="rc-table__caption">{caption}</caption>}
      <thead className="rc-table__head">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cx("rc-table__th", column.align === "end" && "rc-table__cell--end")}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className="rc-table__row">
            {columns.map((column) => (
              <td
                key={column.key}
                className={cx("rc-table__td", column.align === "end" && "rc-table__cell--end")}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
