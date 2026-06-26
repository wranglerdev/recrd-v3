import type { ProjectUseCases } from "../project/project-service.js";

// Robot-project scaffolding use case (PRD §14). When a project is created with
// the "new repository" option, this creates the standard Robot project tree on
// disk and links it to the project by setting its robotPath (audited). Pure
// orchestration over injected ports: the on-disk scaffolder (infrastructure) and
// the Project use cases. No Node/Electron here.

/** Port over the on-disk Robot scaffolder; returns the created paths. */
export interface RobotScaffolder {
  create(root: string): string[];
}

export interface ScaffoldRobotProjectInput {
  readonly projectId: string;
  /** Absolute path of the directory to scaffold the Robot project into. */
  readonly root: string;
}

export interface ScaffoldRobotProjectResult {
  /** Absolute paths created on disk (directories + seed files). */
  readonly created: readonly string[];
  /** The robot path now linked to the project (equal to the input root). */
  readonly robotPath: string;
}

export interface RobotProjectUseCaseDeps {
  readonly scaffolder: RobotScaffolder;
  /** Only the project operations this use case needs. */
  readonly projects: Pick<ProjectUseCases, "open" | "updateDetails">;
}

export interface RobotProjectUseCases {
  scaffold(input: ScaffoldRobotProjectInput): ScaffoldRobotProjectResult;
}

export function createRobotProjectUseCases(deps: RobotProjectUseCaseDeps): RobotProjectUseCases {
  const { scaffolder, projects } = deps;
  return {
    scaffold(input) {
      // Fail fast if the project does not exist before touching the disk.
      projects.open(input.projectId);
      const created = scaffolder.create(input.root);
      projects.updateDetails(input.projectId, { robotPath: input.root });
      return { created, robotPath: input.root };
    },
  };
}
