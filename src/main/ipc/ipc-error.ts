// IPC error handling at the boundary (PRD §18, §31). A handler failure must
// reach the renderer as a serialisable, friendly error — never as a raw stack or
// leaked internal — while the full detail is logged server-side (with the
// request redacted by the structured logger). This module defines the
// renderer-facing error and the message-normalisation used by `bindIpcMain`.

/** Generic fallback shown when a thrown value carries no usable message. */
export const GENERIC_IPC_MESSAGE = "Ocorreu um erro ao processar a solicitação.";

/**
 * The serialisable error thrown back across the IPC boundary. Electron clones
 * `name` and `message` to the renderer's rejected promise, so the renderer gets
 * a friendly message and can branch on the `IpcHandlerError` name.
 */
export class IpcHandlerError extends Error {
  /** The channel whose handler failed (useful for renderer-side diagnostics). */
  readonly channel: string;

  constructor(channel: string, message: string) {
    super(message);
    this.name = "IpcHandlerError";
    this.channel = channel;
  }
}

/**
 * Extracts a friendly, non-empty message from an unknown thrown value. Domain and
 * use-case errors already throw user-facing messages; anything without one (or a
 * non-Error throw) collapses to {@link GENERIC_IPC_MESSAGE}.
 */
export function friendlyMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return GENERIC_IPC_MESSAGE;
}

/** Normalises any thrown value into the renderer-facing {@link IpcHandlerError}. */
export function toIpcHandlerError(channel: string, error: unknown): IpcHandlerError {
  return new IpcHandlerError(channel, friendlyMessage(error));
}
