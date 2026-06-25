// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeScreen, type HomeScreenProps } from "@renderer/screens/HomeScreen";

function setup(overrides: Partial<HomeScreenProps> = {}) {
  const props: HomeScreenProps = {
    recentExecutions: [],
    onNewProject: vi.fn(),
    onRecordTest: vi.fn(),
    onImportMass: vi.fn(),
    onOpenLastProject: vi.fn(),
    ...overrides,
  };
  render(<HomeScreen {...props} />);
  return props;
}

describe("HomeScreen (PRD §8)", () => {
  it("shows an empty state when there are no executions", () => {
    setup();
    expect(screen.getByText(/nenhuma execução/i)).toBeInTheDocument();
  });

  it("lists recent executions", () => {
    setup({
      recentExecutions: [
        {
          id: "e1",
          name: "Login Banco XYZ",
          result: "passed",
          when: "Hoje 10:34",
          duration: "1min 20s",
        },
      ],
    });
    expect(screen.getByText(/Login Banco XYZ/)).toBeInTheDocument();
    expect(screen.getByText(/1min 20s/)).toBeInTheDocument();
  });

  it("invokes quick-action handlers", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Novo Projeto" }));
    fireEvent.click(screen.getByRole("button", { name: "Gravar Novo Teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Importar Massa" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Último Projeto" }));
    expect(props.onNewProject).toHaveBeenCalledOnce();
    expect(props.onRecordTest).toHaveBeenCalledOnce();
    expect(props.onImportMass).toHaveBeenCalledOnce();
    expect(props.onOpenLastProject).toHaveBeenCalledOnce();
  });
});
