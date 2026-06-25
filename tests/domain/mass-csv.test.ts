import { describe, expect, it } from "vitest";
import { parseMassCsv, toVariableMap } from "@domain/mass/mass-csv";

describe("parseMassCsv (PRD §7)", () => {
  it("parses a header and value row into columns and records", () => {
    const result = parseMassCsv("usuario,senha,email\nadmin,123456,admin@email.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mass.columns).toEqual(["usuario", "senha", "email"]);
    expect(result.mass.rows).toEqual([
      { usuario: "admin", senha: "123456", email: "admin@email.com" },
    ]);
  });

  it("trims cells and ignores blank/CRLF lines", () => {
    const result = parseMassCsv(" a , b \r\n 1 , 2 \r\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mass.columns).toEqual(["a", "b"]);
    expect(result.mass.rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("supports multiple data rows", () => {
    const result = parseMassCsv("u,p\na,1\nb,2");
    expect(result.ok && result.mass.rows.length).toBe(2);
  });

  it("allows a header-only mass (no data rows yet)", () => {
    const result = parseMassCsv("usuario,senha");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mass.rows).toEqual([]);
  });

  it("rejects empty input", () => {
    const result = parseMassCsv("   \n  ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/empty/i);
  });

  it("rejects blank and duplicate column names", () => {
    expect(parseMassCsv("a,,b\n1,2,3").ok).toBe(false);
    const dup = parseMassCsv("a,a\n1,2");
    expect(dup.ok).toBe(false);
    if (dup.ok) return;
    expect(dup.errors[0]).toMatch(/duplicate/i);
  });

  it("rejects a row whose column count differs from the header", () => {
    const result = parseMassCsv("a,b,c\n1,2");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/line 2/i);
  });
});

describe("toVariableMap", () => {
  it("maps the first record to variable -> value (PRD §7 example)", () => {
    const result = parseMassCsv("usuario,senha\nadmin,123456");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(toVariableMap(result.mass)).toEqual({ usuario: "admin", senha: "123456" });
  });

  it("returns an empty map for a header-only mass", () => {
    const result = parseMassCsv("usuario,senha");
    expect(result.ok && toVariableMap(result.mass)).toEqual({});
  });
});
