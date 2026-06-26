// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TogglesPanel } from "@renderer/screens/TogglesPanel";
import type { RecrdApi, SettingsDto } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

const SETTINGS: SettingsDto = {
  lastOpenedProjectId: null,
  recentProjects: [],
  window: { width: 1280, height: 800 },
  toolPaths: { python: null, robot: null },
  recording: { captureScreenshots: false, defaultTimeoutMs: 30000 },
};

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

describe("TogglesPanel (PRD §9)", () => {
  it("loads recording preferences and reflects them in the controls", async () => {
    stubBridge({ getSettings: vi.fn().mockResolvedValue(SETTINGS), updateSettings: vi.fn() });
    render(<TogglesPanel />);

    await waitFor(() => expect(screen.getByLabelText(/capturar screenshots/i)).not.toBeChecked());
    expect(screen.getByLabelText(/timeout padrão/i)).toHaveValue(30000);
  });

  it("persists a screenshot toggle change", async () => {
    const updateSettings = vi.fn().mockResolvedValue(SETTINGS);
    stubBridge({ getSettings: vi.fn().mockResolvedValue(SETTINGS), updateSettings });
    render(<TogglesPanel />);

    const checkbox = await screen.findByLabelText(/capturar screenshots/i);
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        recording: { captureScreenshots: true, defaultTimeoutMs: 30000 },
      }),
    );
  });

  it("persists a timeout change", async () => {
    const updateSettings = vi.fn().mockResolvedValue(SETTINGS);
    stubBridge({ getSettings: vi.fn().mockResolvedValue(SETTINGS), updateSettings });
    render(<TogglesPanel />);

    const input = await screen.findByLabelText(/timeout padrão/i);
    fireEvent.change(input, { target: { value: "5000" } });
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        recording: { captureScreenshots: false, defaultTimeoutMs: 5000 },
      }),
    );
  });

  it("renders a placeholder when settings are unavailable (no bridge)", () => {
    render(<TogglesPanel />);
    expect(screen.getByText(/preferências de gravação indisponíveis/i)).toBeInTheDocument();
  });
});
