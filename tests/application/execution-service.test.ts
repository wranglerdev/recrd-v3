import { describe, expect, it } from "vitest";
import {
  createExecutionUseCases,
  type StoredExecution,
} from "../../src/application/execution/execution-service";

const audit = {
  createdBy: "j",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "j",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

function execution(overrides: Partial<StoredExecution> = {}): StoredExecution {
  return {
    id: "e1",
    caseId: "c1",
    startedAt: "2026-06-26T10:00:00.000Z",
    result: "passed",
    durationMs: 1200,
    log: "",
    ...audit,
    ...overrides,
  };
}

describe("createExecutionUseCases.listRecent (PRD §8, §15)", () => {
  it("returns executions newest-first with the case name resolved", () => {
    const rows = [
      execution({ id: "e1", caseId: "c1", startedAt: "2026-06-26T09:00:00.000Z" }),
      execution({ id: "e2", caseId: "c2", startedAt: "2026-06-26T11:00:00.000Z" }),
      execution({ id: "e3", caseId: "c1", startedAt: "2026-06-26T10:00:00.000Z" }),
    ];
    const names: Record<string, string> = { c1: "Login", c2: "Checkout" };
    const useCases = createExecutionUseCases({
      repository: { list: () => rows },
      caseName: (id) => names[id],
    });

    expect(useCases.listRecent().map((e) => [e.id, e.caseName])).toEqual([
      ["e2", "Checkout"],
      ["e3", "Login"],
      ["e1", "Login"],
    ]);
  });

  it("falls back to a placeholder when the case was removed", () => {
    const useCases = createExecutionUseCases({
      repository: { list: () => [execution({ caseId: "gone" })] },
      caseName: () => undefined,
    });

    expect(useCases.listRecent()[0]?.caseName).toBe("Caso removido");
  });

  it("caps the result to the requested limit (default 10)", () => {
    const rows = Array.from({ length: 15 }, (_, index) =>
      execution({
        id: `e${index}`,
        startedAt: `2026-06-26T${String(index).padStart(2, "0")}:00:00.000Z`,
      }),
    );
    const useCases = createExecutionUseCases({
      repository: { list: () => rows },
      caseName: () => "Caso",
    });

    expect(useCases.listRecent()).toHaveLength(10);
    expect(useCases.listRecent(3)).toHaveLength(3);
    // Newest first: the highest hour comes first.
    expect(useCases.listRecent(1)[0]?.id).toBe("e14");
  });

  it("preserves a stable order for executions sharing a timestamp", () => {
    const rows = [
      execution({ id: "e1", startedAt: "2026-06-26T10:00:00.000Z" }),
      execution({ id: "e2", startedAt: "2026-06-26T10:00:00.000Z" }),
    ];
    const useCases = createExecutionUseCases({
      repository: { list: () => rows },
      caseName: () => "Caso",
    });

    expect(useCases.listRecent().map((e) => e.id)).toEqual(["e1", "e2"]);
  });
});
