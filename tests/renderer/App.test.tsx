// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "@renderer/App";
import type { RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

describe("App", () => {
  it("renders the title and a loading placeholder when the bridge is absent", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /recrd-agile-testing/i })).toBeInTheDocument();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("shows app info returned by the bridge", async () => {
    stubBridge({
      getAppInfo: vi.fn().mockResolvedValue({ name: "recrd", version: "1.4.2", platform: "win32" }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/recrd v1\.4\.2 \(win32\)/i)).toBeInTheDocument();
    });
  });
});
