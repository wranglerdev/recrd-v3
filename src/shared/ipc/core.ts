// Generic, feature-agnostic primitives for the typed IPC boundary (PRD §3).
//
// These types know nothing about any specific channel — they describe the
// *shape* of a channel map and derive the request/response/invoke types from it.
// Each feature declares its own channel map (see ./app.ts and siblings) and the
// aggregate map in ../ipc-contract.ts composes them. No Node/Electron/DOM
// imports: the renderer can depend on this without reaching into the platform.

/** A single channel's wire contract: serialisable request in, response out. */
export interface ChannelDef {
  readonly request: unknown;
  readonly response: unknown;
}

/**
 * A feature's channel map. Keys follow the `recurso:acao` convention
 * (e.g. `project:create`, `mass:list`) so the channel namespace stays grouped
 * by domain resource.
 */
export type ChannelMap = Readonly<Record<string, ChannelDef>>;

/** The request wire type for a channel in a map. */
export type RequestOf<M extends ChannelMap, C extends keyof M> = M[C]["request"];

/** The response wire type for a channel in a map. */
export type ResponseOf<M extends ChannelMap, C extends keyof M> = M[C]["response"];

/**
 * The renderer-side invoker for a channel map: pick a channel, pass its typed
 * request, get back its typed response. Backed by `ipcRenderer.invoke` in the
 * preload and by the registry's `dispatch` in tests.
 */
export type Invoke<M extends ChannelMap> = <C extends keyof M & string>(
  channel: C,
  request: M[C]["request"],
) => Promise<M[C]["response"]>;

/**
 * Type-safe `as const` channel-name list builder. Asserts at the type level that
 * every name listed belongs to the map `M`, so the runtime list and the compile
 * time map cannot drift apart.
 */
export function defineChannelNames<
  M extends ChannelMap,
  const Names extends readonly (keyof M & string)[],
>(names: Names): Names {
  return names;
}
