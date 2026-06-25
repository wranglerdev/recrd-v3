import type { UserContext } from "../../../domain/auth/user-context.js";

// Fake user provider for Linux development (PRD §5). Selected automatically off
// Windows; replaced by WindowsUserContext in production.
export class MockUserContext implements UserContext {
  readonly username = "dev";
  readonly displayName = "Linux Developer";
  readonly domain = "LOCAL";
  readonly sid = "S-0-0-00-0000000000-0000000000-0000000000-0000";
}
