import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";

// Typed IPC registry — the routing brain shared by the Electron binding. Kept
// transport-agnostic so it is fully unit-testable: handlers are registered per
// channel and `dispatch` invokes them. Renderer code never reaches Node/db
// directly; it can only trigger a registered handler (PRD §3).

export type IpcHandler<C extends IpcChannel> = (
  request: IpcRequest<C>,
) => IpcResponse<C> | Promise<IpcResponse<C>>;

type AnyHandler = (request: unknown) => unknown;

export class IpcRegistry {
  private readonly handlers = new Map<IpcChannel, AnyHandler>();

  /** Registers a handler for a channel. Fails fast on duplicate registration. */
  handle<C extends IpcChannel>(channel: C, handler: IpcHandler<C>): this {
    if (this.handlers.has(channel)) {
      throw new Error(`IPC handler already registered for channel: ${channel}`);
    }
    this.handlers.set(channel, handler as AnyHandler);
    return this;
  }

  /** Returns true when a handler is registered for the channel. */
  has(channel: IpcChannel): boolean {
    return this.handlers.has(channel);
  }

  /** The channels with a registered handler. */
  channels(): IpcChannel[] {
    return [...this.handlers.keys()];
  }

  /** Invokes a channel's handler. Fails fast when no handler is registered. */
  async dispatch<C extends IpcChannel>(
    channel: C,
    request: IpcRequest<C>,
  ): Promise<IpcResponse<C>> {
    const handler = this.handlers.get(channel);
    if (handler === undefined) {
      throw new Error(`No IPC handler registered for channel: ${channel}`);
    }
    return (await handler(request)) as IpcResponse<C>;
  }
}
