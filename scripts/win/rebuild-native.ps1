#Requires -Version 5.1
<#
.SYNOPSIS
  Switch better-sqlite3's native binary between the Node and Electron ABIs.

.DESCRIPTION
  better-sqlite3 ships a single compiled binary that matches exactly one
  NODE_MODULE_VERSION at a time. The Vitest unit suite runs under Node (ABI 115
  on Node 20); Electron 34 needs ABI 132. They cannot both be satisfied from one
  install, so the E2E and packaging flows must flip the ABI and the unit suite
  must flip it back. This script is the single, idempotent place that does it.

  Source compilation is avoided on purpose (Python 3.12 dropped distutils here);
  both paths use prebuild-install to fetch the matching prebuilt binary. We do NOT
  use `electron-builder install-app-deps` for the Electron side: @electron/rebuild
  reports success but leaves the Node-ABI binary in place (it never swaps in the
  Electron prebuilt), so the app still throws NODE_MODULE_VERSION 115 vs 132 at
  runtime. prebuild-install with an explicit --runtime/--target is deterministic.
  See issue electron-9ac.

.PARAMETER For
  'electron' -> fetch the Electron-ABI prebuilt (prebuild-install -r electron -t <ver>)
  'node'     -> restore the Node-ABI prebuilt    (prebuild-install)
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('node', 'electron')]
  [string]$For
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Push-Location (Join-Path $root 'node_modules\better-sqlite3')
try {
  if ($For -eq 'electron') {
    $electronVersion = (Get-Content (Join-Path $root 'node_modules\electron\package.json') -Raw |
      ConvertFrom-Json).version
    Write-Host "Fetching better-sqlite3 prebuilt for Electron $electronVersion (x64)..." -ForegroundColor Cyan
    & npx prebuild-install --runtime electron --target $electronVersion --arch x64
    if ($LASTEXITCODE -ne 0) { throw "prebuild-install (electron $electronVersion) failed (exit $LASTEXITCODE)" }
  }
  else {
    Write-Host 'Restoring better-sqlite3 prebuilt for Node ABI...' -ForegroundColor Cyan
    & npx prebuild-install
    if ($LASTEXITCODE -ne 0) { throw "prebuild-install (node) failed (exit $LASTEXITCODE)" }
  }
  Write-Host "Native ABI is now: $For" -ForegroundColor Green
}
finally { Pop-Location }
