// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SandboxNavBar } from "@renderer/screens/SandboxNavBar";
import type { RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

describe("SandboxNavBar (PRD §10)", () => {
  it("opens the typed URL, defaulting the scheme to https", () => {
    const openSandbox = vi.fn();
    stubBridge({ openSandbox });
    render(<SandboxNavBar />);

    fireEvent.change(screen.getByLabelText("Endereço"), { target: { value: "exemplo.com" } });
    fireEvent.submit(screen.getByLabelText("Navegação do sandbox"));
    expect(openSandbox).toHaveBeenCalledWith({ url: "https://exemplo.com" });
  });

  it("keeps an explicit http(s) scheme as typed", () => {
    const openSandbox = vi.fn();
    stubBridge({ openSandbox });
    render(<SandboxNavBar />);

    fireEvent.change(screen.getByLabelText("Endereço"), {
      target: { value: "http://intranet.local" },
    });
    fireEvent.submit(screen.getByLabelText("Navegação do sandbox"));
    expect(openSandbox).toHaveBeenCalledWith({ url: "http://intranet.local" });
  });

  it("ignores an empty address", () => {
    const openSandbox = vi.fn();
    stubBridge({ openSandbox });
    render(<SandboxNavBar />);

    fireEvent.submit(screen.getByLabelText("Navegação do sandbox"));
    expect(openSandbox).not.toHaveBeenCalled();
  });

  it("wires back, forward and reload controls", () => {
    const sandboxBack = vi.fn();
    const sandboxForward = vi.fn();
    const sandboxReload = vi.fn();
    stubBridge({ sandboxBack, sandboxForward, sandboxReload });
    render(<SandboxNavBar />);

    fireEvent.click(screen.getByLabelText("Voltar"));
    fireEvent.click(screen.getByLabelText("Avançar"));
    fireEvent.click(screen.getByLabelText("Recarregar"));
    expect(sandboxBack).toHaveBeenCalledOnce();
    expect(sandboxForward).toHaveBeenCalledOnce();
    expect(sandboxReload).toHaveBeenCalledOnce();
  });

  it("degrades to no-ops when the bridge is absent", () => {
    render(<SandboxNavBar />);
    fireEvent.change(screen.getByLabelText("Endereço"), { target: { value: "exemplo.com" } });
    fireEvent.submit(screen.getByLabelText("Navegação do sandbox"));
    fireEvent.click(screen.getByLabelText("Voltar"));
    // No throw — the controls simply do nothing.
    expect(screen.getByLabelText("Endereço")).toHaveValue("exemplo.com");
  });
});
