// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordingControls } from "@renderer/screens/RecordingControls";

function handlers() {
  return { onStart: vi.fn(), onPause: vi.fn(), onResume: vi.fn(), onStop: vi.fn() };
}

describe("RecordingControls (PRD §10)", () => {
  it("offers Gravar when idle", () => {
    const h = handlers();
    render(<RecordingControls state="idle" {...h} />);
    expect(screen.getByText(/gravação: parada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gravar" }));
    expect(h.onStart).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Parar" })).not.toBeInTheDocument();
  });

  it("offers Pausar and Parar while recording", () => {
    const h = handlers();
    render(<RecordingControls state="recording" {...h} />);
    expect(screen.getByText(/gravando/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByRole("button", { name: "Parar" }));
    expect(h.onPause).toHaveBeenCalledOnce();
    expect(h.onStop).toHaveBeenCalledOnce();
  });

  it("offers Retomar and Parar while paused", () => {
    const h = handlers();
    render(<RecordingControls state="paused" {...h} />);
    expect(screen.getByText(/pausada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(h.onResume).toHaveBeenCalledOnce();
  });
});
