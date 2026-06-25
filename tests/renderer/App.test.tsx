// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("renders the home screen and a connecting status when the bridge is absent", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /recrd-agile-testing/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /últimas execuções/i })).toBeInTheDocument();
    expect(screen.getByText(/nenhuma execução ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/conectando ao processo principal/i)).toBeInTheDocument();
  });

  it("shows app info returned by the bridge in the status bar", async () => {
    stubBridge({
      getAppInfo: vi.fn().mockResolvedValue({ name: "recrd", version: "1.4.2", platform: "win32" }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/recrd v1\.4\.2 \(win32\)/i)).toBeInTheDocument();
    });
  });

  it("navigates from home to the new-project form and back", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /novo projeto/i }));
    expect(screen.getByRole("form", { name: /novo projeto/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /início/i }));
    expect(screen.getByRole("heading", { name: /últimas execuções/i })).toBeInTheDocument();
  });

  it("navigates to the automation and mass screens from the quick actions", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /gravar novo teste/i }));
    expect(screen.getByRole("heading", { name: /nova automação/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /início/i }));
    fireEvent.click(screen.getByRole("button", { name: /importar massa/i }));
    expect(screen.getByRole("heading", { name: /nova massa/i })).toBeInTheDocument();
  });
});
