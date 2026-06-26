// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompileResultView } from "@renderer/screens/CompileResultView";
import type { CompileResponse } from "@shared/ipc-contract";

describe("CompileResultView (PRD §13, §14)", () => {
  it("shows the status line", () => {
    render(<CompileResultView status="Compilando…" />);
    expect(screen.getByText("Compilando…")).toBeInTheDocument();
  });

  it("previews the generated .robot and lists selector warnings on success", () => {
    const result: CompileResponse = {
      ok: true,
      scriptId: "s1",
      robot: "*** Settings ***\nLibrary Browser",
      robotFile: "/r/tests/login.robot",
      warnings: [{ index: 0, selector: "div", message: "Seletor instável" }],
    };
    render(<CompileResultView status="Compilado com sucesso." result={result} />);

    expect(screen.getByLabelText("Preview do .robot")).toHaveTextContent("Library Browser");
    expect(screen.getByText("Seletor instável")).toBeInTheDocument();
  });

  it("lists validation and robot errors on failure", () => {
    const result: CompileResponse = {
      ok: false,
      stage: "script",
      scriptErrors: [{ index: 1, message: "Ação inválida" }],
      robotErrors: ["Sintaxe Robot inválida"],
      warnings: [],
    };
    render(<CompileResultView result={result} />);

    const errors = screen.getByRole("alert");
    expect(errors).toHaveTextContent("Ação inválida");
    expect(errors).toHaveTextContent("Sintaxe Robot inválida");
    expect(screen.queryByLabelText("Preview do .robot")).not.toBeInTheDocument();
  });
});
