import { describe, expect, it, vi } from "vitest";
import {
  createExecutionUseCases,
  type ExecutionRepository,
  type ExecutionUseCaseDeps,
  type StoredExecution,
} from "../../src/application/execution/execution-service";
import type { UserContext } from "../../src/domain/auth/user-context";

const audit = {
  createdBy: "j",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "j",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

const USER: UserContext = { username: "jdoe", displayName: "J", domain: "CORP", sid: "S-1" };

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

/** An in-memory execution repository. */
function fakeRepository(seed: StoredExecution[] = []): ExecutionRepository & {
  store: StoredExecution[];
} {
  const store = [...seed];
  return {
    store,
    list: () => [...store],
    create: (execution) => {
      store.push(execution);
      return execution;
    },
  };
}

function make(overrides: Partial<ExecutionUseCaseDeps> = {}) {
  const repository = overrides.repository ?? fakeRepository();
  return createExecutionUseCases({
    repository,
    caseName: () => "Caso",
    userContext: USER,
    newId: () => "exec-1",
    saveLog: vi.fn(),
    ...overrides,
  });
}

describe("createExecutionUseCases.listRecent (PRD §8, §15)", () => {
  it("returns executions newest-first with the case name resolved", () => {
    const repository = fakeRepository([
      execution({ id: "e1", caseId: "c1", startedAt: "2026-06-26T09:00:00.000Z" }),
      execution({ id: "e2", caseId: "c2", startedAt: "2026-06-26T11:00:00.000Z" }),
      execution({ id: "e3", caseId: "c1", startedAt: "2026-06-26T10:00:00.000Z" }),
    ]);
    const names: Record<string, string> = { c1: "Login", c2: "Checkout" };
    const useCases = make({ repository, caseName: (id) => names[id] });

    expect(useCases.listRecent().map((e) => [e.id, e.caseName])).toEqual([
      ["e2", "Checkout"],
      ["e3", "Login"],
      ["e1", "Login"],
    ]);
  });

  it("falls back to a placeholder when the case was removed", () => {
    const useCases = make({
      repository: fakeRepository([execution({ caseId: "gone" })]),
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
    const useCases = make({ repository: fakeRepository(rows) });

    expect(useCases.listRecent()).toHaveLength(10);
    expect(useCases.listRecent(3)).toHaveLength(3);
    expect(useCases.listRecent(1)[0]?.id).toBe("e14");
  });

  it("preserves a stable order for executions sharing a timestamp", () => {
    const rows = [
      execution({ id: "e1", startedAt: "2026-06-26T10:00:00.000Z" }),
      execution({ id: "e2", startedAt: "2026-06-26T10:00:00.000Z" }),
    ];
    const useCases = make({ repository: fakeRepository(rows) });
    expect(useCases.listRecent().map((e) => e.id)).toEqual(["e1", "e2"]);
  });
});

describe("createExecutionUseCases.record (PRD §15, §16)", () => {
  it("persists an audited execution from a finished run and saves its log", () => {
    const repository = fakeRepository();
    const saveLog = vi.fn();
    const useCases = make({ repository, newId: () => "exec-9", saveLog });

    const stored = useCases.record({
      caseId: "c1",
      startedAt: new Date("2026-06-26T10:00:00.000Z"),
      finishedAt: new Date("2026-06-26T10:00:03.500Z"),
      exitCode: 0,
      log: "PASS",
    });

    expect(stored).toMatchObject({
      id: "exec-9",
      caseId: "c1",
      startedAt: "2026-06-26T10:00:00.000Z",
      result: "passed",
      durationMs: 3500,
      log: "PASS",
      createdBy: "jdoe",
      createdAt: "2026-06-26T10:00:03.500Z",
    });
    expect(repository.store).toHaveLength(1);
    expect(saveLog).toHaveBeenCalledWith("exec-9", "PASS");
  });

  it("maps a non-zero exit code to a failed result", () => {
    const useCases = make();
    const stored = useCases.record({
      caseId: "c1",
      startedAt: new Date("2026-06-26T10:00:00.000Z"),
      finishedAt: new Date("2026-06-26T10:00:01.000Z"),
      exitCode: 3,
      log: "",
    });
    expect(stored.result).toBe("failed");
  });
});
