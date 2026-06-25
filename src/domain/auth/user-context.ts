// Identity of the OS user, used for auditing and execution logs (PRD §5, §16).
// This is a domain port: implementations live in main/infrastructure (Mock for
// Linux dev, Windows for production), selected by platform.
export interface UserContext {
  readonly username: string;
  readonly displayName: string;
  readonly domain: string;
  readonly sid: string;
}
