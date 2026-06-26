// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectExplorer } from "@renderer/screens/ProjectExplorer";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { CaseDto, PlanDto, ProjectDto, RecrdApi, SuiteDto } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
  vi.restoreAllMocks();
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const PROJECT: ProjectDto = {
  id: "p1",
  name: "Banco",
  description: "",
  robotPath: null,
  createdBy: "j",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "j",
  updatedAt: "2026-06-26T00:00:00.000Z",
};
const PLAN: PlanDto = { ...PROJECT, id: "pl1", projectId: "p1", name: "Plano A" } as PlanDto;
const SUITE: SuiteDto = { id: "s1", planId: "pl1", name: "Suíte A", ...auditOf() } as SuiteDto;
const CASE: CaseDto = {
  id: "c1",
  suiteId: "s1",
  name: "Caso A",
  description: "",
  status: "draft",
  ...auditOf(),
};

function auditOf() {
  return {
    createdBy: "j",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedBy: "j",
    updatedAt: "2026-06-26T00:00:00.000Z",
  };
}

/** A full-hierarchy bridge stub; mutators default to resolved spies. */
function fullBridge(overrides: Partial<RecrdApi> = {}): Partial<RecrdApi> {
  return {
    listProjects: vi.fn().mockResolvedValue([PROJECT]),
    listPlansByProject: vi.fn().mockResolvedValue([PLAN]),
    listSuitesByPlan: vi.fn().mockResolvedValue([SUITE]),
    listCasesBySuite: vi.fn().mockResolvedValue([CASE]),
    createProject: vi.fn().mockResolvedValue(PROJECT),
    createPlan: vi.fn().mockResolvedValue(PLAN),
    createSuite: vi.fn().mockResolvedValue(SUITE),
    createCase: vi.fn().mockResolvedValue(CASE),
    renamePlan: vi.fn().mockResolvedValue(PLAN),
    removePlan: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function ActiveProbe() {
  const { activeProject } = useActiveProject();
  return <span data-testid="active">{activeProject?.id ?? "none"}</span>;
}

function renderExplorer() {
  render(
    <ActiveProjectProvider>
      <ProjectExplorer />
      <ActiveProbe />
    </ActiveProjectProvider>,
  );
}

describe("ProjectExplorer (PRD §6, §9)", () => {
  it("renders the full Project>Plan>Suite>Case tree", async () => {
    stubBridge(fullBridge());
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Banco")).toBeInTheDocument());
    const tree = screen.getByRole("tree", { name: /hierarquia de projetos/i });
    expect(within(tree).getByText("Plano A")).toBeInTheDocument();
    expect(within(tree).getByText("Suíte A")).toBeInTheDocument();
    expect(within(tree).getByText("Caso A")).toBeInTheDocument();
  });

  it("selecting a project sets it active and offers to add a plan", async () => {
    stubBridge(fullBridge());
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Banco")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Banco"));

    expect(screen.getByTestId("active")).toHaveTextContent("p1");
    // The context panel exposes the child-creation form for a project.
    expect(screen.getByRole("form", { name: /novo plano/i })).toBeInTheDocument();
  });

  it("creates a plan under the selected project", async () => {
    const createPlan = vi.fn().mockResolvedValue(PLAN);
    stubBridge(fullBridge({ createPlan }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Banco")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Banco"));

    const form = screen.getByRole("form", { name: /novo plano/i });
    fireEvent.change(within(form).getByLabelText(/novo plano/i), { target: { value: "Plano B" } });
    fireEvent.submit(form);

    await waitFor(() =>
      expect(createPlan).toHaveBeenCalledWith({ projectId: "p1", name: "Plano B" }),
    );
  });

  it("creates a top-level project", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    stubBridge(fullBridge({ createProject }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Banco")).toBeInTheDocument());
    const form = screen.getByRole("form", { name: /novo projeto/i });
    fireEvent.change(within(form).getByLabelText(/novo projeto/i), { target: { value: "Loja" } });
    fireEvent.submit(form);

    await waitFor(() => expect(createProject).toHaveBeenCalledWith({ name: "Loja" }));
  });

  it("renames the selected plan", async () => {
    const renamePlan = vi.fn().mockResolvedValue(PLAN);
    stubBridge(fullBridge({ renamePlan }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Plano A")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Plano A"));

    const form = screen.getByRole("form", { name: /^renomear$/i });
    fireEvent.change(within(form).getByLabelText(/renomear/i), { target: { value: "Plano Z" } });
    fireEvent.submit(form);

    await waitFor(() => expect(renamePlan).toHaveBeenCalledWith({ id: "pl1", name: "Plano Z" }));
  });

  it("deletes the selected plan after confirmation", async () => {
    const removePlan = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    stubBridge(fullBridge({ removePlan }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Plano A")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Plano A"));
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(removePlan).toHaveBeenCalledWith({ id: "pl1" }));
  });

  it("does not delete when the confirmation is dismissed", async () => {
    const removePlan = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    stubBridge(fullBridge({ removePlan }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText("Plano A")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Plano A"));
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));

    expect(removePlan).not.toHaveBeenCalled();
  });

  it("shows an empty state when there are no projects", async () => {
    stubBridge(fullBridge({ listProjects: vi.fn().mockResolvedValue([]) }));
    renderExplorer();

    await waitFor(() => expect(screen.getByText(/nenhum projeto ainda/i)).toBeInTheDocument());
  });
});
