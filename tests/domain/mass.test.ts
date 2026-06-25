import { describe, expect, it } from "vitest";
import { parseMassCsv } from "@domain/mass/mass-csv";
import { appendImport, editMassValue, massFromCsv, renameMass, type Mass } from "@domain/mass/mass";

function sampleMass(): Mass {
  const parsed = parseMassCsv("usuario,senha\nadmin,123456");
  if (!parsed.ok) throw new Error("fixture parse failed");
  return massFromCsv("m1", "Login", parsed.mass, "2026-06-20T10:00:00.000Z", "login.csv");
}

describe("massFromCsv (PRD §7)", () => {
  it("builds a mass with an initial import-history entry", () => {
    const mass = sampleMass();
    expect(mass.columns).toEqual(["usuario", "senha"]);
    expect(mass.rows).toEqual([{ usuario: "admin", senha: "123456" }]);
    expect(mass.history).toEqual([
      { at: "2026-06-20T10:00:00.000Z", rowCount: 1, source: "login.csv" },
    ]);
  });
});

describe("renameMass", () => {
  it("renames", () => {
    expect(renameMass(sampleMass(), "Massa A").name).toBe("Massa A");
  });
  it("rejects an empty name", () => {
    expect(() => renameMass(sampleMass(), "  ")).toThrowError(/name/i);
  });
});

describe("editMassValue", () => {
  it("updates a cell immutably", () => {
    const mass = sampleMass();
    const edited = editMassValue(mass, 0, "senha", "novaSenha");
    expect(edited.rows[0]).toEqual({ usuario: "admin", senha: "novaSenha" });
    expect(mass.rows[0]?.senha).toBe("123456");
  });
  it("leaves other rows untouched", () => {
    const parsed = parseMassCsv("u,p\na,1\nb,2");
    if (!parsed.ok) throw new Error("fixture parse failed");
    const mass = massFromCsv("m2", "M", parsed.mass, "2026-06-20T10:00:00.000Z", "x.csv");
    const edited = editMassValue(mass, 0, "p", "9");
    expect(edited.rows[0]).toEqual({ u: "a", p: "9" });
    expect(edited.rows[1]).toEqual({ u: "b", p: "2" });
  });

  it("fails fast on unknown column", () => {
    expect(() => editMassValue(sampleMass(), 0, "email", "x")).toThrowError(/unknown column/i);
  });
  it("fails fast on out-of-range row", () => {
    expect(() => editMassValue(sampleMass(), 5, "senha", "x")).toThrowError(/out of range/i);
    expect(() => editMassValue(sampleMass(), -1, "senha", "x")).toThrowError(/out of range/i);
  });
});

describe("appendImport", () => {
  it("appends history newest-last", () => {
    const mass = appendImport(sampleMass(), {
      at: "2026-06-21T10:00:00.000Z",
      rowCount: 3,
      source: "again.csv",
    });
    expect(mass.history).toHaveLength(2);
    expect(mass.history[1]?.source).toBe("again.csv");
  });
});
