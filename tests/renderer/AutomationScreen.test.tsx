// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    render(<AutomationScreen title="Login XYZ" toolbar={toolbar} sidebar={<div>Resumo</div>} />);

    expect(screen.getByRole("heading", { name: "Login XYZ", level: 1 })).toBeInTheDocument();
    for (const label of ["Play", "Pause", "Stop", "Reload", "Exportar", "Compilar"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByLabelText("Browser Sandbox")).toBeInTheDocument();
  });

  it("renders the named sidebar panels with their content (PRD §9)", () => {
    render(
      <AutomationScreen
        title="T"
        toolbar={handlers()}
        panels={{ timeline: <div>passos</div>, inspector: <div>seletor</div> }}
      />,
    );

    for (const label of ["Timeline", "Massas", "Propriedades", "Toggles", "Inspector"]) {
      expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
    }
    expect(
      within(screen.getByRole("region", { name: "Timeline" })).getByText("passos"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Inspector" })).getByText("seletor"),
    ).toBeInTheDocument();
  });

  it("renders the sandbox navigation bar in the header", () => {
    render(<AutomationScreen title="T" toolbar={handlers()} navBar={<div>barra</div>} />);
    expect(screen.getByText("barra")).toBeInTheDocument();
  });

  it("reports the sandbox region rect on mount and null on unmount", () => {
    const onSandboxViewportChange = vi.fn();
    const { unmount } = render(
      <AutomationScreen
        title="T"
        toolbar={handlers()}
        onSandboxViewportChange={onSandboxViewportChange}
      />,
    );

    // jsdom has no layout, so the rect is zeroed — what matters is that the
    // region is measured and reported (and cleared on teardown).
    expect(onSandboxViewportChange).toHaveBeenCalledWith({ x: 0, y: 0, width: 0, height: 0 });
    unmount();
    expect(onSandboxViewportChange).toHaveBeenLastCalledWith(null);
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
