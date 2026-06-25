import type { UserContext } from "../../../domain/auth/user-context.js";
import { MockUserContext } from "./mock-user-context.js";
import { WindowsUserContext } from "./windows-user-context.js";

// Platform selection of the UserContext provider (PRD §5, §29): Windows in
// production, Mock everywhere else. Kept as thin glue and excluded from the unit
// coverage gate (the win32 branch is exercised by E2E/Windows CI).
export function createUserContext(platform: NodeJS.Platform = process.platform): UserContext {
  return platform === "win32" ? new WindowsUserContext() : new MockUserContext();
}
