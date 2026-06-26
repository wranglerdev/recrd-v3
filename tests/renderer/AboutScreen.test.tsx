// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutScreen } from "@renderer/screens/AboutScreen";
import type { RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

describe("AboutScreen (PRD §30)", () => {
  it("shows the build version metadata from the bridge", async () => {
    stubBridge({
      getVersionInfo: vi.fn().mockResolvedValue({
        version: "0.2.0",
        gitCommit: "deadbee",
        buildDate: "2026-06-26T12:00:00.000Z",
        target: "win-x64",
      }),
    });

    render(<AboutScreen />);

    await waitFor(() => expect(screen.getByText("0.2.0")).toBeInTheDocument());
    expect(screen.getByText("deadbee")).toBeInTheDocument();
    expect(screen.getByText("win-x64")).toBeInTheDocument();
  });

  it("reports unavailable metadata outside Electron", () => {
    render(<AboutScreen />);
    expect(screen.getByText(/metadados de versão indisponíveis/i)).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    stubBridge({ getVersionInfo: vi.fn().mockRejectedValue(new Error("sem version.json")) });
    render(<AboutScreen />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("sem version.json"));
  });
});
