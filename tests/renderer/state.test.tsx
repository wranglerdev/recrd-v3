// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { JSX, ReactNode } from "react";
import {
  ActiveProjectProvider,
  errorMessage,
  getBridge,
  useActiveProject,
  useBridge,
  useIpcAction,
  useIpcQuery,
} from "@renderer/state";
import type { ProjectDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const PROJECT: ProjectDto = {
  id: "p1",
  name: "Banco",
  description: "",
  robotPath: null,
  createdBy: "jdoe",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "jdoe",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

describe("getBridge / useBridge", () => {
  it("returns null when the bridge is absent", () => {
    expect(getBridge()).toBeNull();
    const { result } = renderHook(() => useBridge());
    expect(result.current).toBeNull();
  });

  it("returns the injected bridge when present", () => {
    const api = { getAppInfo: vi.fn() };
    stubBridge(api);
    expect(getBridge()).toBe(api);
  });
});

describe("errorMessage", () => {
  it("uses an Error's message, else a friendly fallback", () => {
    expect(errorMessage(new Error("falhou"))).toBe("falhou");
    expect(errorMessage(new Error("  "))).toBe("Erro inesperado.");
    expect(errorMessage(42)).toBe("Erro inesperado.");
  });
});

describe("useIpcQuery", () => {
  it("stays idle when run is null", () => {
    const { result } = renderHook(() => useIpcQuery<number>(null));
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeNull();
  });

  it("resolves to success with data", async () => {
    const { result } = renderHook(() => useIpcQuery(() => Promise.resolve(7)));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toBe(7);
    expect(result.current.loading).toBe(false);
  });

  it("captures a rejection as an error message", async () => {
    const { result } = renderHook(() => useIpcQuery(() => Promise.reject(new Error("boom"))));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("boom");
  });
});

describe("useIpcAction", () => {
  it("tracks loading then success and returns the value", async () => {
    const action = vi.fn(async (n: number) => n * 2);
    const { result } = renderHook(() => useIpcAction(action));

    let returned: number | null = null;
    await act(async () => {
      returned = await result.current.run(21);
    });

    expect(returned).toBe(42);
    expect(result.current.status).toBe("success");
    expect(result.current.data).toBe(42);
  });

  it("returns null and records the error on failure", async () => {
    const action = vi.fn(async () => {
      throw new Error("nope");
    });
    const { result } = renderHook(() => useIpcAction(action));

    let returned: unknown = "unset";
    await act(async () => {
      returned = await result.current.run();
    });

    expect(returned).toBeNull();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("nope");
  });
});

describe("ActiveProjectProvider / useActiveProject", () => {
  function Probe(): JSX.Element {
    const { activeProject, setActiveProject } = useActiveProject();
    return (
      <div>
        <span>active: {activeProject?.name ?? "none"}</span>
        <button type="button" onClick={() => setActiveProject(PROJECT)}>
          select
        </button>
      </div>
    );
  }

  it("provides and updates the active project", () => {
    render(
      <ActiveProjectProvider>
        <Probe />
      </ActiveProjectProvider>,
    );

    expect(screen.getByText(/active: none/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /select/i }));
    expect(screen.getByText(/active: Banco/i)).toBeInTheDocument();
  });

  it("throws when used outside its provider", () => {
    const wrapper = ({ children }: { children: ReactNode }): ReactNode => children;
    expect(() => renderHook(() => useActiveProject(), { wrapper })).toThrow(
      /ActiveProjectProvider/i,
    );
  });
});
