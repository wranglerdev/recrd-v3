# Contribuindo — recrd-agile-testing

## Pré-requisitos

- **Node.js >= 20** e npm.
- Linux, macOS ou Windows. O desenvolvimento é totalmente suportado em **Linux**; a
  distribuição final é Windows-only (ver `WINDOWS_AUTH_SETUP.md`).
- Para empacotar (`npm run package`/`release`): toolchain do electron-builder.

## Setup

```bash
npm install
npm test          # typecheck + Vitest — confirma que o ambiente está saudável
```

## Scripts

| Comando                 | O que faz                                                   |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Ambiente de desenvolvimento (Vite + Electron)               |
| `npm test`              | `tsc --build` + `tsc -p tsconfig.tests.json` + `vitest run` |
| `npm run test:watch`    | Vitest em watch                                             |
| `npm run test:coverage` | Vitest com cobertura (v8)                                   |
| `npm run test:e2e`      | Playwright (driver Electron)                                |
| `npm run typecheck`     | Type-check de todas as camadas + testes                     |
| `npm run lint`          | ESLint (inclui regras de fronteira de arquitetura)          |
| `npm run lint:fix`      | ESLint com `--fix`                                          |
| `npm run format`        | Prettier `--write`                                          |
| `npm run build`         | Pipeline local: typecheck + lint + Vite + esbuild + testes  |
| `npm run package`       | electron-builder `--win --x64`                              |
| `npm run release`       | Release local (clean, `npm ci`, testes, empacota, checksum) |

## Fluxo de trabalho (TDD)

O projeto segue **test-first** (PRD §22). O ciclo é **Red → Green → Refactor**:

1. Escreva um teste que falha descrevendo o comportamento esperado.
2. Implemente o mínimo para passar.
3. Refatore mantendo os testes verdes.

Não crie funcionalidade sem antes existir um teste que defina seu comportamento.

## Regras de arquitetura (enforced)

- `src/domain` e `src/application` **não** podem importar Electron, `node:*`, banco,
  logging nem camadas externas. O ESLint falha o build se isso ocorrer
  (`no-restricted-imports`).
- Coloque acesso a banco/FS/processos em `src/main/infrastructure`.
- O renderer só fala com o main via IPC tipado pelo `preload`.
- Veja [`ARCHITECTURE.md`](./ARCHITECTURE.md) para o desenho completo das camadas.

## Estilo de código

- TypeScript `strict` (config em `tsconfig.base.json`).
- Formatação: **Prettier** (`.prettierrc.json`) — rode `npm run format` antes de commitar.
- Lint: **ESLint** flat config (`eslint.config.js`).
- `.editorconfig` define indentação (2 espaços), LF, UTF-8.

## Rastreamento de tarefas (beads)

Este projeto usa **bd (beads)** para issues — **não** use TODOs em markdown.

```bash
bd ready              # tarefas disponíveis
bd show <id>          # detalhes
bd update <id> --claim
bd close <id>
```

Crie a issue **antes** de escrever código e marque `in_progress` ao começar. Detalhes em
`CLAUDE.md` e via `bd prime`.

## Antes de abrir um PR

Garanta que tudo está verde:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## CI/CD

- **`.github/workflows/ci.yml`** roda em push para `main` e em PRs: `npm ci`, lint,
  type-check, `test:coverage` (gate de cobertura 100%), build (Vite + esbuild) e E2E
  (Playwright sob xvfb). Em push para `main`, o job `windows-package` empacota com
  electron-builder o instalador NSIS (`.exe`) e a versão portátil (`.exe`), x64, e
  publica os binários como artefatos do CI.
- **`.github/workflows/release.yml`** roda em tags `v*` (ou manualmente): empacota no
  Windows com electron-builder (NSIS + portable, x64), gera `version.json`,
  `SHA256SUM.txt` e `CHANGELOG.md` e publica os artefatos rastreáveis da release.

## Commits

`MAJOR.MINOR.PATCH` para releases (PRD §27), gerenciado pelo campo `version` do
`package.json`. Mensagens de commit claras e no imperativo.
