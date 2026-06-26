// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaseExecutionHistory } from "@renderer/screens/CaseExecutionHistory";
import type { RecentExecutionDto, RecrdApi } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

const EXECUTION: RecentExecutionDto = {
  id: "e1",
  caseId: "c1",
  caseName: "Login",
  result: "passed",
  startedAt: "2026-06-26T10:00:00.000Z",
  durationMs: 1500,
};

describe("CaseExecutionHistory (PRD §8)", () => {
  it("lists the case's executions from the bridge", async () => {
    const listExecutionsByCase = vi.fn().mockResolvedValue([EXECUTION]);
    stubBridge({ listExecutionsByCase });
    render(<CaseExecutionHistory caseId="c1" />);

    await waitFor(() => expect(screen.getByText(/2026-06-26 10:00 \(1\.5s\)/)).toBeInTheDocument());
    expect(listExecutionsByCase).toHaveBeenCalledWith({ caseId: "c1" });
  });

  it("renders an empty state when there are no executions", async () => {
    stubBridge({ listExecutionsByCase: vi.fn().mockResolvedValue([]) });
    render(<CaseExecutionHistory caseId="c1" />);

    await waitFor(() =>
      expect(screen.getByText(/nenhuma execução para este caso/i)).toBeInTheDocument(),
    );
  });

  it("renders the empty state when the bridge is absent", () => {
    render(<CaseExecutionHistory caseId="c1" />);
    expect(screen.getByText(/nenhuma execução para este caso/i)).toBeInTheDocument();
  });

  it("re-fetches when the reloadKey changes", async () => {
    const listExecutionsByCase = vi.fn().mockResolvedValue([EXECUTION]);
    stubBridge({ listExecutionsByCase });
    const { rerender } = render(<CaseExecutionHistory caseId="c1" reloadKey={0} />);
    await waitFor(() => expect(listExecutionsByCase).toHaveBeenCalledTimes(1));

    rerender(<CaseExecutionHistory caseId="c1" reloadKey={1} />);
    await waitFor(() => expect(listExecutionsByCase).toHaveBeenCalledTimes(2));
  });
});
