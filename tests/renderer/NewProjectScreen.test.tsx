// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewProjectScreen } from "@renderer/screens/NewProjectScreen";
import { ActiveProjectProvider } from "@renderer/state";
import type { ProjectDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const PROJECT: ProjectDto = {
  id: "p1",
  name: "Banco",
  description: "desc",
  robotPath: null,
  createdBy: "jdoe",
  createdAt: "2026-06-26T00:00:00.000Z",
  updatedBy: "jdoe",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

function renderScreen(onCreated = vi.fn()) {
  render(
    <ActiveProjectProvider>
      <NewProjectScreen onCreated={onCreated} />
    </ActiveProjectProvider>,
  );
  return onCreated;
}

function fillAndSubmit(name: string, repository: "new" | "existing"): void {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: name } });
  if (repository === "existing") {
    fireEvent.click(screen.getByLabelText(/repositório existente/i));
  }
  fireEvent.click(screen.getByRole("button", { name: /criar projeto/i }));
}

describe("NewProjectScreen (PRD §6, §14)", () => {
  it("creates an existing-repo project via IPC and notifies the caller", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    const selectDirectory = vi.fn().mockResolvedValue(null);
    const scaffoldRobotProject = vi.fn();
    stubBridge({ createProject, selectDirectory, scaffoldRobotProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "existing");

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(createProject).toHaveBeenCalledWith({ name: "Banco", description: "" });
    // "Existing repo" must not scaffold a brand-new tree (that is the new-repo path).
    expect(scaffoldRobotProject).not.toHaveBeenCalled();
  });

  it("scaffolds a new repo: picks a folder and links the Robot path", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    const selectDirectory = vi.fn().mockResolvedValue("/repos/banco");
    const scaffoldRobotProject = vi
      .fn()
      .mockResolvedValue({ created: ["/repos/banco/tests"], robotPath: "/repos/banco" });
    stubBridge({ createProject, selectDirectory, scaffoldRobotProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "new");

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(selectDirectory).toHaveBeenCalled();
    expect(scaffoldRobotProject).toHaveBeenCalledWith({ projectId: "p1", root: "/repos/banco" });
  });

  it("links an existing repo: picks a folder and validates it via the bridge", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    const selectDirectory = vi.fn().mockResolvedValue("/repos/banco");
    const linkRobotProject = vi.fn().mockResolvedValue({ ok: true, robotPath: "/repos/banco" });
    stubBridge({ createProject, selectDirectory, linkRobotProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "existing");

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(selectDirectory).toHaveBeenCalled();
    expect(linkRobotProject).toHaveBeenCalledWith({ projectId: "p1", root: "/repos/banco" });
  });

  it("surfaces a validation error when the existing repo is invalid", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    const selectDirectory = vi.fn().mockResolvedValue("/repos/banco");
    const linkRobotProject = vi.fn().mockResolvedValue({ ok: false, missing: ["tests"] });
    stubBridge({ createProject, selectDirectory, linkRobotProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "existing");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/repositório robot inválido/i),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("leaves the project unlinked when the existing-repo folder pick is cancelled", async () => {
    const createProject = vi.fn().mockResolvedValue(PROJECT);
    const selectDirectory = vi.fn().mockResolvedValue(null);
    const linkRobotProject = vi.fn();
    stubBridge({ createProject, selectDirectory, linkRobotProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "existing");

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(linkRobotProject).not.toHaveBeenCalled();
  });

  it("shows the error and does not notify the caller when creation fails", async () => {
    const createProject = vi.fn().mockRejectedValue(new Error("Nome já existe"));
    stubBridge({ createProject });
    const onCreated = renderScreen();

    fillAndSubmit("Banco", "existing");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nome já existe"));
    expect(onCreated).not.toHaveBeenCalled();
  });
});
