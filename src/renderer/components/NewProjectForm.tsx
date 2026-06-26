import { useState, type FormEvent, type JSX } from "react";

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
    <form onSubmit={handleSubmit} aria-label="Novo Projeto">
      <label>
        Nome
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Descrição
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <fieldset>
        <legend>Repositório Robot</legend>
        <label>
          <input
            type="radio"
            name="repository"
            value="new"
            checked={repository === "new"}
            onChange={() => setRepository("new")}
          />
          Criar novo repositório
        </label>
        <label>
          <input
            type="radio"
            name="repository"
            value="existing"
            checked={repository === "existing"}
            onChange={() => setRepository("existing")}
          />
          Utilizar repositório existente
        </label>
      </fieldset>
      {props.error != null && props.error.length > 0 ? <p role="alert">{props.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar Projeto"}
      </button>
    </form>
  );
}
