// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelinePanel } from "@renderer/screens/TimelinePanel";
import type { ScriptActionDto } from "@shared/ipc-contract";

const ACTIONS: ScriptActionDto[] = [
  { type: "navigate", url: "https://example.com" },
  { type: "input", selector: "#u", value: "ana" },
  { type: "click", selector: "#go" },
];

function handlers() {
  return { onRemove: vi.fn(), onMove: vi.fn(), onUpdate: vi.fn() };
}

describe("TimelinePanel (PRD §9, §13)", () => {
  it("shows a placeholder when empty", () => {
    render(<TimelinePanel actions={[]} {...handlers()} />);
    expect(screen.getByText(/nenhuma ação gravada/i)).toBeInTheDocument();
  });

  it("lists the actions in order with human labels", () => {
    render(<TimelinePanel actions={ACTIONS} {...handlers()} />);
    expect(screen.getByText(/Navegar → https:\/\/example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Preencher #u com "ana"/)).toBeInTheDocument();
    expect(screen.getByText(/Clicar em #go/)).toBeInTheDocument();
  });

  it("removes an action", () => {
    const h = handlers();
    render(<TimelinePanel actions={ACTIONS} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover ação 2" }));
    expect(h.onRemove).toHaveBeenCalledWith(1);
  });

  it("reorders actions with the up/down controls, disabling the ends", () => {
    const h = handlers();
    render(<TimelinePanel actions={ACTIONS} {...h} />);
    expect(screen.getByRole("button", { name: "Mover ação 1 para cima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mover ação 3 para baixo" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Mover ação 2 para cima" }));
    expect(h.onMove).toHaveBeenCalledWith(1, -1);
    fireEvent.click(screen.getByRole("button", { name: "Mover ação 1 para baixo" }));
    expect(h.onMove).toHaveBeenCalledWith(0, 1);
  });

  it("edits an action's primary field", () => {
    const h = handlers();
    render(<TimelinePanel actions={ACTIONS} {...h} />);
    fireEvent.change(screen.getByLabelText("Valor da ação 2"), { target: { value: "bob" } });
    expect(h.onUpdate).toHaveBeenCalledWith(1, { type: "input", selector: "#u", value: "bob" });
  });

  it("omits the edit field for actions with no primary text (click)", () => {
    render(<TimelinePanel actions={[{ type: "click", selector: "#go" }]} {...handlers()} />);
    expect(screen.queryByLabelText(/da ação 1/)).not.toBeInTheDocument();
  });
});
