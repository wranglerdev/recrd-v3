// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelinePanel } from "@renderer/screens/TimelinePanel";
import type { RecordedStep } from "@renderer/state/useRecordingSession";

function step(overrides: Partial<RecordedStep> & Pick<RecordedStep, "action">): RecordedStep {
  return { selectors: [], ...overrides };
}

const STEPS: RecordedStep[] = [
  step({ action: { type: "navigate", url: "https://example.com" } }),
  step({ action: { type: "input", selector: "#u", value: "ana" } }),
  step({ action: { type: "click", selector: "#go" } }),
];

function handlers() {
  return { onRemove: vi.fn(), onMove: vi.fn(), onUpdate: vi.fn() };
}

describe("TimelinePanel (PRD §9, §11, §13)", () => {
  it("shows a placeholder when empty", () => {
    render(<TimelinePanel steps={[]} {...handlers()} />);
    expect(screen.getByText(/nenhuma ação gravada/i)).toBeInTheDocument();
  });

  it("lists the steps in order with human labels", () => {
    render(<TimelinePanel steps={STEPS} {...handlers()} />);
    expect(screen.getByText(/Navegar → https:\/\/example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Preencher #u com "ana"/)).toBeInTheDocument();
    expect(screen.getByText(/Clicar em #go/)).toBeInTheDocument();
  });

  it("removes a step", () => {
    const h = handlers();
    render(<TimelinePanel steps={STEPS} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover ação 2" }));
    expect(h.onRemove).toHaveBeenCalledWith(1);
  });

  it("reorders steps with the up/down controls, disabling the ends", () => {
    const h = handlers();
    render(<TimelinePanel steps={STEPS} {...h} />);
    expect(screen.getByRole("button", { name: "Mover ação 1 para cima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mover ação 3 para baixo" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Mover ação 2 para cima" }));
    expect(h.onMove).toHaveBeenCalledWith(1, -1);
    fireEvent.click(screen.getByRole("button", { name: "Mover ação 1 para baixo" }));
    expect(h.onMove).toHaveBeenCalledWith(0, 1);
  });

  it("edits a step's primary field", () => {
    const h = handlers();
    render(<TimelinePanel steps={STEPS} {...h} />);
    fireEvent.change(screen.getByLabelText("Valor da ação 2"), { target: { value: "bob" } });
    expect(h.onUpdate).toHaveBeenCalledWith(1, { type: "input", selector: "#u", value: "bob" });
  });

  it("warns about a low-confidence selector and offers alternatives (PRD §11)", () => {
    const h = handlers();
    const unstable: RecordedStep = step({
      action: { type: "click", selector: "div:nth-of-type(2)" },
      selectors: [
        { strategy: "css", value: "div:nth-of-type(2)", confidence: "low", stable: false },
        { strategy: "data-testid", value: '[data-testid="go"]', confidence: "high", stable: true },
      ],
    });
    render(<TimelinePanel steps={[unstable]} {...h} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/instável/i);
    fireEvent.change(screen.getByLabelText("Seletor da ação 1"), {
      target: { value: '[data-testid="go"]' },
    });
    expect(h.onUpdate).toHaveBeenCalledWith(0, {
      type: "click",
      selector: '[data-testid="go"]',
    });
  });

  it("omits the selector picker when there is a single candidate", () => {
    const single: RecordedStep = step({
      action: { type: "click", selector: "#go" },
      selectors: [{ strategy: "id", value: "#go", confidence: "high", stable: true }],
    });
    render(<TimelinePanel steps={[single]} {...handlers()} />);
    expect(screen.queryByLabelText("Seletor da ação 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
