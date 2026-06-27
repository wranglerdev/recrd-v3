#Requires -Version 5.1
<#
.SYNOPSIS
  Build and package the Windows distributables (NSIS installer + portable, x64)
  with electron-builder, then restore the Node ABI for the unit suite.

.DESCRIPTION
  Mirrors the `package` npm script with the guard rails the local Windows flow
  needs: a Developer-Mode preflight (electron-builder extracts winCodeSign's
  macOS .dylib symlinks, which need symlink-creation privilege — issue
  electron-ckd), artifact verification, and an automatic Node-ABI restore
  afterwards (electron-builder rebuilds better-sqlite3 for Electron during
  packaging — issue electron-9ac).

  CI's windows-latest runners are unaffected by the symlink limitation; this
  script only smooths the local path.

.PARAMETER KeepElectronAbi
  Leave better-sqlite3 built for Electron after packaging instead of restoring Node.

.PARAMETER SkipDevModeCheck
  Skip the Developer-Mode / elevation preflight.
#>
[CmdletBinding()]
param(
  [switch]$KeepElectronAbi,
  [switch]$SkipDevModeCheck
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$rebuild = Join-Path $PSScriptRoot 'rebuild-native.ps1'

function Test-DeveloperMode {
  $key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock'
  if (-not (Test-Path $key)) { return $false }
  return ((Get-ItemProperty -Path $key -ErrorAction SilentlyContinue).AllowDevelopmentWithoutDevLicense -eq 1)
}

function Test-Elevated {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not $SkipDevModeCheck -and -not (Test-DeveloperMode) -and -not (Test-Elevated)) {
  Write-Warning @'
Windows Developer Mode is OFF and this shell is not elevated.
electron-builder extracts winCodeSign's macOS .dylib symlinks, which need
symlink-creation privilege; without it NSIS/portable generation aborts with
"Cannot create symbolic link: ... privilege" (issue electron-ckd).

Fix one of:
  - Settings > System > For developers > Developer Mode = On  (no admin needed), or
  - run this script from an elevated PowerShell, or
  - rely on CI (windows-latest runners are unaffected).

Continuing: release/win-unpacked/*.exe is still produced; installers may not be.
'@
}

Push-Location $root
try {
  Write-Host 'Building renderer + main...' -ForegroundColor Cyan
  & npm run build:renderer; if ($LASTEXITCODE -ne 0) { throw "build:renderer failed (exit $LASTEXITCODE)" }
  & npm run build:main;     if ($LASTEXITCODE -ne 0) { throw "build:main failed (exit $LASTEXITCODE)" }

  Write-Host 'Packaging with electron-builder (--win --x64)...' -ForegroundColor Cyan
  $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'  # no signing cert locally
  & npx electron-builder --win --x64 --publish never
  $exit = $LASTEXITCODE

  $exes = @(Get-ChildItem -Path (Join-Path $root 'release') -Filter *.exe -ErrorAction SilentlyContinue)
  if ($exes.Count -gt 0) {
    Write-Host 'Artifacts in release/:' -ForegroundColor Green
    $exes | ForEach-Object { Write-Host "  $($_.Name)" }
  }
}
finally {
  if (-not $KeepElectronAbi) { & $rebuild -For node }
  Pop-Location
}

if ($exit -ne 0) { exit $exit }
Write-Host 'Package complete; Node ABI restored (unit suite is runnable).' -ForegroundColor Green
