// Standard Robot Framework project layout (PRD §14). Pure definition of the
// directories and seed files; the infrastructure layer writes them to disk.

export type RobotFile = {
  readonly path: string;
  readonly content: string;
};

export const ROBOT_PROJECT_DIRS = ["tests", "resources", "variables", "data", "reports"] as const;

const SAMPLE_TEST = `*** Settings ***
Library    Browser

*** Test Cases ***
Login
    New Page
    Go To    https://example.com
`;

const REQUIREMENTS = `robotframework
robotframework-browser
`;

const GITIGNORE = `.venv/
reports/
__pycache__/
*.pyc
`;

/** The seed files created in a new Robot project. */
export function robotProjectFiles(): RobotFile[] {
  return [
    { path: "tests/login.robot", content: SAMPLE_TEST },
    { path: "requirements.txt", content: REQUIREMENTS },
    { path: ".gitignore", content: GITIGNORE },
  ];
}

/** Paths that must exist for a directory to count as a Robot project. */
export function requiredRobotPaths(): string[] {
  return ["tests", "requirements.txt"];
}

/** Required paths missing from a set of existing entries (PRD §14, existing repo). */
export function missingRobotPaths(existing: Iterable<string>): string[] {
  const present = new Set(existing);
  return requiredRobotPaths().filter((path) => !present.has(path));
}
