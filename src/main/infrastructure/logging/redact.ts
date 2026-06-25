// Secret redaction for structured logs (PRD §18: "logs não devem registrar
// senhas"). Applied before any payload is handed to the logger transport.

const SENSITIVE_KEY_PATTERNS = ["password", "senha", "secret", "token", "credential", "apikey"];

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Returns a deep copy of `value` with sensitive fields masked. Primitives are
 * returned unchanged; the input is never mutated.
 */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = isSensitiveKey(key) ? REDACTED : redactSecrets(item);
    }
    return result;
  }
  return value;
}
