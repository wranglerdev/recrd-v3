// Main process layer — Electron/Node host. Owns infrastructure (SQLite, Git,
// Robot, Python, auth) and typed IPC handlers. The Electron bootstrap
// (`main.ts`) and IPC wiring are added by the architecture epic.
export {};
