// Syntactic validation of generated Robot Framework output before export
// (PRD §13). A lightweight structural check — full execution validity is the
// Robot runtime's job — guarding against a malformed generator result.

export type RobotValidation = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

export function validateRobotSyntax(robot: string): RobotValidation {
  const errors: string[] = [];

  if (!robot.includes("*** Settings ***")) {
    errors.push("Missing *** Settings *** section");
  }
  if (!/^Library\s+Browser/m.test(robot)) {
    errors.push("Missing 'Library    Browser' import");
  }

  const lines = robot.split("\n");
  const testCasesIndex = lines.findIndex((line) => line.trim() === "*** Test Cases ***");
  if (testCasesIndex < 0) {
    errors.push("Missing *** Test Cases *** section");
  }

  const afterTestCases = testCasesIndex < 0 ? [] : lines.slice(testCasesIndex + 1);
  const hasTestCase = afterTestCases.some(
    (line) => line.length > 0 && !line.startsWith(" ") && !line.startsWith("***"),
  );
  if (!hasTestCase) {
    errors.push("No test case defined under *** Test Cases ***");
  }

  return { valid: errors.length === 0, errors };
}
