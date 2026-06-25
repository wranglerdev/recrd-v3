// Reproducible-build metadata (PRD §30). Generated at build time into
// version.json and embedded in the package; the "Sobre" screen reads it for
// auditing. The type lives in `shared` because both the build script and the
// renderer consume it.

export type VersionInfo = {
  readonly version: string;
  readonly gitCommit: string;
  /** ISO-8601 build timestamp. */
  readonly buildDate: string;
  /** Packaging target, e.g. "win-x64". */
  readonly target: string;
};

/** Builds the version metadata, defaulting buildDate to now. */
export function createVersionInfo(params: {
  version: string;
  gitCommit: string;
  target: string;
  buildDate?: Date;
}): VersionInfo {
  return {
    version: params.version,
    gitCommit: params.gitCommit,
    buildDate: (params.buildDate ?? new Date()).toISOString(),
    target: params.target,
  };
}
