// @vitest-environment jsdom
import { fireEvent, render, renderHook, act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  IconButton,
  Input,
  Select,
  Panel,
  Toolbar,
  List,
  Tree,
  Tabs,
  Modal,
  Toast,
  ToastRegion,
  useToasts,
  Spinner,
  cx,
} from "@renderer/components/ui";

describe("cx", () => {
  it("joins truthy class values and drops falsy ones", () => {
    expect(cx("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("Button (PRD §8)", () => {
  it("defaults to type=button and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables and marks busy while loading", () => {
    render(<Button loading>Salvar</Button>);
    const button = screen.getByRole("button", { name: /salvar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("honours an explicit submit type", () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toHaveAttribute("type", "submit");
  });
});

describe("IconButton (PRD §8)", () => {
  it("exposes the label as the accessible name", () => {
    render(<IconButton label="Gravar" icon={<span>●</span>} />);
    expect(screen.getByRole("button", { name: "Gravar" })).toBeInTheDocument();
  });

  it("reflects the pressed toggle state", () => {
    render(<IconButton label="Pausar" icon="❚❚" pressed />);
    expect(screen.getByRole("button", { name: "Pausar" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Input (PRD §8)", () => {
  it("associates the label with the control", () => {
    render(<Input label="Nome" />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("marks invalid and links the error message", () => {
    render(<Input label="Nome" error="Obrigatório" />);
    const input = screen.getByLabelText("Nome");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Obrigatório");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });
});

describe("Select (PRD §8)", () => {
  it("renders options and is labelled", () => {
    render(
      <Select
        label="Ambiente"
        options={[
          { value: "dev", label: "Desenvolvimento" },
          { value: "prod", label: "Produção" },
        ]}
      />,
    );
    const select = screen.getByLabelText("Ambiente");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Produção" })).toBeInTheDocument();
  });
});

describe("Panel (PRD §8)", () => {
  it("labels the region by its title", () => {
    render(<Panel title="Detalhes">conteúdo</Panel>);
    expect(screen.getByRole("region", { name: "Detalhes" })).toBeInTheDocument();
  });

  it("renders header actions", () => {
    render(
      <Panel title="Detalhes" actions={<button type="button">Editar</button>}>
        x
      </Panel>,
    );
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });
});

describe("Toolbar (PRD §9)", () => {
  it("renders a labelled toolbar with a separator", () => {
    render(
      <Toolbar label="Controles">
        <button type="button">Play</button>
        <Toolbar.Separator />
        <button type="button">Stop</button>
      </Toolbar>,
    );
    expect(screen.getByRole("toolbar", { name: "Controles" })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("List (PRD §8)", () => {
  it("marks the selected interactive item with aria-current", () => {
    const onSelect = vi.fn();
    render(
      <List label="Casos">
        <List.Item selected onSelect={onSelect}>
          Caso 1
        </List.Item>
        <List.Item onSelect={onSelect}>Caso 2</List.Item>
      </List>,
    );
    const selected = screen.getByRole("button", { name: "Caso 1" });
    expect(selected).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: "Caso 2" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("Tree (PRD §6, §9)", () => {
  const nodes = [
    {
      id: "p1",
      label: "Projeto",
      defaultExpanded: true,
      children: [{ id: "s1", label: "Suite" }],
    },
  ];

  it("renders tree/treeitem roles and expansion state", () => {
    render(<Tree label="Hierarquia" nodes={nodes} />);
    expect(screen.getByRole("tree", { name: "Hierarquia" })).toBeInTheDocument();
    const project = screen.getByRole("treeitem", { name: /Projeto/ });
    expect(project).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Suite" })).toBeInTheDocument();
  });

  it("collapses on toggle and selects on click", () => {
    const onSelect = vi.fn();
    render(<Tree label="Hierarquia" nodes={nodes} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Projeto"));
    expect(screen.getByRole("treeitem", { name: /Projeto/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(onSelect).toHaveBeenCalledWith("p1");
  });
});

describe("Tabs (PRD §8, §11)", () => {
  const tabs = [
    { id: "a", label: "Logs", content: "conteúdo-logs" },
    { id: "b", label: "Erros", content: "conteúdo-erros" },
  ];

  it("shows the first tab by default and switches on click", () => {
    render(<Tabs label="Saída" tabs={tabs} />);
    expect(screen.getByRole("tab", { name: "Logs" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("conteúdo-logs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Erros" }));
    expect(screen.getByText("conteúdo-erros")).toBeInTheDocument();
  });

  it("moves selection with the arrow keys", () => {
    render(<Tabs label="Saída" tabs={tabs} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Logs" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Erros" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Modal (PRD §8)", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} title="Confirmar" onClose={vi.fn()}>
        corpo
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labelled modal dialog when open", () => {
    render(
      <Modal open title="Confirmar" onClose={vi.fn()}>
        corpo
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirmar" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and via the close button", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Confirmar" onClose={onClose}>
        corpo
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("Toast (PRD §8)", () => {
  it("uses status for info and alert for error", () => {
    const { rerender } = render(<Toast message="Salvo" tone="info" />);
    expect(screen.getByRole("status")).toHaveTextContent("Salvo");
    rerender(<Toast message="Falhou" tone="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
  });

  it("dismisses through the queue hook + region", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.show("Olá", "success");
    });
    expect(result.current.toasts).toHaveLength(1);

    const onDismiss = vi.fn();
    render(<ToastRegion toasts={result.current.toasts} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dispensar notificação" }));
    expect(onDismiss).toHaveBeenCalledWith(result.current.toasts[0]?.id);

    act(() => {
      result.current.dismiss(result.current.toasts[0]!.id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe("Spinner (PRD §8)", () => {
  it("exposes a status role with an accessible label", () => {
    render(<Spinner label="Compilando" />);
    expect(screen.getByRole("status")).toHaveTextContent("Compilando");
  });
});
