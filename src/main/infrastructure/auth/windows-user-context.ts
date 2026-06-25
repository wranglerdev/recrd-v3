import { execFileSync } from "node:child_process";
import os from "node:os";
import type { UserContext } from "../../../domain/auth/user-context.js";
import { parseSidFromWhoami } from "./parse-whoami.js";

// Production user provider for Windows (PRD §5). Loaded only when
// process.platform === "win32" (see the factory) so node/Windows specifics never
// run on the Linux dev box. The pure SID parsing lives in parse-whoami.ts.
export class WindowsUserContext implements UserContext {
  private readonly info = os.userInfo();
  private readonly whoami = execFileSync("whoami", ["/user", "/fqdn"], { encoding: "utf8" });

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
    return parseSidFromWhoami(this.whoami);
  }
}
