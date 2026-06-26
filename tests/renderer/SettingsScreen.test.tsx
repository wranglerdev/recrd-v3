// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "@renderer/screens/SettingsScreen";
import type { RecrdApi, SettingsDto } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const SETTINGS: SettingsDto = {
  lastOpenedProjectId: null,
  recentProjects: [],
  window: { width: 1280, height: 800 },
  toolPaths: { python: "/usr/bin/python3", robot: null },
  recording: { captureScreenshots: true, defaultTimeoutMs: 5000 },
};

describe("SettingsScreen (PRD §3, §4)", () => {
  it("loads current settings and saves a patch via the bridge", async () => {
    const getSettings = vi.fn().mockResolvedValue(SETTINGS);
    const updateSettings = vi.fn().mockResolvedValue(SETTINGS);
    stubBridge({ getSettings, updateSettings });

    render(<SettingsScreen />);

    // Loaded values populate the form.
    const python = await screen.findByLabelText("Python");
    expect(python).toHaveValue("/usr/bin/python3");

    fireEvent.change(python, { target: { value: "/opt/py" } });
    fireEvent.click(screen.getByLabelText(/capturar screenshots/i));
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/salvas/i));
    expect(updateSettings).toHaveBeenCalledWith({
      toolPaths: { python: "/opt/py", robot: null },
      recording: { captureScreenshots: false, defaultTimeoutMs: 5000 },
    });
  });

  it("reports unavailable settings outside Electron", () => {
    render(<SettingsScreen />);
    expect(screen.getByText(/configurações indisponíveis/i)).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    stubBridge({ getSettings: vi.fn().mockRejectedValue(new Error("disco cheio")) });
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("disco cheio"));
  });
});
