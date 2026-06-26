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

const DEFAULT_SETTINGS = {
  lastOpenedProjectId: null,
  recentProjects: [],
  window: { width: 1280, height: 800 },
  toolPaths: { python: null, robot: null },
  recording: { captureScreenshots: false, defaultTimeoutMs: 30000 },
} as const;

function stubBridge(api: Partial<RecrdApi>): void {
  // The Automation screen reports the sandbox viewport and renders the toggles
  // panel on mount, so every stub needs the sandbox + settings methods; specific
  // tests override the rest.
  const value: Partial<RecrdApi> = {
    setSandboxBounds: vi.fn(),
    setSandboxVisible: vi.fn(),
    getSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
    updateSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
    ...api,
  };
  Object.defineProperty(window, "recrd", { value, configurable: true });
}

function stubEvents(): {
  emitLine: (line: string) => void;
  emitExit: (exitCode: number) => void;
  emitCapture: (action: unknown) => void;
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
    emitCapture: (action) => act(() => listeners.get("capture:action")?.({ action })),
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

function renderView(
  project: ProjectDto | null = null,
  testCase: { id: string; name: string } | null = null,
) {
  render(
    <ActiveProjectProvider>
      <WithActiveProject project={project} testCase={testCase}>
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

  it("shows the active case's execution history and refreshes it on exit", async () => {
    const listExecutionsByCase = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "ex1",
          caseId: "c1",
          caseName: "Login",
          result: "passed",
          startedAt: "2026-06-26T10:00:00.000Z",
          durationMs: 1500,
        },
      ]);
    stubBridge({
      startRun: vi.fn().mockResolvedValue({ started: true }),
      stopRun: vi.fn(),
      listExecutionsByCase,
    });
    const emit = stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    // History loads for the active case (empty at first).
    await waitFor(() => expect(listExecutionsByCase).toHaveBeenCalledWith({ caseId: "c1" }));
    expect(screen.getByText(/nenhuma execução para este caso/i)).toBeInTheDocument();

    // A finished run refreshes the history, surfacing the new row.
    emit.emitExit(0);
    await waitFor(() => expect(listExecutionsByCase).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/2026-06-26 10:00 \(1\.5s\)/)).toBeInTheDocument();
  });

  it("exports the active case's JSON + Robot, reporting the written paths", async () => {
    const exportJson = vi.fn().mockResolvedValue({ path: "/exports/login.recrd.json" });
    const exportRobot = vi.fn().mockResolvedValue({ path: "/exports/login.robot" });
    stubBridge({
      startRun: vi.fn(),
      stopRun: vi.fn(),
      listExecutionsByCase: vi.fn().mockResolvedValue([]),
      exportJson,
      exportRobot,
    });
    stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    await waitFor(() => expect(exportJson).toHaveBeenCalledWith({ caseId: "c1" }));
    expect(exportRobot).toHaveBeenCalledWith({ caseId: "c1" });
    await waitFor(() =>
      expect(screen.getByLabelText("Status da exportação")).toHaveTextContent(
        "/exports/login.recrd.json, /exports/login.robot",
      ),
    );
  });

  it("warns when exporting without an active case", () => {
    stubBridge({ startRun: vi.fn(), exportJson: vi.fn() });
    stubEvents();
    renderView(PROJECT);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(screen.getByLabelText("Status da exportação")).toHaveTextContent(/selecione um caso/i);
    expect(window.recrd?.exportJson).not.toHaveBeenCalled();
  });

  it("surfaces an export failure message", async () => {
    stubBridge({
      startRun: vi.fn(),
      listExecutionsByCase: vi.fn().mockResolvedValue([]),
      exportJson: vi.fn().mockRejectedValue(new Error("Caso sem script para exportar")),
      exportRobot: vi.fn().mockResolvedValue({ path: "/x.robot" }),
    });
    stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Status da exportação")).toHaveTextContent(
        /caso sem script para exportar/i,
      ),
    );
  });

  it("exports an execution's log from the history", async () => {
    const exportLog = vi.fn().mockResolvedValue({ path: "/exports/execution-2026-06-26.log" });
    stubBridge({
      startRun: vi.fn(),
      exportLog,
      listExecutionsByCase: vi.fn().mockResolvedValue([
        {
          id: "ex1",
          caseId: "c1",
          caseName: "Login",
          result: "passed",
          startedAt: "2026-06-26T10:00:00.000Z",
          durationMs: 1500,
        },
      ]),
    });
    stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    await waitFor(() => expect(screen.getByRole("button", { name: "Exportar log" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Exportar log" }));
    await waitFor(() => expect(exportLog).toHaveBeenCalledWith({ executionId: "ex1" }));
    expect(screen.getByLabelText("Status da exportação")).toHaveTextContent(
      "/exports/execution-2026-06-26.log",
    );
  });

  it("compiles the recorded actions and previews the .robot", async () => {
    const compileScript = vi.fn().mockResolvedValue({
      ok: true,
      scriptId: "s1",
      robot: "*** Settings ***\nLibrary Browser",
      robotFile: "/r/tests/login.robot",
      warnings: [],
    });
    stubBridge({
      startRun: vi.fn(),
      saveManualScript: vi.fn().mockResolvedValue(undefined),
      listExecutionsByCase: vi.fn().mockResolvedValue([]),
      compileScript,
    });
    const emit = stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    // Start recording, then capture one action so there is something to compile.
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    emit.emitCapture({ type: "navigate", url: "https://e.com" });
    fireEvent.click(screen.getByRole("button", { name: "Compilar" }));

    await waitFor(() =>
      expect(compileScript).toHaveBeenCalledWith({
        caseId: "c1",
        projectId: "p1",
        script: { name: "Login", actions: [{ type: "navigate", url: "https://e.com" }] },
      }),
    );
    expect(await screen.findByLabelText("Preview do .robot")).toHaveTextContent("Library Browser");
  });

  it("warns when compiling without recorded actions", () => {
    stubBridge({
      startRun: vi.fn(),
      compileScript: vi.fn(),
      listExecutionsByCase: vi.fn().mockResolvedValue([]),
    });
    stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Compilar" }));
    expect(screen.getByText(/nenhuma ação gravada para compilar/i)).toBeInTheDocument();
    expect(window.recrd?.compileScript).not.toHaveBeenCalled();
  });

  it("records capture only between Gravar and Pausar (PRD §10)", async () => {
    const saveManualScript = vi.fn().mockResolvedValue(undefined);
    stubBridge({
      startRun: vi.fn(),
      saveManualScript,
      listExecutionsByCase: vi.fn().mockResolvedValue([]),
    });
    const emit = stubEvents();
    renderView(PROJECT, { id: "c1", name: "Login" });

    // Idle: capture is ignored.
    emit.emitCapture({ type: "click", selector: "#a" });
    expect(screen.getByText(/gravação: parada/i)).toBeInTheDocument();

    // Recording: capture is accumulated into the timeline.
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    emit.emitCapture({ type: "click", selector: "#b" });
    expect(screen.getByText(/Clicar em #b/)).toBeInTheDocument();

    // Paused: further capture is ignored.
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    emit.emitCapture({ type: "click", selector: "#c" });
    expect(screen.queryByText(/Clicar em #c/)).not.toBeInTheDocument();

    await waitFor(() => expect(saveManualScript).toHaveBeenCalled());
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
