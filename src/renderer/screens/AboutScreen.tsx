import type { JSX } from "react";
import type { VersionInfo } from "../../shared/version-info.js";
import { useBridge, useIpcQuery } from "../state/index.js";

// "Sobre" screen (PRD §30): shows reproducible-build metadata read from the
// build's version.json via the bridge, for auditing/support. Outside Electron
// (or before the build emits version.json) the query degrades gracefully.

function formatBuildDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("pt-BR");
}

export function AboutScreen(): JSX.Element {
  const bridge = useBridge();
  const { data, loading, error } = useIpcQuery<VersionInfo>(
    bridge === null ? null : () => bridge.getVersionInfo(),
    [bridge],
  );

  return (
    <section aria-label="Sobre">
      <h2>Sobre</h2>
      <p>recrd-agile-testing — gravador corporativo de automações.</p>

      {loading ? <p>Carregando informações de versão…</p> : null}
      {error != null ? <p role="alert">{error}</p> : null}
      {data === null && !loading && error == null ? (
        <p>Metadados de versão indisponíveis.</p>
      ) : null}

      {data !== null ? (
        <dl>
          <dt>Versão</dt>
          <dd>{data.version}</dd>
          <dt>Commit</dt>
          <dd>{data.gitCommit}</dd>
          <dt>Data do build</dt>
          <dd>{formatBuildDate(data.buildDate)}</dd>
          <dt>Alvo</dt>
          <dd>{data.target}</dd>
        </dl>
      ) : null}
    </section>
  );
}
