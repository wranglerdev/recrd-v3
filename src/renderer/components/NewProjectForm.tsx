import { useState, type FormEvent, type JSX } from "react";
import { Button, Input, Page, StatusMessage, Textarea } from "./ui/index.js";

// Create/open a project with a Robot repository option (PRD §14). Presentational
// and controlled; submission (the IPC call) is delegated to the parent, which
// also drives the pending/error feedback shown here.

export type RepositoryOption = "new" | "existing";

export type NewProjectValues = {
  readonly name: string;
  readonly description: string;
  readonly repository: RepositoryOption;
};

export type NewProjectFormProps = {
  onSubmit: (values: NewProjectValues) => void;
  /** True while the parent is persisting; disables the submit to avoid double-submit. */
  readonly pending?: boolean;
  /** A friendly error from the last submit, shown above the actions. */
  readonly error?: string | null;
};

export function NewProjectForm(props: NewProjectFormProps): JSX.Element {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repository, setRepository] = useState<RepositoryOption>("new");
  const pending = props.pending ?? false;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (name.trim().length === 0 || pending) {
      return;
    }
    props.onSubmit({ name: name.trim(), description: description.trim(), repository });
  };

  return (
    <Page title="Novo Projeto" description="Crie um projeto e vincule um repositório Robot.">
      <form className="rc-form" onSubmit={handleSubmit} aria-label="Novo Projeto">
        <Input
          label="Nome"
          data-testid="new-project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          label="Descrição"
          data-testid="new-project-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <fieldset className="rc-fieldset">
          <legend className="rc-fieldset__legend">Repositório Robot</legend>
          <label className="rc-check">
            <input
              type="radio"
              name="repository"
              value="new"
              data-testid="new-project-repo-new"
              checked={repository === "new"}
              onChange={() => setRepository("new")}
            />
            Criar novo repositório
          </label>
          <label className="rc-check">
            <input
              type="radio"
              name="repository"
              value="existing"
              data-testid="new-project-repo-existing"
              checked={repository === "existing"}
              onChange={() => setRepository("existing")}
            />
            Utilizar repositório existente
          </label>
        </fieldset>
        {props.error != null && props.error.length > 0 ? (
          <StatusMessage tone="error">{props.error}</StatusMessage>
        ) : null}
        <div className="rc-form__actions">
          <Button
            type="submit"
            data-testid="new-project-submit"
            loading={pending}
            disabled={pending}
          >
            {pending ? "Criando…" : "Criar Projeto"}
          </Button>
        </div>
      </form>
    </Page>
  );
}
