import { describe, expect, it, vi } from "vitest";
import {
  createScriptUseCases,
  type ManualScriptRecord,
  type ManualScriptStore,
} from "../../src/application/scripts/script-service";
import type { AuditSink } from "../../src/application/audit/audit-service";
import type { UserContext } from "../../src/domain/auth/user-context";
import type { ManualScript } from "../../src/domain/scripts/script-action";

const USER: UserContext = { username: "ana", displayName: "Ana", domain: "CORP", sid: "S-1" };
const clock = () => new Date("2026-06-26T12:00:00.000Z");

const script: ManualScript = {
  name: "Login",
  actions: [{ type: "navigate", url: "https://example.com" }],
};

function fakeStore(seed: ManualScriptRecord[] = []): ManualScriptStore & {
  rows: ManualScriptRecord[];
} {
  const rows = [...seed];
  return {
    rows,
    findByCase: (caseId) => rows.find((row) => row.caseId === caseId),
    create: (record) => {
      rows.push(record);
      return record;
    },
    update: (id, patch) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) {
        return undefined;
      }
      rows[index] = { ...rows[index], ...patch } as ManualScriptRecord;
      return rows[index];
    },
  };
}

function make(overrides: Partial<Parameters<typeof createScriptUseCases>[0]> = {}) {
  return createScriptUseCases({
    store: overrides.store ?? fakeStore(),
    userContext: USER,
    newId: () => "scr-1",
    clock,
    ...overrides,
  });
}

describe("createScriptUseCases.saveManual (PRD §6, §10)", () => {
  it("creates a manual script on first save and audits it", () => {
    const store = fakeStore();
    const audit: AuditSink = { record: vi.fn() };
    const useCases = make({ store, audit });

    const saved = useCases.saveManual({ caseId: "c1", script });
    expect(saved).toMatchObject({
      id: "scr-1",
      caseId: "c1",
      kind: "manual",
      content: JSON.stringify(script),
      createdBy: "ana",
    });
    expect(store.rows).toHaveLength(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "test.change",
        details: { scriptId: "scr-1", caseId: "c1", actions: 1 },
      }),
    );
  });

  it("updates the existing manual script on subsequent saves", () => {
    const store = fakeStore([
      {
        id: "existing",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify({ name: "Login", actions: [] }),
        createdBy: "ana",
        createdAt: "2026-06-26T11:00:00.000Z",
        updatedBy: "ana",
        updatedAt: "2026-06-26T11:00:00.000Z",
      },
    ]);
    const useCases = make({ store, newId: () => "should-not-be-used" });

    const saved = useCases.saveManual({ caseId: "c1", script });
    expect(saved.id).toBe("existing");
    expect(saved.content).toBe(JSON.stringify(script));
    expect(saved.updatedAt).toBe("2026-06-26T12:00:00.000Z");
    expect(store.rows).toHaveLength(1);
  });

  it("falls back to the existing record if the update returns nothing", () => {
    const existing: ManualScriptRecord = {
      id: "existing",
      caseId: "c1",
      kind: "manual",
      content: "{}",
      createdBy: "ana",
      createdAt: "2026-06-26T11:00:00.000Z",
      updatedBy: "ana",
      updatedAt: "2026-06-26T11:00:00.000Z",
    };
    const store: ManualScriptStore = {
      findByCase: () => existing,
      create: vi.fn(),
      update: () => undefined,
    };
    const useCases = make({ store });
    expect(useCases.saveManual({ caseId: "c1", script })).toBe(existing);
  });

  it("works without an audit sink", () => {
    const useCases = make();
    expect(() => useCases.saveManual({ caseId: "c1", script })).not.toThrow();
  });
});

describe("createScriptUseCases.getManual", () => {
  it("parses the stored manual script", () => {
    const store = fakeStore();
    const useCases = make({ store });
    useCases.saveManual({ caseId: "c1", script });
    expect(useCases.getManual("c1")).toEqual(script);
  });

  it("returns undefined when the case has no manual script", () => {
    expect(make().getManual("absent")).toBeUndefined();
  });
});
