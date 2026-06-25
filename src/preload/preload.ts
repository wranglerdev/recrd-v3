// Preload bridge — exposes a typed, minimal API to the renderer via
// contextBridge (contextIsolation: true, nodeIntegration: false). The renderer
// never touches Node, the database or the filesystem directly (PRD §3, §18).
// IPC channels are wired up by the architecture epic; intentionally empty now.
export {};
