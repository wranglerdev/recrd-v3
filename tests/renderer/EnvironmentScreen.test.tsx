// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentScreen } from "@renderer/screens/EnvironmentScreen";
import { ActiveProjectProvider, useActiveProject } from "@renderer/state";
import type { EnvironmentStatusDto, IpcEvents, ProjectDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
  Reflect.deleteProperty(window, "recrdEvents");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

/** A controllable event bridge that lets the test emit streamed payloads. */
function stubEvents(): {
  emitLine: (line: string) => void;
  emitDone: (ok: boolean, failedCommand: string | null) => void;
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
    emitLine: (line) => act(() => listeners.get("env:install:line")?.({ line })),
    emitDone: (ok, failedCommand) =>
      act(() => listeners.get("env:install:done")?.({ ok, failedCommand })),
  };
}

const READY: EnvironmentStatusDto = {
  report: {
    python: { installed: true, version: "3.11.4" },
    robotFramework: true,
    playwrightBrowser: true,
    venvPresent: true,
    ready: true,
  },
  plan: [],
};

const INCOMPLETE: EnvironmentStatusDto = {
  report: {
    python: { installed: true, version: "3.11.4" },
    robotFramework: false,
    playwrightBrowser: false,
    venvPresent: false,
    ready: false,
  },
  plan: ["python -m venv .venv", "pip install robotframework"],
};

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

function renderScreen(project: ProjectDto | null = null) {
  render(
    <ActiveProjectProvider>
      <WithActiveProject project={project}>
        <EnvironmentScreen />
      </WithActiveProject>
    </ActiveProjectProvider>,
  );
}

describe("EnvironmentScreen — status (PRD §14)", () => {
  it("shows a ready environment with no install plan", async () => {
    const checkEnvironment = vi.fn().mockResolvedValue(READY);
    stubBridge({ checkEnvironment });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/ambiente pronto/i)).toBeInTheDocument());
    expect(screen.getByText(/Python 3\.11\.4: OK/)).toBeInTheDocument();
    expect(screen.queryByText(/plano de instalação/i)).not.toBeInTheDocument();
    expect(checkEnvironment).toHaveBeenCalledWith({ root: null });
  });

  it("lists the install plan and asks to select a project when none is active", async () => {
    stubBridge({ checkEnvironment: vi.fn().mockResolvedValue(INCOMPLETE) });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/ambiente incompleto/i)).toBeInTheDocument());
    expect(screen.getByText(/Robot Framework: Pendente/)).toBeInTheDocument();
    expect(screen.getByText("python -m venv .venv")).toBeInTheDocument();
    // No active project => no install button, just a hint.
    expect(screen.queryByRole("button", { name: /instalar ambiente/i })).not.toBeInTheDocument();
    expect(screen.getByText(/selecione um projeto com repositório robot/i)).toBeInTheDocument();
  });

  it("surfaces an error from the bridge", async () => {
    stubBridge({ checkEnvironment: vi.fn().mockRejectedValue(new Error("falhou")) });
    renderScreen();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("falhou"));
  });

  it("renders a heading when the bridge is absent", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: /ambiente robot/i })).toBeInTheDocument();
  });
});

describe("EnvironmentScreen — install (PRD §14)", () => {
  it("runs the install, streams progress, then re-checks on done", async () => {
    // Stateful check: incomplete until the install flips it to ready.
    let ready = false;
    const checkEnvironment = vi.fn(async () => (ready ? READY : INCOMPLETE));
    const startEnvironmentInstall = vi.fn().mockResolvedValue({ started: true });
    stubBridge({ checkEnvironment, startEnvironmentInstall });
    const emit = stubEvents();
    renderScreen(PROJECT);

    const button = await screen.findByRole("button", { name: /instalar ambiente/i });
    fireEvent.click(button);

    await waitFor(() => expect(startEnvironmentInstall).toHaveBeenCalledWith({ root: "/repo" }));
    expect(screen.getByRole("button", { name: /instalando/i })).toBeInTheDocument();

    emit.emitLine("$ python -m venv .venv");
    emit.emitLine("created venv");
    expect(screen.getByText(/created venv/)).toBeInTheDocument();

    // A successful done re-checks the environment (now ready).
    ready = true;
    emit.emitDone(true, null);
    await waitFor(() => expect(screen.getByText(/ambiente pronto/i)).toBeInTheDocument());
  });

  it("shows the failed command when the install fails", async () => {
    stubBridge({
      checkEnvironment: vi.fn().mockResolvedValue(INCOMPLETE),
      startEnvironmentInstall: vi.fn().mockResolvedValue({ started: true }),
    });
    const emit = stubEvents();
    renderScreen(PROJECT);

    fireEvent.click(await screen.findByRole("button", { name: /instalar ambiente/i }));
    await waitFor(() => expect(window.recrd?.startEnvironmentInstall).toHaveBeenCalled());

    emit.emitDone(false, "pip install robotframework");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/pip install robotframework/i),
    );
  });

  it("reports when the install could not start", async () => {
    stubBridge({
      checkEnvironment: vi.fn().mockResolvedValue(INCOMPLETE),
      startEnvironmentInstall: vi.fn().mockResolvedValue({
        started: false,
        reason: "Instalação já em andamento.",
      }),
    });
    stubEvents();
    renderScreen(PROJECT);

    fireEvent.click(await screen.findByRole("button", { name: /instalar ambiente/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/já em andamento/i));
  });
});
