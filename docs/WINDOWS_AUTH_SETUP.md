# Autenticação Windows — recrd-agile-testing

A aplicação **não tem tela de login**. Em produção (Windows corporativo) ela usa o usuário
do Windows logado; no desenvolvimento Linux usa um provedor _mock_. Toda a lógica fica atrás
da abstração `UserContext`, mantendo `domain`/`application` multiplataforma (PRD §5, §29).

## Contrato

```typescript
export interface UserContext {
  readonly username: string;
  readonly displayName: string;
  readonly domain: string;
  readonly sid: string;
}
```

Esses dados alimentam **auditoria**, **histórico de alterações** e **logs de execução**
(`CreatedBy`/`UpdatedBy` — PRD §16).

## Seleção por plataforma

A escolha do provedor é feita no main process (factory / registro de DI), nunca no renderer:

```typescript
const userContext: UserContext =
  process.platform === "win32" ? new WindowsUserContext() : new MockUserContext();
```

`WindowsUserContext` **só** deve ser importado/carregado quando
`process.platform === "win32"`, para não acoplar o bundle de desenvolvimento Linux a APIs
do Windows.

## Desenvolvimento (Linux) — Mock

Arquivo: `src/main/infrastructure/auth/mock-user-context.ts`

```typescript
export class MockUserContext implements UserContext {
  readonly username = "dev";
  readonly displayName = "Linux Developer";
  readonly domain = "LOCAL";
  readonly sid = "S-0-0-00-0000000000-0000000000-0000000000-0000";
}
```

Nenhuma configuração adicional é necessária no Linux: o mock é selecionado automaticamente.

## Produção (Windows)

Os dados básicos vêm de `os.userInfo()`. Domínio e SID vêm da consulta ao sistema
(`whoami /user /fqdn` via `child_process`, ou um _native addon_ opcional). A implementação
fica isolada na infraestrutura e só carrega no Windows.

```typescript
import os from "node:os";
import { execFileSync } from "node:child_process";

export class WindowsUserContext implements UserContext {
  private readonly info = os.userInfo();
  private readonly whoami = execFileSync("whoami", ["/user", "/fqdn"], {
    encoding: "utf8",
  });

  get username(): string {
    return this.info.username;
  }

  get displayName(): string {
    return this.info.username;
  }

  get domain(): string {
    return process.env.USERDOMAIN ?? "LOCAL";
  }

  get sid(): string {
    // Extraído da saída de `whoami /user`.
    return parseSid(this.whoami);
  }
}
```

### Saída esperada de `whoami /user /fqdn`

```
USER INFORMATION
----------------
User Name        SID
================ ==============================================
domain\jose.silva S-1-5-21-1234567890-1234567890-1234567890-1001
```

O parser deve extrair o SID (`S-1-5-...`) da coluna correspondente, com tolerância a
variações de localidioma/whitespace. O username pode vir como `DOMAIN\user`.

## Como trocar o mock pela implementação Windows

A seleção já é automática por `process.platform`. Para um container de DI explícito
(ex.: `tsyringe`):

```typescript
// Antes (dev Linux):
container.register<UserContext>("UserContext", { useClass: MockUserContext });

// Depois (produção Windows):
container.register<UserContext>("UserContext", { useClass: WindowsUserContext });
```

## Segurança

- Os dados de usuário são usados apenas para auditoria local — **nenhuma comunicação
  externa** (PRD §18).
- Logs **não** registram senhas nem segredos.
- A execução de `whoami` usa `execFile` (sem shell) para evitar injeção.

## Plataformas suportadas (produção)

Windows 10, Windows 11, Windows Server 2019+.
