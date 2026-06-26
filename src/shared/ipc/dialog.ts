import { defineChannelNames, type Invoke } from "./core.js";

// `dialog:*` feature contract — native file/folder pickers (PRD §14). Used by the
// New Project flow to choose where a Robot repository is scaffolded. The CSV file
// picker lives under the mass feature; this owns the directory picker.

export type DialogChannels = {
  "dialog:selectDirectory": { request: void; response: string | null };
};

export const DIALOG_CHANNELS = defineChannelNames<DialogChannels, ["dialog:selectDirectory"]>([
  "dialog:selectDirectory",
]);

/** The slice of the renderer API served by the dialog feature. */
export interface DialogApi {
  /** Opens the native folder picker; resolves the chosen path or null on cancel. */
  selectDirectory(): Promise<string | null>;
}

export function createDialogApi(invoke: Invoke<DialogChannels>): DialogApi {
  return {
    selectDirectory: () => invoke("dialog:selectDirectory", undefined),
  };
}
