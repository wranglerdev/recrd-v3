import { useState, type JSX } from "react";
import type { ProjectDto, RecrdApi } from "../../shared/ipc-contract.js";
import {
  Button,
  EmptyState,
  Input,
  Page,
  StatusMessage,
  Tree,
  type TreeNode,
} from "../components/ui/index.js";
import { useActiveProject, useBridge, useIpcQuery } from "../state/index.js";

// Project Explorer (PRD §6, §9): a Project > Plan > Suite > Case tree wired to the
// hierarchy IPC channels and the global active-project state. Selecting a project
// makes it active; the context panel creates children, renames and deletes the
// selected node. The whole forest is loaded eagerly — a local-first tool has
// modest data — so the presentational Tree (which owns expand/collapse) needs no
// lazy-load hooks.

type NodeKind = "project" | "plan" | "suite" | "case";

interface NodeMeta {
  readonly kind: NodeKind;
  readonly name: string;
}

interface Forest {
  readonly nodes: readonly TreeNode[];
  readonly meta: ReadonlyMap<string, NodeMeta>;
  readonly projects: readonly ProjectDto[];
}

const KIND_LABEL: Record<NodeKind, string> = {
  project: "Projeto",
  plan: "Plano",
  suite: "Suíte",
  case: "Caso",
};

// The child a node of each kind can hold (a case is a leaf).
const CHILD_KIND: Partial<Record<NodeKind, NodeKind>> = {
  project: "plan",
  plan: "suite",
  suite: "case",
};

/** Loads the full Project>Plan>Suite>Case forest and an id→meta lookup. */
async function loadForest(bridge: RecrdApi): Promise<Forest> {
  const meta = new Map<string, NodeMeta>();
  const projects = await bridge.listProjects();

  const nodes = await Promise.all(
    projects.map(async (project): Promise<TreeNode> => {
      meta.set(project.id, { kind: "project", name: project.name });
      const plans = await bridge.listPlansByProject({ id: project.id });
      const planNodes = await Promise.all(
        plans.map(async (plan): Promise<TreeNode> => {
          meta.set(plan.id, { kind: "plan", name: plan.name });
          const suites = await bridge.listSuitesByPlan({ id: plan.id });
          const suiteNodes = await Promise.all(
            suites.map(async (suite): Promise<TreeNode> => {
              meta.set(suite.id, { kind: "suite", name: suite.name });
              const cases = await bridge.listCasesBySuite({ id: suite.id });
              const caseNodes = cases.map((testCase): TreeNode => {
                meta.set(testCase.id, { kind: "case", name: testCase.name });
                return { id: testCase.id, label: testCase.name };
              });
              return {
                id: suite.id,
                label: suite.name,
                children: caseNodes,
                defaultExpanded: true,
              };
            }),
          );
          return { id: plan.id, label: plan.name, children: suiteNodes, defaultExpanded: true };
        }),
      );
      return { id: project.id, label: project.name, children: planNodes, defaultExpanded: true };
    }),
  );

  return { nodes, meta, projects };
}

const CREATE_CHILD: Record<
  NodeKind,
  (bridge: RecrdApi, parentId: string, name: string) => Promise<unknown>
> = {
  project: (bridge, parentId, name) => bridge.createPlan({ projectId: parentId, name }),
  plan: (bridge, parentId, name) => bridge.createSuite({ planId: parentId, name }),
  suite: (bridge, parentId, name) => bridge.createCase({ suiteId: parentId, name }),
  case: () => Promise.resolve(),
};

const RENAME: Record<NodeKind, (bridge: RecrdApi, id: string, name: string) => Promise<unknown>> = {
  project: (bridge, id, name) => bridge.renameProject({ id, name }),
  plan: (bridge, id, name) => bridge.renamePlan({ id, name }),
  suite: (bridge, id, name) => bridge.renameSuite({ id, name }),
  case: (bridge, id, name) => bridge.renameCase({ id, name }),
};

const REMOVE: Record<NodeKind, (bridge: RecrdApi, id: string) => Promise<unknown>> = {
  project: (bridge, id) => bridge.removeProject({ id }),
  plan: (bridge, id) => bridge.removePlan({ id }),
  suite: (bridge, id) => bridge.removeSuite({ id }),
  case: (bridge, id) => bridge.removeCase({ id }),
};

