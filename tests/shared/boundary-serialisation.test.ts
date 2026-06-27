import { describe, expect, it } from "vitest";
import type { StoredMass } from "@application/mass/mass-service";
import type { ManualScript } from "@domain/scripts/script-action";
import type { MassDto, ManualScriptDto } from "@shared/ipc-contract";

// IPC boundary contract (PRD §3, electron-u0o.3). The renderer must never see a
// Drizzle row or a Node value (Date, Buffer, undefined, function): the database
// adapters map rows ↔ domain (JSON-(de)serialising columns/rows/history and the
// script content; audit fields are kept as ISO strings), and the wire DTOs mirror
// the resulting application/domain types so they cross `invoke` unchanged with no
// extra mapping. These guards pin that contract: the stored types stay
// structurally interchangeable with their DTOs, and a stored value survives a
// JSON round-trip identical (proving it is fully serialisable).

/** A value is wire-safe iff JSON.stringify→parse reproduces it exactly. */
function assertSerialisable(value: unknown): void {
  expect(JSON.parse(JSON.stringify(value))).toEqual(value);
}

const STORED_MASS: StoredMass = {
  id: "m1",
  projectId: "p1",
  name: "Usuários",
  columns: ["usuario", "senha"],
  rows: [{ usuario: "admin", senha: "123" }],
  history: [{ at: "2026-06-20T10:00:00.000Z", rowCount: 1, source: "/tmp/x.csv" }],
  createdBy: "dev",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedBy: "dev",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

const MANUAL_SCRIPT: ManualScript = {
  name: "Login",
  actions: [
    { type: "navigate", url: "https://example.com" },
    { type: "input", selector: "#user", value: "{{usuario}}" },
    { type: "click", selector: "#go" },
  ],
};

describe("IPC boundary serialisation (electron-u0o.3)", () => {
  it("keeps StoredMass interchangeable with its wire DTO", () => {
    // Compile-time: assignable in both directions ⇒ structurally equal, so the
    // application type crosses the boundary as MassDto with no mapping step.
    const dto: MassDto = STORED_MASS;
    const back: StoredMass = dto;
    expect(back).toBe(STORED_MASS);
  });

  it("keeps ManualScript interchangeable with its wire DTO", () => {
    const dto: ManualScriptDto = MANUAL_SCRIPT;
    const back: ManualScript = dto;
    expect(back).toBe(MANUAL_SCRIPT);
  });

  it("serialises a stored mass without losing or transforming any field", () => {
    assertSerialisable(STORED_MASS);
  });

  it("serialises a manual script (JSON-stored content) unchanged", () => {
    assertSerialisable(MANUAL_SCRIPT);
  });
});
