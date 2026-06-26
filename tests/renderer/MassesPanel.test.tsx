// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MassesPanel } from "@renderer/screens/MassesPanel";
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
  robotPath: "/repo",
  createdBy: "j",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "j",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

const MASS: MassDto = {
  id: "m1",
  projectId: "p1",
  name: "Usuários",
  columns: ["usuario", "senha"],
  rows: [{ usuario: "ana", senha: "123" }],
  history: [],
  createdBy: "j",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "j",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

function Harness({ project, children }: { project: ProjectDto | null; children: ReactNode }) {
  const { setActiveProject } = useActiveProject();
  useEffect(() => {
    setActiveProject(project);
  }, [project, setActiveProject]);
  return <>{children}</>;
}

function renderPanel(project: ProjectDto | null) {
  render(
    <ActiveProjectProvider>
      <Harness project={project}>
        <MassesPanel />
      </Harness>
    </ActiveProjectProvider>,
  );
}

describe("MassesPanel (PRD §9, §12)", () => {
  it("lists the project's masses and their columns", async () => {
    stubBridge({ listMassesByProject: vi.fn().mockResolvedValue([MASS]) });
    renderPanel(PROJECT);

    await waitFor(() => expect(screen.getByText("Usuários")).toBeInTheDocument());
    expect(screen.getByText("usuario")).toBeInTheDocument();
    expect(screen.getByText("senha")).toBeInTheDocument();
  });

  it("makes each column draggable with the {{variable}} payload", async () => {
    stubBridge({ listMassesByProject: vi.fn().mockResolvedValue([MASS]) });
    renderPanel(PROJECT);

    const chip = await screen.findByText("usuario");
    expect(chip).toHaveAttribute("draggable", "true");

    const setData = vi.fn();
    fireEvent.dragStart(chip, { dataTransfer: { setData, effectAllowed: "" } });
    expect(setData).toHaveBeenCalledWith("text/plain", "{{usuario}}");
  });

  it("shows an empty state when there are no masses", async () => {
    stubBridge({ listMassesByProject: vi.fn().mockResolvedValue([]) });
    renderPanel(PROJECT);
    await waitFor(() =>
      expect(screen.getByText(/nenhuma massa neste projeto/i)).toBeInTheDocument(),
    );
  });

  it("shows the empty state with no active project", () => {
    stubBridge({ listMassesByProject: vi.fn() });
    renderPanel(null);
    expect(screen.getByText(/nenhuma massa neste projeto/i)).toBeInTheDocument();
  });
});