export function ProjectExplorer(): JSX.Element {
  const bridge = useBridge();
  const { setActiveProject, setActiveCase } = useActiveProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, error, reload } = useIpcQuery<Forest>(
    bridge === null ? null : () => loadForest(bridge),
    [bridge],
  );

  const forest = data;
  const selectedMeta = selectedId !== null ? (forest?.meta.get(selectedId) ?? null) : null;

  const handleSelect = (id: string): void => {
    setSelectedId(id);
    const meta = forest?.meta.get(id);
    if (meta?.kind === "project") {
      setActiveProject(forest?.projects.find((project) => project.id === id) ?? null);
    }
    // Selecting a case makes it the run target (PRD §15); other kinds clear it.
    setActiveCase(meta?.kind === "case" ? { id, name: meta.name } : null);
  };

  // Runs a mutation against the bridge then refreshes the forest.
  const mutate = (run: (bridge: RecrdApi) => Promise<unknown>): void => {
    if (bridge === null) {
      return;
    }
    void run(bridge).then(() => reload());
  };

  return (
    <Page
      title="Projetos"
      label="Explorador de projetos"
      description="Organize Projetos, Planos, Suítes e Casos."
      className="project-explorer"
      actions={
        <NameForm
          label="Novo projeto"
          submitLabel="Criar projeto"
          onSubmit={(name) => mutate((b) => b.createProject({ name }))}
        />
      }
    >
      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}

      {forest !== null && forest.nodes.length === 0 ? (
        <EmptyState
          title="Nenhum projeto ainda."
          description="Crie o primeiro projeto para começar."
        />
      ) : (
        <Tree
          label="Hierarquia de projetos"
          nodes={forest?.nodes ?? []}
          {...(selectedId !== null ? { selectedId } : {})}
          onSelect={handleSelect}
        />
      )}

      {selectedMeta !== null && selectedId !== null && (
        <ContextPanel
          kind={selectedMeta.kind}
          name={selectedMeta.name}
          onCreateChild={(name) =>
            mutate((b) => CREATE_CHILD[selectedMeta.kind](b, selectedId, name))
          }
          onRename={(name) => mutate((b) => RENAME[selectedMeta.kind](b, selectedId, name))}
          onDelete={() => {
            if (
              window.confirm(`Excluir ${KIND_LABEL[selectedMeta.kind]} "${selectedMeta.name}"?`)
            ) {
              setSelectedId(null);
              mutate((b) => REMOVE[selectedMeta.kind](b, selectedId));
            }
          }}
        />
      )}
    </Page>
  );
}

function ContextPanel(props: {
  readonly kind: NodeKind;
  readonly name: string;
  onCreateChild: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}): JSX.Element {
  const childKind = CHILD_KIND[props.kind];
  return (
    <aside
      aria-label="Ações do item"
      className="rc-panel"
      data-testid="explorer-context"
      data-kind={props.kind}
    >
      <header className="rc-panel__header">
        <h2 className="rc-panel__title">
          {KIND_LABEL[props.kind]}: {props.name}
        </h2>
      </header>
      <div className="rc-panel__body project-explorer__context">
        <NameForm
          key={`rename-${props.name}`}
          label="Renomear"
          submitLabel="Renomear"
          initialValue={props.name}
          onSubmit={props.onRename}
        />

        {childKind !== undefined && (
          <NameForm
            label={`Novo ${KIND_LABEL[childKind]}`}
            submitLabel={`Adicionar ${KIND_LABEL[childKind]}`}
            onSubmit={props.onCreateChild}
          />
        )}

        <div className="rc-form__actions">
          <Button
            variant="secondary"
            data-testid="explorer-delete"
            onClick={props.onDelete}
          >
            Excluir
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NameForm(props: {
  readonly label: string;
  readonly submitLabel: string;
  readonly initialValue?: string;
  onSubmit: (name: string) => void;
}): JSX.Element {
  const [value, setValue] = useState(props.initialValue ?? "");
  return (
    <form
      className="rc-form"
      aria-label={props.label}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          props.onSubmit(trimmed);
          if (props.initialValue === undefined) {
            setValue("");
          }
        }
      }}
    >
      <Input
        label={props.label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="rc-form__actions">
        <Button type="submit" size="sm">
          {props.submitLabel}
        </Button>
      </div>
    </form>
  );
}
