# PRD — recrd-agile-testing

## 1. Visão Geral

**recrd-agile-testing** é uma aplicação desktop **local-first**, desenvolvida em **Electron + TypeScript + SQLite**, focada em ambientes corporativos com alta restrição de rede e segurança.

O objetivo da ferramenta é transformar **ações manuais de um usuário em um navegador sandboxado** (cliques, preenchimento de campos, navegações, esperas e validações) em **testes automatizados Robot Framework utilizando Python + Playwright**.

A filosofia central é:

* **YAGNI (You Aren't Gonna Need It)**: apenas funcionalidades necessárias ao fluxo de criação de testes.
* **Zero dependência de cloud**.
* **Tudo auditável localmente**.
* **Compatibilidade total com Windows corporativo**.
* **Integração com autenticação Windows (Active Directory/Kerberos)**.
* **Funcionar offline após instalação inicial**.
* **Experiência de criação de testes em poucos cliques**.

---

# 2. Objetivos do MVP

O MVP deve permitir:

* Criar projetos de testes.
* Importar massa de testes CSV.
* Gravar interações web.
* Organizar testes hierarquicamente.
* Executar testes.
* Visualizar logs.
* Gerar código Robot Framework + Playwright.
* Integrar com repositórios Robot existentes.
* Exportar os artefatos.

Não será implementado no MVP:

* Testes desktop.
* Testes mobile.
* Execução distribuída.
* Integração com pipelines CI/CD.
* Dashboard web.
* Banco centralizado.
* Sincronização entre usuários.

---

# 3. Stack Tecnológica

## Aplicação

| Camada       | Tecnologia                                      |
| ------------ | ----------------------------------------------- |
| Shell        | Electron                                        |
| UI           | React + TypeScript (renderer)                   |
| Processo     | Node.js + TypeScript (main process)             |
| Bundler      | Vite (renderer) / esbuild (main)                |
| Linguagem    | TypeScript (strict)                             |
| Banco local  | SQLite (via `better-sqlite3`)                   |
| ORM          | Drizzle ORM                                     |
| Arquivos     | JSON/YAML para export                           |
| Logging      | `electron-log`                                  |
| DI           | Injeção por construtor (container leve, opcional `tsyringe`) |
| Configuração | `electron-store` (settings.json)                |
| IPC          | Electron IPC com `contextIsolation` + preload   |

> O renderer **nunca** acessa Node, banco ou filesystem diretamente. Todo acesso passa pelo
> main process via canais IPC tipados, com `contextIsolation: true` e `nodeIntegration: false`.

---

## Automação

| Componente | Tecnologia      |
| ---------- | --------------- |
| Framework  | Robot Framework |
| Browser    | Playwright      |
| Linguagem  | Python          |
| Ambiente   | venv local      |

> A automação alvo (Robot Framework + Playwright + Python) permanece inalterada: ela é o
> **artefato gerado**, não a tecnologia da aplicação. O recrd orquestra o ambiente Python
> como um processo filho a partir do main process do Electron.

---

# 4. Arquitetura Local First

Cada instalação do recrd possui um diretório de dados do usuário, resolvido via
`app.getPath('userData')`. No Windows corporativo:

```
C:\Users\<user>\AppData\Roaming\recrd\
│
├── database.sqlite
├── logs/
│   ├── app.log
│   └── executions/
│
├── exports/
│
├── cache/
│
└── settings.json
```

Não existe servidor.

Todo o histórico pertence ao usuário Windows logado.

---

# 5. Autenticação

## Produção (Windows)

A aplicação utiliza o usuário do Windows:

Exemplo:

```
DOMAIN\jose.silva
```

Informações coletadas:

* Username.
* Nome completo.
* SID do usuário.
* Domínio.

Essas informações serão usadas para:

* Auditoria.
* Histórico de alterações.
* Logs de execução.

Não existe tela de login.

---

# Desenvolvimento Linux (Mock)

Como o desenvolvimento acontece em Linux, será criado um provedor de autenticação fake.

Interface:

```typescript
export interface UserContext {
  readonly username: string;
  readonly displayName: string;
  readonly domain: string;
  readonly sid: string;
}
```

Implementação Linux:

```typescript
export class MockUserContext implements UserContext {
  readonly username = "dev";
  readonly displayName = "Linux Developer";
  readonly domain = "LOCAL";
  readonly sid = "S-0-0-00-0000000000-0000000000-0000000000-0000";
}
```

---

# Estrutura para remover o mock

Arquivo:

```
src/main/infrastructure/auth/mock-user-context.ts
```

A seleção do provedor é feita por plataforma em um *factory* / registro de DI.

Antes (desenvolvimento Linux):

```typescript
container.register<UserContext>("UserContext", { useClass: MockUserContext });
```

Depois (produção Windows):

```typescript
container.register<UserContext>("UserContext", { useClass: WindowsUserContext });
```

Na prática, a seleção pode ser automática:

```typescript
const userContext: UserContext =
  process.platform === "win32"
    ? new WindowsUserContext()
    : new MockUserContext();
```

---

# Implementação WindowsUserContext

No Windows, os dados básicos vêm de `os.userInfo()`. Domínio e SID são obtidos consultando
o sistema (ex.: `whoami /user /fqdn` via processo filho, ou um *native addon* opcional). A
implementação fica isolada no projeto de infraestrutura e só é carregada quando
`process.platform === "win32"`.

Exemplo:

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

---

# 6. Modelo de Dados

## Projeto

Representa um conjunto de automações.

```
Projeto
 |
 +-- Plano de teste
       |
       +-- Suite
             |
             +-- Caso de teste
                    |
                    +-- Script manual
                    |
                    +-- Script compilado
                    |
                    +-- Execuções
```

---

## Entidades

### Projeto

```
- Id
- Nome
- Descrição
- CaminhoRobot
- CriadoPor
- CriadoEm
- AlteradoEm
```

---

### Plano de Teste

```
Id
ProjetoId
Nome
Descrição
```

---

### Suite

```
Id
PlanoId
Nome
```

---

### Caso de Teste

```
Id
SuiteId
Nome
Descrição
Status
```

---

### Script

Representação intermediária do teste.

Exemplo:

```json
[
 {
  "action": "click",
  "selector": "#login"
 },
 {
  "action": "input",
  "selector": "#email",
  "value": "{{usuario}}"
 }
]
```

---

### Execução

```
Id
CasoTesteId
Data
Resultado
Usuario
Log
Duração
```

---

# 7. Massa de Testes

Tela dedicada:

```
Massas
```

Suporte ao formato:

```
usuario,senha,email
admin,123456,admin@email.com
```

Regras:

* Quantidade N de colunas.
* Primeira linha é a variável.
* Segunda linha é o valor.
* Permitir editar valores.
* Permitir renomear massa.
* Histórico de importação.

Modelo:

```
Massa
 |
 +-- Variáveis
```

Exemplo interno:

```
usuario -> admin
senha -> 123456
```

---

# 8. Tela Inicial

Objetivo: permitir chegar a uma automação em até 3 cliques.

## Widgets

### Últimas execuções

Exemplo:

```
✔ Login Banco XYZ
Hoje 10:34
1min 20s
```

---

### Ações rápidas

Botões:

```
[ Novo Projeto ]

[ Gravar Novo Teste ]

[ Importar Massa ]

[ Abrir Último Projeto ]
```

---

# 9. Tela de Automação

A tela mais importante do produto.

Layout:

```
-------------------------------------------------
Header
-------------------------------------------------
Play | Pause | Stop | Reload | Exportar | Compilar
-------------------------------------------------

Sidebar              Browser Sandbox

Timeline             [ website ]
Massas
Propriedades
Toggles
Element Inspector
```

> O painel **Browser Sandbox** é renderizado por uma `BrowserView` (ou `<webview>`)
> dedicada do Electron, embutida na janela e controlada pelo main process.

---

# Header

## Play

Executa o script.

---

## Pause

Pausa execução.

---

## Stop

Interrompe imediatamente.

---

## Reload

Recarrega a página mantendo a sessão quando possível.

---

## Export

Exporta:

* Script manual JSON.
* Script Robot compilado.

---

## Compilar

Transforma:

```
ações do usuário
```

em:

```
Robot Framework + Playwright
```

---

# 10. Browser Sandbox

O browser é um ambiente controlado, implementado como uma `BrowserView` do Electron isolada
(`contextIsolation: true`, `nodeIntegration: false`) com um *content-script* injetado via
preload para instrumentar a página.

Deve permitir:

* Captura de cliques.
* Captura de teclado.
* Navegação.
* Captura de URLs.
* Identificação de elementos.

A captura ocorre no content-script da página e é enviada ao main process por IPC, que
persiste as ações no script manual.

Deve possuir um modo:

```
Inspect
```

Onde ao passar o mouse exibe:

```
Elemento:
<input>

ID:
login

Classes:
form-control

XPath:
...
```

---

# 11. Seletores Inteligentes

A geração de seletores deve seguir prioridade.

Ordem:

1. data-testid
2. aria-label
3. id
4. name
5. role
6. texto visível
7. CSS selector estável
8. XPath

Nunca gerar XPath absoluto.

---

Quando o seletor tiver baixa confiança:

Exemplo:

```
div:nth-child(5)
```

O usuário deve receber alerta:

```
⚠ Elemento com seletor instável.
Escolha um seletor alternativo.
```

---

# 12. Drag and Drop de Massa

Durante gravação:

O usuário pode arrastar:

```
usuario
```

para:

```
<input email>
```

O script será armazenado como:

```
{{usuario}}
```

e não:

```
admin
```

---

# 13. Pipeline de Compilação

Fluxo:

```
Script Manual
        |
        |
Validação de ações
        |
Análise de seletores
        |
Otimização
        |
Geração Robot
        |
Validação sintática
        |
Export
```

---

# 14. Integração com Repositórios Robot

Na criação do projeto:

Opções:

```
( ) Criar novo repositório

( ) Utilizar repositório existente
```

---

## Novo repositório

Estrutura padrão:

```
robot-project/
|
├── tests/
│   └── login.robot
|
├── resources/
|
├── variables/
|
├── data/
|
├── reports/
|
├── requirements.txt
|
└── .gitignore
```

---

# Configuração automática

O recrd deve verificar:

* Python instalado.
* venv existente.
* Robot instalado.
* Browser Playwright instalado.

Caso falte:

```
Instalar ambiente
```

com um clique.

> As verificações e instalações são executadas pelo main process via `child_process`
> (`execFile` / `spawn`), nunca pelo renderer.

---

# Git

Se existir:

```
.git
```

O aplicativo deve:

* Mostrar branch atual.
* Mostrar arquivos alterados.
* Permitir abrir o diff externo.

Não deve:

* Criar interface de Git complexa.
* Substituir GitHub Desktop ou Git.

> A leitura do estado do Git é feita via `git` CLI em processo filho (ou `simple-git`),
> em modo somente leitura para os dados exibidos.

---

# 15. Execução e Logs

Toda execução gera:

```
Execution
```

com:

* Usuário.
* Data.
* Duração.
* Resultado.
* Logs.

Exemplo:

```
10:35:01 Click login button

10:35:02 Input username

10:35:04 Assertion successful
```

> A execução do Robot Framework é um processo filho gerenciado pelo main process; o `stdout`
> é transmitido em streaming ao renderer por IPC para exibição em tempo real.

---

# 16. Auditoria

Todos os objetos devem possuir:

```
CreatedBy
CreatedAt
UpdatedBy
UpdatedAt
```

Eventos importantes:

* Importação de massa.
* Alteração de teste.
* Compilação.
* Exportação.
* Execução.

---

# 17. Exportações

Formatos:

## Script bruto

JSON:

```
login.recrd.json
```

---

## Script compilado

```
login.robot
```

---

## Logs

```
execution-2026-06-20.log
```

---

# 18. Requisitos Não Funcionais

## Performance

* Abrir aplicação em menos de 2 segundos.
* Executar sem internet.
* Suportar projetos com milhares de casos de teste.

---

## Segurança

* Nenhuma comunicação externa.
* Dados armazenados localmente.
* Logs não devem registrar senhas.
* `contextIsolation` habilitado e `nodeIntegration` desabilitado em todos os renderers.
* `webSecurity` habilitado; carregamento remoto restrito ao Browser Sandbox.

---

## Compatibilidade

Sistema suportado:

```
Windows 10
Windows 11
Windows Server 2019+
```

---

# 19. Fluxo ideal do usuário

Criar um teste novo:

```
Home

↓ (1 clique)

Novo Teste

↓ (1 clique)

Abrir Browser Sandbox

↓ (ações naturais)

Arrastar massa se necessário

↓ (1 clique)

Compilar

↓ (1 clique)

Executar
```

---

# 20. Decisões YAGNI

Para manter simplicidade, o MVP **não terá**:

* IA para gerar testes.
* Editor manual de Robot avançado.
* Editor visual de fluxos.
* Sistema de permissões.
* Banco remoto.
* Compartilhamento em tempo real.
* Marketplace de plugins.
* CI/CD integrado.

---

# 21. Visão final

O **recrd-agile-testing** deve se comportar como um **gravador corporativo de automações**:

> O analista testa manualmente uma vez, o recrd registra a intenção, transforma em um teste Robot Framework confiável, mantém a rastreabilidade da ação e permite que o resultado seja versionado em Git — tudo funcionando localmente, sem depender de serviços externos.

O MVP foca em fazer **uma única coisa extremamente bem: converter testes manuais web em automações Robot Framework estáveis e auditáveis**.

## 22. Engenharia de Software, TDD e Qualidade

O desenvolvimento do **recrd-agile-testing** deve seguir uma abordagem **test-first (TDD)** para garantir alta confiabilidade em um ambiente corporativo.

O objetivo é que regras de negócio, geração de scripts Robot Framework, manipulação de massas, validações e integrações sejam previsíveis e facilmente auditáveis.

### Filosofia de Desenvolvimento

O ciclo padrão de desenvolvimento será:

```
Red
 ↓
Escrever um teste que falha

Green
 ↓
Implementar o mínimo necessário para passar

Refactor
 ↓
Melhorar o código mantendo os testes passando
```

Não serão criadas funcionalidades sem antes existir um teste que defina seu comportamento esperado.

---

# 23. Estratégia de Testes

A pirâmide de testes deve seguir:

```
              E2E / UI Tests
                 ▲
                 |
         Integration Tests
                 ▲
                 |
            Unit Tests
```

Prioridade:

* Muitos testes unitários.
* Alguns testes de integração.
* Poucos testes de interface.

---

## Testes Unitários

Responsáveis por validar regras de negócio.

Exemplos:

* Conversão de ações manuais em comandos internos.
* Geração de código Robot Framework.
* Priorização de seletores.
* Validação de massas CSV.
* Regras de auditoria.
* Configuração de projetos.
* Tratamento de caminhos de arquivos.

Ferramentas:

* Vitest.
* `@testing-library/react` (componentes do renderer).
* Matchers nativos do Vitest / `expect`.

---

## Testes de Integração

Responsáveis por validar comunicação entre componentes.

Exemplos:

* SQLite funcionando corretamente.
* Repositórios (Drizzle).
* Exportação de arquivos.
* Integração com Git.
* Geração de estrutura de projetos Robot.
* Criação e ativação de venv Python.
* Execução de comandos do Playwright.

Deve ser utilizada uma base SQLite temporária (arquivo em diretório temporário ou `:memory:`) por teste.

---

## Testes de UI / E2E

Como testes de interface possuem alto custo de manutenção, serão usados com moderação.

A automação E2E do app Electron usa **Playwright** (driver de Electron), cobrindo apenas fluxos críticos:

* Abrir projeto.
* Criar teste.
* Importar massa.
* Iniciar gravação.
* Compilar script.
* Executar teste.

---

# 24. Estrutura do Projeto

Estrutura sugerida (monorepo simples por camadas, com TypeScript em todo o código):

```
recrd-agile-testing/
│
├── src/
│   │
│   ├── main/                  Processo principal Electron (Node)
│   │   ├── infrastructure/    SQLite (Drizzle), Git, Robot, Python, auth
│   │   └── ipc/               Handlers IPC tipados
│   │
│   ├── preload/               Bridge segura (contextBridge)
│   │
│   ├── renderer/              UI React + TypeScript
│   │
│   ├── domain/                Regras de negócio (puro, sem Electron/Node)
│   └── application/           Casos de uso (orquestração)
│
├── tests/
│   │
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── e2e/                   Playwright (Electron)
│
├── scripts/
│   ├── build.ts
│   ├── test.ts
│   └── release.ts
│
├── docs/
│   ├── WINDOWS_AUTH_SETUP.md
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
│
├── .editorconfig
├── .gitignore
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
└── package.json
```

> `domain` e `application` não importam nada de Electron nem do Node específico de plataforma,
> permanecendo 100% testáveis e multiplataforma.

---

# 25. CI/CD

O projeto deve possuir uma pipeline automatizada para garantir que todo instalador/executável gerado seja rastreável.

A pipeline deve executar:

```
Checkout
   |
Install dependencies (npm ci)
   |
Static Analysis (ESLint + tsc --noEmit)
   |
Run Unit Tests
   |
Run Integration Tests
   |
Build Release (Vite + esbuild)
   |
Package Electron app (electron-builder)
   |
Generate artifacts
```

---

## Validações obrigatórias

Um build será considerado válido somente se:

* Todos os testes passarem.
* `tsc --noEmit` não acusar erros e o ESLint não acusar erros.
* O empacotamento `electron-builder` concluir com sucesso.
* O executável iniciar corretamente em ambiente Windows de teste.

---

# 26. Build de Release

O produto será distribuído como um aplicativo Windows empacotado com **electron-builder**.

Publicação:

```bash
npm run build
npx electron-builder --win --x64
```

Alvos de empacotamento (`electron-builder.yml`):

* Instalador **NSIS** (`.exe`) e/ou versão **portable**.

Características:

* O runtime do Electron/Node é embutido no pacote — não depende de instalação prévia na máquina corporativa.
* Pode ser distribuído internamente via compartilhamento de rede, SCCM, Intune ou ferramenta equivalente.
* Mantém compatibilidade total com Windows.

---

# 27. Versionamento de Releases

Formato:

```
MAJOR.MINOR.PATCH
```

Exemplo:

```
1.3.5
```

Regras:

* MAJOR: alterações incompatíveis.
* MINOR: novas funcionalidades.
* PATCH: correções.

A versão é gerenciada pelo campo `version` do `package.json`.

Cada release deve gerar:

```
release/
│
├── recrd-agile-testing-setup-1.3.5.exe
├── CHANGELOG.md
├── SHA256SUM.txt
└── version.json
```

---

# 28. Scripts npm locais

O desenvolvedor deve conseguir realizar todas as operações sem depender da pipeline, de forma
multiplataforma (Linux/Windows). Os scripts são definidos em `package.json` e implementados
em TypeScript (executados via `tsx`/`node`).

## Testar solução

```bash
npm test
```

Fluxo:

```
tsc --noEmit
vitest run
```

---

## Build local

```bash
npm run build
```

Responsável por:

```
Install / verificar dependências
 ↓
Type-check + Lint
 ↓
Build Vite (renderer) + esbuild (main)
 ↓
Executar testes
 ↓
Gerar relatório
```

---

## Release local

```bash
npm run release
```

Responsável por:

```
Limpar diretórios anteriores
        |
Instalar dependências (npm ci)
        |
Executar todos os testes
        |
Empacotar Windows (electron-builder --win --x64)
        |
Gerar checksum SHA256
        |
Organizar pasta release/
```

---

# 29. Compatibilidade com ambiente Linux de desenvolvimento

O Electron roda em Linux, Windows e macOS, então o desenvolvimento é totalmente possível em Linux.
Apesar da distribuição final ser Windows-only, o código deve manter o isolamento de plataforma.

Regras:

* `domain` e `application` devem ser 100% multiplataforma.
* Testes unitários e de integração devem rodar em Linux.
* Infraestruturas dependentes de Windows devem utilizar abstrações (ex.: `UserContext`).
* `WindowsUserContext` só deve ser carregado quando `process.platform === "win32"`.
* O mock de autenticação (`MockUserContext`) deve ser utilizado no desenvolvimento Linux.
* O empacotamento final para Windows pode ser feito em uma etapa Windows da pipeline CI/CD
  (ou via cross-build do electron-builder, quando aplicável).

---

# 30. Reprodutibilidade e Auditoria de Build

Cada artefato gerado deve ser rastreável.

Metadados mínimos:

* Versão da aplicação.
* Data do build.
* Commit Git utilizado.
* Ambiente que gerou o build.

Exemplo:

```json
{
  "version": "1.0.0",
  "gitCommit": "a4f8d22",
  "buildDate": "2026-06-20T14:35:00Z",
  "target": "win-x64"
}
```

O `version.json` é gerado no momento do build e embutido no pacote. A tela **Sobre** do
aplicativo deve exibir essas informações para facilitar auditoria em ambientes corporativos.

---

# 31. Princípios de Engenharia Aplicados

O desenvolvimento do recrd deve seguir:

* **TDD** para comportamento.
* **SOLID** para arquitetura.
* **YAGNI** para evitar complexidade desnecessária.
* **KISS** para manter a experiência simples.
* **Clean Architecture** para isolamento das regras de negócio.
* **Dependency Injection** em toda a aplicação.
* **Fail Fast** para erros de configuração.
* **Observabilidade local** através de logs estruturados.

---

Com essa abordagem, o **recrd-agile-testing** mantém um ciclo de vida corporativo completo: **código testável em TypeScript, builds reproduzíveis, releases rastreáveis e distribuição simples via instalador Electron self-contained para Windows** — sem qualquer dependência de runtime externo na máquina do usuário.
