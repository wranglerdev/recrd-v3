import { describe, expect, it } from "vitest";
import { MockUserContext } from "@main/infrastructure/auth/mock-user-context";
import { parseSidFromWhoami } from "@main/infrastructure/auth/parse-whoami";
import { createUserContext } from "@main/infrastructure/auth/user-context-factory";

describe("MockUserContext", () => {
  it("exposes the Linux dev identity (PRD §5)", () => {
    const ctx = new MockUserContext();
    expect(ctx.username).toBe("dev");
    expect(ctx.displayName).toBe("Linux Developer");
    expect(ctx.domain).toBe("LOCAL");
    expect(ctx.sid).toMatch(/^S-/);
  });
});

describe("parseSidFromWhoami", () => {
  it("extracts the SID from whoami /user output", () => {
    const output = [
      "USER INFORMATION",
      "----------------",
      "",
      "User Name          SID",
      "================== =============================================",
      "domain\\jose.silva S-1-5-21-1234567890-1234567890-1234567890-1001",
      "",
    ].join("\n");

    expect(parseSidFromWhoami(output)).toBe("S-1-5-21-1234567890-1234567890-1234567890-1001");
  });

  it("fails fast when no SID is present", () => {
    expect(() => parseSidFromWhoami("no sid here")).toThrowError(/could not find a sid/i);
  });
});

describe("createUserContext", () => {
  it("returns the mock provider off Windows", () => {
    expect(createUserContext("linux")).toBeInstanceOf(MockUserContext);
    expect(createUserContext("darwin")).toBeInstanceOf(MockUserContext);
  });
});
