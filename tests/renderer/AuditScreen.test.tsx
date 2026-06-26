// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditScreen } from "@renderer/screens/AuditScreen";
import type { AuditEventDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const EVENTS: AuditEventDto[] = [
  {
    id: "a1",
    type: "mass.import",
    user: "ana",
    at: "2026-06-26T10:00:00.000Z",
    details: { name: "Login", rowCount: 2 },
  },
  {
    id: "a2",
    type: "compile",
    user: "ana",
    at: "2026-06-26T09:00:00.000Z",
    details: {},
  },
];

describe("AuditScreen (PRD §16)", () => {
  it("renders the recorded events with a friendly type label and details", async () => {
    stubBridge({ listAuditEvents: vi.fn().mockResolvedValue(EVENTS) });
    render(<AuditScreen />);

    await waitFor(() => expect(screen.getByText(/importação de massa/i)).toBeInTheDocument());
    expect(screen.getByText(/compilação/i)).toBeInTheDocument();
    expect(screen.getByText(/name: Login, rowCount: 2/)).toBeInTheDocument();
    expect(window.recrd?.listAuditEvents).toHaveBeenCalledWith({});
  });

  it("shows an empty state when there are no events", async () => {
    stubBridge({ listAuditEvents: vi.fn().mockResolvedValue([]) });
    render(<AuditScreen />);

    await waitFor(() => expect(screen.getByText(/nenhum evento registrado/i)).toBeInTheDocument());
  });

  it("surfaces an error from the bridge", async () => {
    stubBridge({ listAuditEvents: vi.fn().mockRejectedValue(new Error("falhou")) });
    render(<AuditScreen />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("falhou"));
  });

  it("renders a heading even when the bridge is absent", () => {
    render(<AuditScreen />);
    expect(screen.getByRole("heading", { name: /trilha de auditoria/i })).toBeInTheDocument();
  });
});
