import { createContext, useContext, useMemo, useState, type JSX, type ReactNode } from "react";
import type { ProjectDto } from "../../shared/ipc-contract.js";

// Global selection state (PRD §6, §8): the active Project drives which plans,
// suites, cases and masses the screens load. Kept in a React context so the
// sidebar/explorer and the feature screens share one source of truth without
// prop-drilling.

export interface ActiveProjectContextValue {
  readonly activeProject: ProjectDto | null;
  readonly setActiveProject: (project: ProjectDto | null) => void;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }): JSX.Element {
  const [activeProject, setActiveProject] = useState<ProjectDto | null>(null);
  const value = useMemo<ActiveProjectContextValue>(
    () => ({ activeProject, setActiveProject }),
    [activeProject],
  );
  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}

/** Reads the active-project context; throws if used outside its provider. */
export function useActiveProject(): ActiveProjectContextValue {
  const context = useContext(ActiveProjectContext);
  if (context === null) {
    throw new Error("useActiveProject precisa estar dentro de um ActiveProjectProvider");
  }
  return context;
}
