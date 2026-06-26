// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MassWorkspace } from "@renderer/screens/MassWorkspace";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { MassDto, ProjectDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const PROJECT: ProjectDto = {
  id: "p1",
  name: "Banco",
  description: "",
  robotPath: null,
  createdBy: "jdoe",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "jdoe",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

function mass(overrides: Partial<MassDto> = {}): MassDto {
  return {
    id: "m1",
    projectId: "p1",
    name: "Login",
    columns: ["usuario", "senha"],
    rows: [{ usuario: "admin", senha: "123" }],
    history: [{ at: "2026-06-26T00:00:00.000Z", rowCount: 1, source: "/data/login.csv" }],
    createdBy: "jdoe",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedBy: "jdoe",
    updatedAt: "2026-06-26T00:00:00.000Z",
    ...overrides,
  };
}

/** Seeds the active project so the workspace loads a project's masses. */
function WithActiveProject({
  project,
  children,
}: {
  project: ProjectDto | null;
  children: ReactNode;
}) {
  const { setActiveProject } = useActiveProject();
  useEffect(() => {
    setActiveProject(project);
  }, [project, setActiveProject]);
  return <>{children}</>;
}

function renderWorkspace(project: ProjectDto | null) {
  render(
    <ActiveProjectProvider>
      <WithActiveProject project={project}>
        <MassWorkspace />
      </WithActiveProject>
    </ActiveProjectProvider>,
  );
}

describe("MassWorkspace (PRD §7)", () => {
  it("prompts to select a project when none is active", () => {
    renderWorkspace(null);
    expect(screen.getByText(/selecione um projeto/i)).toBeInTheDocument();
  });

  it("lists the project's masses and shows the selected mass grid and history", async () => {
    stubBridge({ listMassesByProject: vi.fn().mockResolvedValue([mass()]) });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByLabelText("usuario linha 1")).toHaveValue("admin"));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText(/1 linha\(s\) de \/data\/login\.csv/i)).toBeInTheDocument();
  });

  it("imports a CSV via the file picker and selects the new mass", async () => {
    const imported = mass({ id: "m2", name: "cadastro" });
    stubBridge({
      listMassesByProject: vi.fn().mockResolvedValue([]),
      selectCsvFile: vi.fn().mockResolvedValue({ path: "C:/data/cadastro.csv", content: "a\n1" }),
      importMass: vi.fn().mockResolvedValue({ ok: true, mass: imported }),
    });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByText(/nenhuma massa importada/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /importar csv/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "cadastro" })).toBeInTheDocument(),
    );
    expect(window.recrd?.importMass).toHaveBeenCalledWith({
      projectId: "p1",
      name: "cadastro",
      csv: "a\n1",
      source: "C:/data/cadastro.csv",
    });
  });

  it("does nothing when the file picker is cancelled", async () => {
    const importMass = vi.fn();
    stubBridge({
      listMassesByProject: vi.fn().mockResolvedValue([]),
      selectCsvFile: vi.fn().mockResolvedValue(null),
      importMass,
    });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByText(/nenhuma massa importada/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /importar csv/i }));

    await waitFor(() => expect(window.recrd?.selectCsvFile).toHaveBeenCalled());
    expect(importMass).not.toHaveBeenCalled();
  });

  it("surfaces an import error from the use case", async () => {
    stubBridge({
      listMassesByProject: vi.fn().mockResolvedValue([]),
      selectCsvFile: vi.fn().mockResolvedValue({ path: "/x.csv", content: "bad" }),
      importMass: vi.fn().mockResolvedValue({ ok: false, errors: ["CSV inválido"] }),
    });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByText(/nenhuma massa importada/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /importar csv/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("CSV inválido"));
  });

  it("renames the selected mass", async () => {
    const renamed = mass({ name: "Acesso" });
    stubBridge({
      listMassesByProject: vi.fn().mockResolvedValue([mass()]),
      renameMass: vi.fn().mockResolvedValue(renamed),
    });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/nome da massa/i), { target: { value: "Acesso" } });
    fireEvent.click(screen.getByRole("button", { name: /^renomear$/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Acesso" })).toBeInTheDocument());
    expect(window.recrd?.renameMass).toHaveBeenCalledWith({ id: "m1", name: "Acesso" });
  });

  it("ignores a rename that is blank or unchanged", async () => {
    const renameMass = vi.fn();
    stubBridge({ listMassesByProject: vi.fn().mockResolvedValue([mass()]), renameMass });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^renomear$/i }));
    expect(renameMass).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/nome da massa/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /^renomear$/i }));
    expect(renameMass).not.toHaveBeenCalled();
  });

  it("persists a cell edit through the bridge", async () => {
    const edited = mass({ rows: [{ usuario: "root", senha: "123" }] });
    stubBridge({
      listMassesByProject: vi.fn().mockResolvedValue([mass()]),
      editMassValue: vi.fn().mockResolvedValue(edited),
    });
    renderWorkspace(PROJECT);

    await waitFor(() => expect(screen.getByLabelText("usuario linha 1")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("usuario linha 1"), { target: { value: "root" } });

    await waitFor(() =>
      expect(window.recrd?.editMassValue).toHaveBeenCalledWith({
        id: "m1",
        rowIndex: 0,
        column: "usuario",
        value: "root",
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("usuario linha 1")).toHaveValue("root"));
  });
});
