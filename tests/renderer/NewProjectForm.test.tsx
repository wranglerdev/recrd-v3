// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewProjectForm } from "@renderer/components/NewProjectForm";

describe("NewProjectForm (PRD §14)", () => {
  it("submits the name, description and selected repository option", () => {
    const onSubmit = vi.fn();
    render(<NewProjectForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Banco XYZ" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Conta corrente" } });
    fireEvent.click(screen.getByLabelText(/repositório existente/i));
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Banco XYZ",
      description: "Conta corrente",
      repository: "existing",
    });
  });

  it("does not submit a blank name", () => {
    const onSubmit = vi.fn();
    render(<NewProjectForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the action and shows an error while pending/failed", () => {
    const onSubmit = vi.fn();
    render(<NewProjectForm onSubmit={onSubmit} pending error="Falha ao criar" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao criar");
    const button = screen.getByRole("button", { name: /criando/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
