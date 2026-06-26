import { describe, expect, it, vi } from "vitest";
import {
  createRobotProjectUseCases,
  type RobotInspection,
  type RobotInspector,
  type RobotScaffolder,
} from "../../src/application/robot/robot-project-service";
import type { ProjectUseCases } from "../../src/application/project/project-service";

function fakeScaffolder(created: string[]): RobotScaffolder {
  return { create: vi.fn(() => created) };
}

function fakeInspector(inspection: RobotInspection): RobotInspector {
  return { inspect: vi.fn(() => inspection) };
}

function fakeProjects(): Pick<ProjectUseCases, "open" | "updateDetails"> {
  return {
    open: vi.fn(),
    updateDetails: vi.fn(),
  } as unknown as Pick<ProjectUseCases, "open" | "updateDetails">;
}

describe("createRobotProjectUseCases.scaffold (PRD §14)", () => {
  it("verifies the project, scaffolds on disk, then links the robot path", () => {
    const created = ["/repo", "/repo/tests", "/repo/resources/keywords.resource"];
    const scaffolder = fakeScaffolder(created);
    const projects = fakeProjects();
    const useCases = createRobotProjectUseCases({
      scaffolder,
      inspector: fakeInspector({ valid: true, missing: [] }),
      projects,
    });

    const result = useCases.scaffold({ projectId: "p1", root: "/repo" });

    expect(result).toEqual({ created, robotPath: "/repo" });
    expect(projects.open).toHaveBeenCalledWith("p1");
    expect(scaffolder.create).toHaveBeenCalledWith("/repo");
    expect(projects.updateDetails).toHaveBeenCalledWith("p1", { robotPath: "/repo" });
  });

  it("fails fast before touching disk when the project does not exist", () => {
    const scaffolder = fakeScaffolder([]);
    const projects = fakeProjects();
    (projects.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("not found");
    });
    const useCases = createRobotProjectUseCases({
      scaffolder,
      inspector: fakeInspector({ valid: true, missing: [] }),
      projects,
    });

    expect(() => useCases.scaffold({ projectId: "missing", root: "/repo" })).toThrow("not found");
    expect(scaffolder.create).not.toHaveBeenCalled();
    expect(projects.updateDetails).not.toHaveBeenCalled();
  });
});

describe("createRobotProjectUseCases.linkExisting (PRD §14)", () => {
  it("links a valid existing Robot repo to the project", () => {
    const projects = fakeProjects();
    const inspector = fakeInspector({ valid: true, missing: [] });
    const useCases = createRobotProjectUseCases({
      scaffolder: fakeScaffolder([]),
      inspector,
      projects,
    });

    const result = useCases.linkExisting({ projectId: "p1", root: "/repo" });

    expect(result).toEqual({ ok: true, robotPath: "/repo" });
    expect(projects.open).toHaveBeenCalledWith("p1");
    expect(inspector.inspect).toHaveBeenCalledWith("/repo");
    expect(projects.updateDetails).toHaveBeenCalledWith("p1", { robotPath: "/repo" });
  });

  it("reports the missing paths and does not link an invalid folder", () => {
    const projects = fakeProjects();
    const useCases = createRobotProjectUseCases({
      scaffolder: fakeScaffolder([]),
      inspector: fakeInspector({ valid: false, missing: ["tests", "resources"] }),
      projects,
    });

    const result = useCases.linkExisting({ projectId: "p1", root: "/repo" });

    expect(result).toEqual({ ok: false, missing: ["tests", "resources"] });
    expect(projects.updateDetails).not.toHaveBeenCalled();
  });

  it("fails fast before inspecting when the project does not exist", () => {
    const projects = fakeProjects();
    const inspector = fakeInspector({ valid: true, missing: [] });
    (projects.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("not found");
    });
    const useCases = createRobotProjectUseCases({
      scaffolder: fakeScaffolder([]),
      inspector,
      projects,
    });

    expect(() => useCases.linkExisting({ projectId: "missing", root: "/repo" })).toThrow(
      "not found",
    );
    expect(inspector.inspect).not.toHaveBeenCalled();
    expect(projects.updateDetails).not.toHaveBeenCalled();
  });
});
