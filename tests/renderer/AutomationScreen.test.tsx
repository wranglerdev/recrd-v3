// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutomationScreen, type ToolbarHandlers } from "@renderer/screens/AutomationScreen";

function handlers(): ToolbarHandlers {
  return {
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onReload: vi.fn(),
    onExport: vi.fn(),
    onCompile: vi.fn(),
  };
}

describe("AutomationScreen (PRD §9)", () => {
  it("renders the toolbar, title, sidebar and sandbox region", () => {
    const toolbar = handlers();
    render(<AutomationScreen title="Login XYZ" toolbar={toolbar} sidebar={<div>Timeline</div>} />);

    expect(screen.getByRole("heading", { name: "Login XYZ" })).toBeInTheDocument();
    for (const label of ["Play", "Pause", "Stop", "Reload", "Exportar", "Compilar"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Browser Sandbox")).toBeInTheDocument();
  });

  it("wires the Compile and Play actions", () => {
    const toolbar = handlers();
    render(<AutomationScreen title="T" toolbar={toolbar} />);
    fireEvent.click(screen.getByRole("button", { name: "Compilar" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(toolbar.onCompile).toHaveBeenCalledOnce();
    expect(toolbar.onPlay).toHaveBeenCalledOnce();
  });
});
