// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeView } from "@renderer/screens/HomeView";
import { ActiveProjectProvider } from "@renderer/state";
import type { ProjectDto, RecentExecutionDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const NAV = {
  onNewProject: vi.fn(),
  onRecordTest: vi.fn(),
  onImportMass: vi.fn(),
  onOpenProject: vi.fn(),
};

function project(id: string, updatedAt: string): ProjectDto {
  return {
    id,
    name: `Projeto ${id}`,
    description: "",
    robotPath: null,
    createdBy: "j",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedBy: "j",
    updatedAt,
  };
}

const EXECUTION: RecentExecutionDto = {
  id: "e1",
  caseId: "c1",
  caseName: "Login",
  result: "passed",
  startedAt: "2026-06-26T10:35:00.000Z",
  durationMs: 4200,
};

function renderHome(nav: Partial<typeof NAV> = {}) {
  const handlers = { ...NAV, ...nav };
  render(
    <ActiveProjectProvider>
      <HomeView {...handlers} />
    </ActiveProjectProvider>,
  );
  return handlers;
}

describe("HomeView (PRD §8)", () => {
  it("renders recent executions from the bridge with formatted time and duration", async () => {
    stubBridge({ listRecentExecutions: vi.fn().mockResolvedValue([EXECUTION]) });
    renderHome();

    await waitFor(() =>
      expect(screen.getByText(/Login — 2026-06-26 10:35 \(4\.2s\)/)).toBeInTheDocument(),
    );
    expect(window.recrd?.listRecentExecutions).toHaveBeenCalledWith({ limit: 10 });
  });

  it("shows the empty state when there are no executions", async () => {
    stubBridge({ listRecentExecutions: vi.fn().mockResolvedValue([]) });
    renderHome();

    await waitFor(() => expect(screen.getByText(/nenhuma execução ainda/i)).toBeInTheDocument());
  });

  it("routes the navigation quick actions", () => {
    stubBridge({ listRecentExecutions: vi.fn().mockResolvedValue([]) });
    const handlers = renderHome();

    fireEvent.click(screen.getByRole("button", { name: /novo projeto/i }));
    fireEvent.click(screen.getByRole("button", { name: /gravar novo teste/i }));
    fireEvent.click(screen.getByRole("button", { name: /importar massa/i }));

    expect(handlers.onNewProject).toHaveBeenCalled();
    expect(handlers.onRecordTest).toHaveBeenCalled();
    expect(handlers.onImportMass).toHaveBeenCalled();
  });

  it("opens the most recently updated project", async () => {
    const listProjects = vi
      .fn()
      .mockResolvedValue([
        project("a", "2026-06-26T08:00:00.000Z"),
        project("b", "2026-06-26T12:00:00.000Z"),
      ]);
    stubBridge({ listRecentExecutions: vi.fn().mockResolvedValue([]), listProjects });
    const onOpenProject = vi.fn();
    renderHome({ onOpenProject });

    fireEvent.click(screen.getByRole("button", { name: /abrir último projeto/i }));

    await waitFor(() => expect(onOpenProject).toHaveBeenCalled());
    expect(listProjects).toHaveBeenCalled();
  });

  it("does not navigate when there are no projects to open", async () => {
    stubBridge({
      listRecentExecutions: vi.fn().mockResolvedValue([]),
      listProjects: vi.fn().mockResolvedValue([]),
    });
    const onOpenProject = vi.fn();
    renderHome({ onOpenProject });

    fireEvent.click(screen.getByRole("button", { name: /abrir último projeto/i }));

    await waitFor(() => expect(window.recrd?.listProjects).toHaveBeenCalled());
    expect(onOpenProject).not.toHaveBeenCalled();
  });
});
