// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitPanel } from "@renderer/screens/GitPanel";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { ProjectDto, RecrdApi } from "@shared/ipc-contract";
import { useEffect, type JSX } from "react";

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
  robotPath: "/repos/banco",
  createdBy: "jdoe",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "jdoe",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

// Seeds the active project, then renders the panel under the same provider.
function Harness({ project }: { project: ProjectDto | null }): JSX.Element {
  const { setActiveProject } = useActiveProject();
  useEffect(() => {
    setActiveProject(project);
  }, [project, setActiveProject]);
  return <GitPanel />;
}

function renderWith(project: ProjectDto | null) {
  render(
    <ActiveProjectProvider>
      <Harness project={project} />
    </ActiveProjectProvider>,
  );
}

describe("GitPanel (PRD §14)", () => {
  it("prompts to select a project when none is active", () => {
    renderWith(null);
    expect(screen.getByText(/nenhum projeto selecionado/i)).toBeInTheDocument();
  });

  it("shows the branch and changed files for the active project's repo", async () => {
    const getGitStatus = vi.fn().mockResolvedValue({
      isRepository: true,
      branch: "main",
      changes: [{ path: "tests/login.robot", status: "modified" }],
    });
    const openGitExternal = vi.fn().mockResolvedValue(undefined);
    stubBridge({ getGitStatus, openGitExternal });

    renderWith(PROJECT);

    await waitFor(() => expect(screen.getByText(/branch atual/i)).toBeInTheDocument());
    expect(screen.getByText(/main/)).toBeInTheDocument();
    expect(screen.getByText(/tests\/login\.robot/)).toBeInTheDocument();
    expect(getGitStatus).toHaveBeenCalledWith({ cwd: "/repos/banco" });

    fireEvent.click(screen.getByRole("button", { name: /abrir reposit/i }));
    expect(openGitExternal).toHaveBeenCalledWith({ cwd: "/repos/banco" });
  });

  it("reports a non-repository folder", async () => {
    stubBridge({
      getGitStatus: vi.fn().mockResolvedValue({ isRepository: false, branch: "", changes: [] }),
    });
    renderWith(PROJECT);
    await waitFor(() =>
      expect(screen.getByText(/não é um repositório git/i)).toBeInTheDocument(),
    );
  });
});
