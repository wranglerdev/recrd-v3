// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomationView } from "@renderer/screens/AutomationView";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { IpcEvents, ProjectDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
  Reflect.deleteProperty(window, "recrdEvents");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

function stubEvents(): {
  emitLine: (line: string) => void;
  emitExit: (exitCode: number) => void;
} {
  const listeners = new Map<string, (payload: unknown) => void>();
  const events: IpcEvents = {
    subscribe(channel, listener) {
      listeners.set(channel, listener as (payload: unknown) => void);
      return () => listeners.delete(channel);
    },
  };
  Object.defineProperty(window, "recrdEvents", { value: events, configurable: true });
  return {
    emitLine: (line) => act(() => listeners.get("run:line")?.({ line })),
    emitExit: (exitCode) => act(() => listeners.get("run:exit")?.({ exitCode })),
  };
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

function renderView(project: ProjectDto | null = null) {
  render(
    <ActiveProjectProvider>
      <WithActiveProject project={project}>
        <AutomationView />
      </WithActiveProject>
    </ActiveProjectProvider>,
  );
}

describe("AutomationView (PRD §9, §15)", () => {
  it("starts a run for the active project and streams stdout to the log", async () => {
    const startRun = vi.fn().mockResolvedValue({ started: true });
    stubBridge({ startRun, stopRun: vi.fn() });
    const emit = stubEvents();
    renderView(PROJECT);

    expect(screen.getByRole("heading", { name: "Banco" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(startRun).toHaveBeenCalledWith({ projectId: "p1" }));
    expect(screen.getByText(/executando/i)).toBeInTheDocument();

    emit.emitLine("PASS: Login");
    expect(screen.getByText(/PASS: Login/)).toBeInTheDocument();

    emit.emitExit(0);
    expect(screen.getByText(/parado/i)).toBeInTheDocument();
    expect(screen.getByText(/processo encerrado \(código 0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/aprovado/i)).toBeInTheDocument();
  });

  it("shows a failed result when the run exits non-zero", async () => {
    stubBridge({ startRun: vi.fn().mockResolvedValue({ started: true }), stopRun: vi.fn() });
    const emit = stubEvents();
    renderView(PROJECT);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => expect(window.recrd?.startRun).toHaveBeenCalled());

    emit.emitExit(1);
    expect(screen.getByText(/falhou ✗ \(código 1\)/i)).toBeInTheDocument();
  });

  it("warns when there is no active project to run", () => {
    const startRun = vi.fn();
    stubBridge({ startRun });
    stubEvents();
    renderView(null);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/selecione um projeto/i);
    expect(startRun).not.toHaveBeenCalled();
  });

  it("surfaces the reason when the run cannot start", async () => {
    stubBridge({
      startRun: vi.fn().mockResolvedValue({ started: false, reason: "Execução já em andamento." }),
    });
    stubEvents();
    renderView(PROJECT);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/já em andamento/i));
  });

  it("stops the run via Stop and Pause", async () => {
    const stopRun = vi.fn().mockResolvedValue(undefined);
    stubBridge({ startRun: vi.fn().mockResolvedValue({ started: true }), stopRun });
    stubEvents();
    renderView(PROJECT);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(stopRun).toHaveBeenCalledTimes(2));
  });
});
