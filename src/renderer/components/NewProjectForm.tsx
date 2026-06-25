import { useState, type FormEvent, type JSX } from "react";

// Create/open a project with a Robot repository option (PRD §14). Presentational
// and controlled; submission is delegated to the parent.

export type RepositoryOption = "new" | "existing";

export type NewProjectValues = {
  readonly name: string;
  readonly repository: RepositoryOption;
};

export type NewProjectFormProps = {
  onSubmit: (values: NewProjectValues) => void;
};

export function NewProjectForm(props: NewProjectFormProps): JSX.Element {
  const [name, setName] = useState("");
  const [repository, setRepository] = useState<RepositoryOption>("new");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (name.trim().length === 0) {
      return;
    }
    props.onSubmit({ name: name.trim(), repository });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Novo Projeto">
      <label>
        Nome
        <input value={name} onChange={(event) => setName(event.target.value)} />
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
      <button type="submit">Criar Projeto</button>
    </form>
  );
}
