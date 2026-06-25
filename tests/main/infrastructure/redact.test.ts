import { describe, expect, it } from "vitest";
import { redactSecrets } from "@main/infrastructure/logging/redact";

describe("redactSecrets", () => {
  it("masks sensitive keys in plain objects (PRD §18: logs never record passwords)", () => {
    const result = redactSecrets({
      username: "jose.silva",
      password: "hunter2",
      token: "abc123",
    }) as Record<string, unknown>;

    expect(result.username).toBe("jose.silva");
    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
  });

  it("matches sensitive keys case-insensitively and by substring", () => {
    const result = redactSecrets({
      Password: "x",
      apiSecret: "y",
      userSenha: "z",
    }) as Record<string, unknown>;

    expect(result.Password).toBe("[REDACTED]");
    expect(result.apiSecret).toBe("[REDACTED]");
    expect(result.userSenha).toBe("[REDACTED]");
  });

  it("redacts recursively through nested objects and arrays", () => {
    const result = redactSecrets({
      user: { name: "ada", auth: { password: "p" } },
      entries: [{ secret: "s" }],
    }) as { user: { name: string; auth: { password: string } }; entries: { secret: string }[] };

    expect(result.user.name).toBe("ada");
    expect(result.user.auth.password).toBe("[REDACTED]");
    expect(result.entries[0]?.secret).toBe("[REDACTED]");
  });

  it("masks an entire object held under a sensitive key", () => {
    const result = redactSecrets({ credentials: { user: "ada", password: "p" } }) as Record<
      string,
      unknown
    >;

    expect(result.credentials).toBe("[REDACTED]");
  });

  it("leaves primitives and non-sensitive data untouched", () => {
    expect(redactSecrets("hello")).toBe("hello");
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(null)).toBe(null);
  });

  it("does not mutate the input", () => {
    const input = { password: "secret" };
    redactSecrets(input);
    expect(input.password).toBe("secret");
  });
});
