// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ElementInspectorPanel } from "@renderer/screens/ElementInspectorPanel";
import type { InspectedElementEvent } from "@shared/ipc-contract";

const ELEMENT: InspectedElementEvent = {
  tag: "button",
  id: "login",
  classes: ["btn", "primary"],
  xpath: '//*[@id="login"]',
  selectors: [
    { strategy: "data-testid", value: '[data-testid="go"]', confidence: "high", stable: true },
    { strategy: "id", value: "#login", confidence: "high", stable: true },
  ],
};

describe("ElementInspectorPanel (PRD §10, §11)", () => {
  it("prompts to enable Inspect mode when disabled", () => {
    render(<ElementInspectorPanel enabled={false} onToggle={vi.fn()} element={null} />);
    expect(screen.getByText(/ative o modo inspect/i)).toBeInTheDocument();
  });

  it("toggles Inspect mode", () => {
    const onToggle = vi.fn();
    render(<ElementInspectorPanel enabled={false} onToggle={onToggle} element={null} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /modo inspect/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("prompts to hover when armed but nothing inspected yet", () => {
    render(<ElementInspectorPanel enabled={true} onToggle={vi.fn()} element={null} />);
    expect(screen.getByText(/passe o mouse sobre um elemento no sandbox/i)).toBeInTheDocument();
  });

  it("breaks down the inspected element and its suggested selector", () => {
    render(<ElementInspectorPanel enabled={true} onToggle={vi.fn()} element={ELEMENT} />);
    const detail = screen.getByLabelText("Elemento inspecionado");
    expect(detail).toHaveTextContent("button");
    expect(detail).toHaveTextContent("login");
    expect(detail).toHaveTextContent("btn primary");
    expect(detail).toHaveTextContent('//*[@id="login"]');
    expect(detail).toHaveTextContent('[data-testid="go"]');
    expect(detail).toHaveTextContent(/alta confiança/);
  });

  it("lists alternative selectors", () => {
    render(<ElementInspectorPanel enabled={true} onToggle={vi.fn()} element={ELEMENT} />);
    const alternatives = screen.getByLabelText("Seletores alternativos");
    expect(alternatives).toHaveTextContent("#login");
  });

  it("warns when the suggested selector is unstable", () => {
    const unstable: InspectedElementEvent = {
      ...ELEMENT,
      id: null,
      selectors: [
        { strategy: "css", value: "div:nth-child(3)", confidence: "low", stable: false },
      ],
    };
    render(<ElementInspectorPanel enabled={true} onToggle={vi.fn()} element={unstable} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/instável/i);
  });
});
