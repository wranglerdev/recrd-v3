import { useCallback, useEffect, useRef, useState } from "react";

// Centralised IPC call state (PRD §3, §9): a query hook that runs on mount and a
// callback hook for imperative actions, both tracking loading/error/data so the
// screens don't reimplement the same try/catch + useState dance. Errors are
// surfaced as friendly strings (the boundary already throws IpcHandlerError with
// a friendly message).

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: string | null;
  readonly loading: boolean;
}

const IDLE: AsyncState<never> = { status: "idle", data: null, error: null, loading: false };

/** Normalises a thrown value into a friendly message for display. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Erro inesperado.";
}

/**
 * Runs an async query on mount (and whenever `deps` change), tracking
 * loading/error/data. When `run` is null — e.g. the bridge is absent — the query
 * stays idle. Returns a `reload` to re-run on demand. Late resolutions after
 * unmount or a newer run are ignored.
 */
export function useIpcQuery<T>(
  run: (() => Promise<T>) | null,
  deps: readonly unknown[] = [],
): AsyncState<T> & { readonly reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>(IDLE);
  // Monotonic token so a stale resolution can't overwrite a newer one.
  const runId = useRef(0);

  const execute = useCallback(() => {
    if (run === null) {
      setState(IDLE);
      return;
    }
    const id = ++runId.current;
    setState({ status: "loading", data: null, error: null, loading: true });
    run()
      .then((data) => {
        if (id === runId.current) {
          setState({ status: "success", data, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (id === runId.current) {
          setState({ status: "error", data: null, error: errorMessage(error), loading: false });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
    return () => {
      // Invalidate any in-flight resolution on unmount/dep-change.
      runId.current += 1;
    };
  }, [execute]);

  return { ...state, reload: execute };
}

/**
 * Wraps an imperative async action (e.g. a button submit) with loading/error/data
 * state. `run` rejects-safely: it resolves to the value or null on failure, so the
 * caller can branch without a try/catch while `error` holds the message.
 */
export function useIpcAction<Args extends readonly unknown[], T>(
  action: (...args: Args) => Promise<T>,
): AsyncState<T> & { readonly run: (...args: Args) => Promise<T | null> } {
  const [state, setState] = useState<AsyncState<T>>(IDLE);
  const runId = useRef(0);

  const run = useCallback(
    async (...args: Args): Promise<T | null> => {
      const id = ++runId.current;
      setState({ status: "loading", data: null, error: null, loading: true });
      try {
        const data = await action(...args);
        if (id === runId.current) {
          setState({ status: "success", data, error: null, loading: false });
        }
        return data;
      } catch (error) {
        if (id === runId.current) {
          setState({ status: "error", data: null, error: errorMessage(error), loading: false });
        }
        return null;
      }
    },
    [action],
  );

  return { ...state, run };
}
