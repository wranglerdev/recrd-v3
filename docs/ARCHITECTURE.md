# Arquitetura — recrd-agile-testing

Aplicação desktop **local-first** (Electron + TypeScript + SQLite) que transforma
ações manuais de um usuário em um navegador sandboxado em testes **Robot Framework +
Playwright**. Sem servidor, sem cloud, tudo auditável localmente. Ver `PRD.md` para o
detalhamento funcional; este documento descreve a arquitetura técnica.

## Princípios

- **Clean Architecture** — regras de negócio isoladas de Electron/Node.
- **TDD** — comportamento definido por testes antes da implementação (PRD §22).
- **SOLID / DI** — injeção por construtor; container leve (opcional `tsyringe`).
- **YAGNI / KISS** — apenas o necessário ao MVP.
- **Fail Fast** — erros de configuração falham cedo e de forma explícita.
- **Isolamento de plataforma** — `domain` e `application` são 100% multiplataforma.

## Camadas

```
src/
├── domain/        Regras de negócio puras (sem Electron/Node) — entidades, VOs, serviços
├── application/   Casos de uso / orquestração — depende apenas de domain
├── main/          Processo principal Electron (Node)
│   ├── infrastructure/  SQLite (Drizzle), Git, Robot, Python, auth
│   └── ipc/             Handlers IPC tipados
├── preload/       Bridge segura (contextBridge) main <-> renderer
└── renderer/      UI React + TypeScript
```

**Regra de dependência** (do interno para o externo): `renderer`/`main` → `application` →
`domain`. As camadas internas nunca importam as externas. `domain` e `application` não
importam Electron, `node:*`, banco ou logging — isso é **garantido pelo ESLint**
(`no-restricted-imports` em `eslint.config.js`) e pelos `tsconfig` por camada
(`types: []`, sem `lib` DOM/Node).

### TypeScript por camada

Cada camada tem seu próprio `tsconfig.json` (project references, `composite: true`),
estendendo `tsconfig.base.json` (modo `strict` + flags extras: `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, etc.). O `tsconfig.json` raiz é uma
solução que referencia todas as camadas; `tsconfig.tests.json` cobre `tests/` e `scripts/`.

- `domain` / `application`: `lib: ["ES2022"]`, `types: []` — nada de DOM/Node.
- `main` / `preload`: `types: ["node"]`.
- `renderer`: `lib` com DOM, `jsx: react-jsx`.

## Processos Electron & segurança

O renderer **nunca** acessa Node, banco ou filesystem diretamente. Todo acesso passa pelo
main process via canais **IPC tipados**, com:

- `contextIsolation: true`
- `nodeIntegration: false`
- `webSecurity: true`
- bridge mínima exposta via `contextBridge` no `preload`.

O **Browser Sandbox** (gravação de interações) é uma `BrowserView`/`<webview>` isolada,
instrumentada por um content-script injetado via preload. Carregamento remoto é restrito a
esse sandbox (PRD §10, §18).

Processos externos (Python/venv, Robot Framework, Playwright, `git`) são orquestrados pelo
**main process** via `child_process` (`execFile`/`spawn`), nunca pelo renderer. O `stdout`
de execuções é transmitido ao renderer por IPC em streaming (PRD §15).

## Persistência

- **SQLite** via `better-sqlite3` + **Drizzle ORM**, no diretório do usuário
  (`app.getPath('userData')`).
- `electron-store` para `settings.json`.
- `electron-log` para logs estruturados (logs nunca registram senhas — PRD §18).

```
%APPDATA%/recrd/
├── database.sqlite
├── logs/{app.log, executions/}
├── exports/
├── cache/
└── settings.json
```

## Autenticação

Sem tela de login. O contexto do usuário vem do SO via a abstração `UserContext`
(username, displayName, domain, sid). Seleção por plataforma:

- Windows → `WindowsUserContext` (`os.userInfo()` + `whoami /user /fqdn`).
- Linux (dev) → `MockUserContext`.

`WindowsUserContext` só é carregado quando `process.platform === "win32"`. Detalhes em
[`WINDOWS_AUTH_SETUP.md`](./WINDOWS_AUTH_SETUP.md).

## Build & bundling

- **renderer** → Vite (`vite.config.ts`, saída em `dist/renderer`).
- **main / preload** → esbuild (`scripts/build-main.ts`, bundle CJS, nativos externos).
- **empacotamento** → electron-builder (`electron-builder.yml`): NSIS + portable, x64,
  runtime embutido (self-contained para Windows corporativo).

Scripts npm (PRD §28): `npm test` (typecheck + Vitest); `npm run build` (typecheck, lint,
Vite, esbuild, testes); `npm run release` (limpa, `npm ci`, testes, empacota, checksum).

## Testes (pirâmide — PRD §23)

- **Unit** (Vitest): muitos — regras de domínio, geração de Robot, seletores, validação CSV.
- **Integration** (Vitest): repositórios Drizzle/SQLite (`:memory:`), exports, Git, Python.
- **E2E** (Playwright + driver Electron): poucos — fluxos críticos.

Localização: `tests/{domain,application,infrastructure,e2e}`.
