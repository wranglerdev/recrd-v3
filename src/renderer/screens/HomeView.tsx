import type { JSX } from "react";
import type { ProjectDto, RecentExecutionDto } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcAction, useIpcQuery } from "../state/index.js";
import { HomeScreen, type ExecutionSummary } from "./HomeScreen.js";

// Home container (PRD §8): binds the presentational HomeScreen to real data —
// the recent executions read from the database — and wires the quick actions to
// navigation and the active-project state. "Abrir último projeto" opens the most
// recently updated project for real. The bridge is absent outside Electron, so
// the executions query stays idle and the list renders empty.

export type HomeNavigation = {
  onNewProject: () => void;
  onRecordTest: () => void;
  onImportMass: () => void;
  /** Called after the last project is opened (e.g. to route to the explorer). */
  onOpenProject: () => void;
};

/** Formats an ISO timestamp as "YYYY-MM-DD HH:MM" for the recent-executions list. */
function formatWhen(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

/** Formats a duration in milliseconds as a compact seconds string. */
function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function toSummary(execution: RecentExecutionDto): ExecutionSummary {
  return {
    id: execution.id,
    name: execution.caseName,
    result: execution.result,
    when: formatWhen(execution.startedAt),
    duration: formatDuration(execution.durationMs),
  };
}

/** Picks the most recently updated project, or null when there are none. */
function latestProject(projects: readonly ProjectDto[]): ProjectDto | null {
  return projects.reduce<ProjectDto | null>(
    (latest, project) =>
      latest === null || project.updatedAt > latest.updatedAt ? project : latest,
    null,
  );
}

export function HomeView(props: HomeNavigation): JSX.Element {
  const bridge = useBridge();
  const { setActiveProject } = useActiveProject();

  const { data } = useIpcQuery<readonly RecentExecutionDto[]>(
    bridge === null ? null : () => bridge.listRecentExecutions({ limit: 10 }),
    [bridge],
  );

  const openLast = useIpcAction(async (): Promise<ProjectDto | null> => {
    if (bridge === null) {
      return null;
    }
    return latestProject(await bridge.listProjects());
  });

  const handleOpenLastProject = (): void => {
    void openLast.run().then((project) => {
      if (project !== null) {
        setActiveProject(project);
        props.onOpenProject();
      }
    });
  };

  return (
    <HomeScreen
      recentExecutions={(data ?? []).map(toSummary)}
      onNewProject={props.onNewProject}
      onRecordTest={props.onRecordTest}
      onImportMass={props.onImportMass}
      onOpenLastProject={handleOpenLastProject}
    />
  );
}
