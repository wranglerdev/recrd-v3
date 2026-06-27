# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ccf33ec3 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->



## Build & Test

```bash
npm install
npm test               # tsc --build + tsc -p tsconfig.tests.json + vitest run
npm run typecheck      # type-check every layer + tests/ + scripts/
npm run lint           # ESLint (incl. architecture-boundary rules)
npm run format:check   # Prettier check
npm run test:coverage  # Vitest + v8 coverage (100% gate on the included layers)
npm run dev            # Vite + Electron dev shell
npm run build          # typecheck + lint + Vite + esbuild + tests
npm run package        # electron-builder --win --x64 (NSIS + portable)
```

Before opening a PR, all of these must be green: `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test`.

### E2E (Playwright + Electron) — native-ABI caveat

`npm run test:e2e` builds the renderer + main (the `pretest:e2e` hook) and drives the
real app. `better-sqlite3` is a native module whose binary matches **one** Node ABI at a
time: the unit suite runs under Node (its prebuilt), while Electron needs its own ABI. So
they cannot both be green from a single install. To run E2E locally:

```bash
npx electron-builder install-app-deps           # rebuild better-sqlite3 for Electron
npx playwright test                             # run the E2E suite
(cd node_modules/better-sqlite3 && npx prebuild-install)   # restore Node ABI for unit tests
```

On Windows run the E2E suite from PowerShell/cmd, not Git Bash — the main process calls
`whoami /user`, which Git Bash shadows with MSYS coreutils. CI uses separate jobs (unit
under Node, E2E/package under the Electron rebuild). See issue `electron-9ac`.

## Architecture Overview

Local-first Electron + TypeScript desktop app that records a user's manual browser actions
(in an isolated sandbox) and compiles them to Robot Framework + Playwright tests — no
server, fully auditable on-device. Clean Architecture with a strict dependency rule:

```
src/domain/       pure business rules (no Electron/Node) — entities, selectors, capture, compiler
src/application/  use cases / orchestration — depends only on domain (ports as interfaces)
src/shared/       cross-process contracts — the typed IPC channel map + serialisable DTOs
src/main/         Electron main: di/ (composition root), infrastructure/ (SQLite, Git, Robot,
                  Python, auth, logging), ipc/ (typed registry + thin handlers), sandbox/
src/preload/      contextBridge bridges (createRecrdApi + event subscribe) and the sandbox
                  content-script (DOM capture → domain)
src/renderer/     React UI: screens/, components/, state/ (typed bridge + hooks)
```

Dependency rule: `renderer`/`main` → `application` → `domain`; inner layers never import
outer ones, and `domain`/`application`/`shared` never import Electron/`node:*`/db/logging
(enforced by ESLint `no-restricted-imports` and per-layer `tsconfig`). The renderer reaches
the main process **only** through the preload bridge over typed IPC (`contextIsolation`,
`nodeIntegration: false`, `webSecurity`). Full design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Conventions & Patterns

- **TDD, test-first** (PRD §22): write the failing test, then the minimum to pass, then
  refactor. The platform-agnostic layers (`domain`, `application`, `shared`, `main/ipc`,
  `main/app`, `main/di`, `main/infrastructure`) are held at **100% coverage**; Electron/DOM
  glue (`main.ts`, the sandbox view/preload, runners, dialogs, native adapters) is excluded
  from the gate and exercised by E2E instead. Keep pure logic out of the glue so it stays
  testable (e.g. `dom-descriptor`, `capture`, `selector-generator`).
- **Adding an IPC feature** is a fixed template: declare the DTOs + `<Feature>Channels` +
  `<Feature>Api`/`create<Feature>Api` in `src/shared/ipc/<feature>.ts`; add a thin
  transport handler in `src/main/ipc/handlers/`; register the use case (DI token in
  `src/main/di/tokens.ts`, wiring in `src/main/app/compose.ts`); compose it into
  `src/shared/ipc-contract.ts`. Domain objects with ISO-string audit fields serialise
  directly over IPC (no DTO mapping); the preload auto-exposes everything via `createRecrdApi`.
- **Main→renderer streaming** uses one-way event channels (`src/shared/ipc/events.ts`):
  the main process pushes via the event emitter / `webContents.send`, the preload exposes a
  typed `subscribe`, and the renderer consumes it through `useIpcEvent`.
- **Boundary mapping**: DB adapters in `src/main/infrastructure/db` map Drizzle rows ↔ domain
  (JSON-(de)serialising aggregate fields, ISO-string dates); no Drizzle/Node value reaches
  the renderer (guarded by `tests/shared/boundary-serialisation.test.ts`).
- **Style**: TypeScript `strict` (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  Prettier, ESLint flat config; 2-space indent, LF, UTF-8. Conventional, imperative commits.
- **Task tracking**: beads only (`bd`), never markdown TODOs — see the Beads section above.

Contributor guide: [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).
