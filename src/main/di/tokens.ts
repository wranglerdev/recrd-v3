import type {
  CaseUseCases,
  PlanUseCases,
  SuiteUseCases,
} from "../../application/hierarchy/hierarchy-service.js";
import type {
  CompileUseCases,
  RobotFileWriter,
} from "../../application/compile/compile-service.js";
import type { AuditTrail } from "../../application/audit/audit-service.js";
import type { ExecutionUseCases } from "../../application/execution/execution-service.js";
import type {
  InstallUseCases,
  StreamingCommandRunner,
} from "../../application/environment/install-service.js";
import type { MassUseCases } from "../../application/mass/mass-service.js";
import type { ProjectUseCases } from "../../application/project/project-service.js";
import type { RobotProjectUseCases } from "../../application/robot/robot-project-service.js";
import type { UserContext } from "../../domain/auth/user-context.js";
import type { AppInfo } from "../../shared/ipc-contract.js";
import type { VersionInfo } from "../../shared/version-info.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { DatabaseHandle } from "../infrastructure/db/connection.js";
import type { Repositories } from "../infrastructure/db/repositories.js";
import type { CsvFileDialog } from "../infrastructure/dialog/csv-file-dialog.js";
import type { DirectoryDialog } from "../infrastructure/dialog/directory-dialog.js";
import type { GitServiceFactory } from "../infrastructure/git/git-service.js";
import type { ExternalOpener } from "../infrastructure/shell/external-opener.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import type { AppPaths } from "../infrastructure/paths/app-paths.js";
import type { ToolRunner } from "../infrastructure/python/environment.js";
import type { RobotProjectService } from "../infrastructure/robot/robot-project.js";
import type { RobotRunner } from "../infrastructure/robot/robot-runner.js";
import type { SandboxViewFactory } from "../sandbox/sandbox-config.js";
import type { SettableIpcEventEmitter } from "../ipc/ipc-event-emitter.js";
import { Token } from "./container.js";

// Injection tokens for the application's services (PRD §3, §31). Concrete
// providers are registered at the composition root (see app/compose.ts).

// Core services (constructed by main.ts, injected as values).
export const AppPathsToken = new Token<AppPaths>("AppPaths");
export const LoggerToken = new Token<Logger>("Logger");
export const ConfigStoreToken = new Token<ConfigStore<AppSettings>>("ConfigStore");
export const AppInfoToken = new Token<AppInfo>("AppInfo");
export const VersionInfoToken = new Token<VersionInfo>("VersionInfo");
export const UserContextToken = new Token<UserContext>("UserContext");

// Infrastructure services (registered by registerInfrastructure).
export const DatabaseToken = new Token<DatabaseHandle>("DatabaseHandle");
export const RepositoriesToken = new Token<Repositories>("Repositories");
export const GitServiceFactoryToken = new Token<GitServiceFactory>("GitServiceFactory");
export const ToolRunnerToken = new Token<ToolRunner>("ToolRunner");
export const RobotProjectServiceToken = new Token<RobotProjectService>("RobotProjectService");
export const RobotRunnerToken = new Token<RobotRunner>("RobotRunner");
export const SandboxViewFactoryToken = new Token<SandboxViewFactory>("SandboxViewFactory");
export const CsvFileDialogToken = new Token<CsvFileDialog>("CsvFileDialog");
export const DirectoryDialogToken = new Token<DirectoryDialog>("DirectoryDialog");
export const ExternalOpenerToken = new Token<ExternalOpener>("ExternalOpener");
export const EventEmitterToken = new Token<SettableIpcEventEmitter>("EventEmitter");
export const InstallCommandRunnerToken = new Token<StreamingCommandRunner>("InstallCommandRunner");
export const RobotFileWriterToken = new Token<RobotFileWriter>("RobotFileWriter");
export const AuditTrailToken = new Token<AuditTrail>("AuditTrail");

// Application use cases (wired from infrastructure + core at the composition root).
export const ProjectUseCasesToken = new Token<ProjectUseCases>("ProjectUseCases");
export const RobotProjectUseCasesToken = new Token<RobotProjectUseCases>("RobotProjectUseCases");
export const MassUseCasesToken = new Token<MassUseCases>("MassUseCases");
export const CompileUseCasesToken = new Token<CompileUseCases>("CompileUseCases");
export const PlanUseCasesToken = new Token<PlanUseCases>("PlanUseCases");
export const SuiteUseCasesToken = new Token<SuiteUseCases>("SuiteUseCases");
export const CaseUseCasesToken = new Token<CaseUseCases>("CaseUseCases");
export const ExecutionUseCasesToken = new Token<ExecutionUseCases>("ExecutionUseCases");
export const InstallUseCasesToken = new Token<InstallUseCases>("InstallUseCases");
