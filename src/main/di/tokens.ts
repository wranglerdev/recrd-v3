import type { UserContext } from "../../domain/auth/user-context.js";
import type { AppInfo } from "../../shared/ipc-contract.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import type { AppPaths } from "../infrastructure/paths/app-paths.js";
import { Token } from "./container.js";

// Injection tokens for the application's core services (PRD §3, §31). Concrete
// providers are registered at the composition root (see app/compose.ts).
export const AppPathsToken = new Token<AppPaths>("AppPaths");
export const LoggerToken = new Token<Logger>("Logger");
export const ConfigStoreToken = new Token<ConfigStore<AppSettings>>("ConfigStore");
export const AppInfoToken = new Token<AppInfo>("AppInfo");
export const UserContextToken = new Token<UserContext>("UserContext");
