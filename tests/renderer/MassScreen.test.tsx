// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MassScreen, type MassView } from "@renderer/screens/MassScreen";

const mass: MassView = {
  name: "Login",
  columns: ["usuario", "senha"],
  rows: [{ usuario: "admin", senha: "123456" }],
};

describe("MassScreen (PRD §7)", () => {
  it("renders the mass name, columns and editable values", () => {
    render(<MassScreen mass={mass} onEditValue={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("usuario linha 1")).toHaveValue("admin");
  });

  it("reports cell edits with row index, column and value", () => {
    const onEditValue = vi.fn();
    render(<MassScreen mass={mass} onEditValue={onEditValue} />);
    fireEvent.change(screen.getByLabelText("senha linha 1"), { target: { value: "novaSenha" } });
    expect(onEditValue).toHaveBeenCalledWith(0, "senha", "novaSenha");
  });
});
