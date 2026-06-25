// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewProjectForm } from "@renderer/components/NewProjectForm";

describe("NewProjectForm (PRD §14)", () => {
  it("submits the name and selected repository option", () => {
    const onSubmit = vi.fn();
    render(<NewProjectForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Banco XYZ" } });
    fireEvent.click(screen.getByLabelText(/repositório existente/i));
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Banco XYZ", repository: "existing" });
  });

  it("does not submit a blank name", () => {
    const onSubmit = vi.fn();
    render(<NewProjectForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
