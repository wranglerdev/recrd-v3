#Requires -Version 5.1
<#
.SYNOPSIS
  Run the Playwright + Electron E2E suite locally with the right native ABI,
  then restore the Node ABI so the unit suite stays runnable.

.DESCRIPTION
  Flips better-sqlite3 to Electron's ABI, builds the renderer + main and drives
  the real app via `npm run test:e2e`, and ALWAYS restores the Node ABI on the
  way out (pass -KeepElectronAbi to skip the restore, e.g. before packaging).
  See issues electron-9ac and electron-5n0.2.

.PARAMETER KeepElectronAbi
  Leave better-sqlite3 built for Electron after the run instead of restoring Node.
#>
[CmdletBinding()]
param(
  [switch]$KeepElectronAbi
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$rebuild = Join-Path $PSScriptRoot 'rebuild-native.ps1'

# The main process calls `whoami /user`; MSYS/Git Bash shadows it with a coreutils
# stub and bootstrap crashes. Refuse to run under Git Bash. See CLAUDE.md.
if ($env:MSYSTEM -or ($env:SHELL -and $env:SHELL -match 'bash')) {
  throw 'Run the E2E suite from PowerShell or cmd, not Git Bash (whoami shadowing).'
}

Push-Location $root
try {
  & $rebuild -For electron
  Write-Host 'Running Playwright E2E (Electron)...' -ForegroundColor Cyan
  & npm run test:e2e
  $exit = $LASTEXITCODE
}
finally {
  if (-not $KeepElectronAbi) { & $rebuild -For node }
  Pop-Location
}

if ($exit -ne 0) { exit $exit }
Write-Host 'E2E passed; Node ABI restored (unit suite is runnable).' -ForegroundColor Green
