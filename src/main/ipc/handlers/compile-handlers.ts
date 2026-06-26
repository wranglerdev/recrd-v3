import type { CompileUseCases } from "../../../application/compile/compile-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `compile:*` IPC handler (PRD §13). Thin transport adapter: the
// channel maps to the compile-and-persist use case, resolved from the container
// at the composition root.
export function registerCompileHandlers(registry: IpcRegistry, useCases: CompileUseCases): void {
  registry.handle("compile:run", (request) => useCases.compileAndPersist(request));
}
