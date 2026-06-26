import type { JSX } from "react";
import type { ProjectDto } from "../../shared/ipc-contract.js";
import { NewProjectForm, type NewProjectValues } from "../components/NewProjectForm.js";
import { useActiveProject, useBridge, useIpcAction } from "../state/index.js";

// Wired New Project flow (PRD §6, §14). Persists the project via IPC, and when
// "novo repo" is chosen, picks a folder and scaffolds the standard Robot tree
// (linking the project's robotPath). On success the new project becomes active
// and the caller navigates away. Presentation/validation stay in NewProjectForm.

export interface NewProjectScreenProps {
  /** Called once the project is created (and optionally scaffolded). */
  onCreated: () => void;
}

export function NewProjectScreen({ onCreated }: NewProjectScreenProps): JSX.Element {
  const bridge = useBridge();
  const { setActiveProject } = useActiveProject();

  const { run, loading, error } = useIpcAction(
    async (values: NewProjectValues): Promise<ProjectDto> => {
      if (bridge === null) {
        throw new Error("Recurso indisponível fora do aplicativo.");
      }
      const project = await bridge.createProject({
        name: values.name,
        description: values.description,
      });

      // "Novo repositório" scaffolds the Robot tree into a chosen folder and
      // links it to the project; a cancelled folder pick leaves it unlinked.
      if (values.repository === "new") {
        const root = await bridge.selectDirectory();
        if (root !== null) {
          const scaffolded = await bridge.scaffoldRobotProject({ projectId: project.id, root });
          return { ...project, robotPath: scaffolded.robotPath };
        }
      }
      return project;
    },
  );

  const handleSubmit = (values: NewProjectValues): void => {
    void run(values).then((project) => {
      if (project !== null) {
        setActiveProject(project);
        onCreated();
      }
    });
  };

  return <NewProjectForm onSubmit={handleSubmit} pending={loading} error={error} />;
}
