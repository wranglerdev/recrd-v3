// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PropertiesPanel } from "@renderer/screens/PropertiesPanel";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { ProjectDto } from "@shared/ipc-contract";

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

function Harness({
  project,
  testCase,
  children,
}: {
  project: ProjectDto | null;
  testCase?: { id: string; name: string } | null;
  children: ReactNode;
}) {
  const { setActiveProject, setActiveCase } = useActiveProject();
  useEffect(() => {
    setActiveProject(project);
    setActiveCase(testCase ?? null);
  }, [project, testCase, setActiveProject, setActiveCase]);
  return <>{children}</>;
}

function renderPanel(
  project: ProjectDto | null,
  testCase: { id: string; name: string } | null = null,
) {
  render(
    <ActiveProjectProvider>
      <Harness project={project} testCase={testCase}>
        <PropertiesPanel />
      </Harness>
    </ActiveProjectProvider>,
  );
}

describe("PropertiesPanel (PRD §9)", () => {
  it("shows a placeholder when no project is selected", () => {
    renderPanel(null);
    expect(screen.getByText(/nenhum projeto selecionado/i)).toBeInTheDocument();
  });

  it("shows the active project and a dash when no case is selected", () => {
    renderPanel(PROJECT);
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the active case name", () => {
    renderPanel(PROJECT, { id: "c1", name: "Login" });
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});
