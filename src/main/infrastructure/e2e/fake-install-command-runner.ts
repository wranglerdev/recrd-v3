import type { StreamingCommandRunner } from "../../../application/environment/install-service.js";

// Deterministic install seam for E2E (electron-bzv.3). The real install runner
// spawns pip/playwright, which is slow and not guaranteed in CI, so main.ts
// injects this fake when RECRD_E2E_FAKE_RUNNER is set: it echoes a scripted
// progress line per command and resolves with a chosen exit code, letting the
// environment-install flow assert streamed progress + a done event without a real
// install. Production never constructs it.

export interface FakeInstallConfig {
  /** Exit code returned for every command (0 → install succeeds, non-zero → fails). */
  readonly exitCode: number;
}

/**
 * Builds a {@link StreamingCommandRunner} that emits a single deterministic line
 * acknowledging each command then resolves with the configured exit code. The
 * install use case stops at the first non-zero exit, so a non-zero code surfaces
 * as a failed install.
 */
export function createFakeInstallCommandRunner(config: FakeInstallConfig): StreamingCommandRunner {
  return (commandLine, _cwd, onLine) => {
    onLine(`[e2e] executando: ${commandLine}`);
    return Promise.resolve(config.exitCode);
  };
}
