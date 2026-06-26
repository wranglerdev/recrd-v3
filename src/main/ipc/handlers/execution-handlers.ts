import type { ExecutionUseCases } from "../../../application/execution/execution-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `execution:*` IPC handlers (PRD §8, §15). A thin transport
// adapter over the execution use cases, resolved from the container at the
// composition root. Read-only — executions are recorded by the runner.
export function registerExecutionHandlers(
  registry: IpcRegistry,
  useCases: ExecutionUseCases,
): void {
  registry.handle("execution:listRecent", (request) => useCases.listRecent(request.limit));
  registry.handle("execution:listByCase", (request) =>
    useCases.listByCase(request.caseId, request.limit),
  );
}
