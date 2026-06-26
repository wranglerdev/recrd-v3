// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentScreen } from "@renderer/screens/EnvironmentScreen";
import { ActiveProjectProvider } from "@renderer/state";
import type { EnvironmentStatusDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
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

function renderScreen() {
  render(
    <ActiveProjectProvider>
      <EnvironmentScreen />
    </ActiveProjectProvider>,
  );
}

describe("EnvironmentScreen (PRD §14)", () => {
  it("shows a ready environment with no install plan", async () => {
    const checkEnvironment = vi.fn().mockResolvedValue(READY);
    stubBridge({ checkEnvironment });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/ambiente pronto/i)).toBeInTheDocument());
    expect(screen.getByText(/Python 3\.11\.4: OK/)).toBeInTheDocument();
    expect(screen.queryByText(/plano de instalação/i)).not.toBeInTheDocument();
    // No active project => probes with a null root.
    expect(checkEnvironment).toHaveBeenCalledWith({ root: null });
  });

  it("lists the install plan for an incomplete environment", async () => {
    stubBridge({ checkEnvironment: vi.fn().mockResolvedValue(INCOMPLETE) });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/ambiente incompleto/i)).toBeInTheDocument());
    expect(screen.getByText(/Robot Framework: Pendente/)).toBeInTheDocument();
    expect(screen.getByText("python -m venv .venv")).toBeInTheDocument();
    expect(screen.getByText("pip install robotframework")).toBeInTheDocument();
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
