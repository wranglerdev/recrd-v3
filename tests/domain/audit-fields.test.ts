import { describe, expect, it } from "vitest";
import { createAuditFields, touchAuditFields } from "@domain/audit/audit-fields";

describe("audit fields (PRD §16)", () => {
  it("stamps creation with equal created/updated", () => {
    const fields = createAuditFields("DOMAIN\\jose", new Date("2026-06-20T10:00:00Z"));
    expect(fields).toEqual({
      createdBy: "DOMAIN\\jose",
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedBy: "DOMAIN\\jose",
      updatedAt: "2026-06-20T10:00:00.000Z",
    });
  });

  it("refreshes only updatedBy/updatedAt on touch", () => {
    const created = createAuditFields("ada", new Date("2026-06-20T10:00:00Z"));
    const updated = touchAuditFields(created, "bob", new Date("2026-06-21T12:30:00Z"));

    expect(updated.createdBy).toBe("ada");
    expect(updated.createdAt).toBe("2026-06-20T10:00:00.000Z");
    expect(updated.updatedBy).toBe("bob");
    expect(updated.updatedAt).toBe("2026-06-21T12:30:00.000Z");
  });
});
