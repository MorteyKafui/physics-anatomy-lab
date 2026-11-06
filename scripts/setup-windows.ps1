# Physics Anatomy: one-time setup on Windows.
# Run from the repository root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
#
# It installs every dependency, runs every check, creates the lockfiles, optionally creates the
# local PostgreSQL databases, and commits the lockfiles. Safe to run again.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$results = [ordered]@{}

function Step($name, [scriptblock]$action) {
  Write-Host ""
  Write-Host "== $name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $action
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit code $LASTEXITCODE" }
    $results[$name] = "ok"
    Write-Host "   ok" -ForegroundColor Green
  } catch {
    $results[$name] = "FAILED: $_"
    Write-Host "   failed: $_" -ForegroundColor Red
  }
  Set-Location $root
}

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Missing: $cmd. $hint" -ForegroundColor Yellow
    return $false
  }
  return $true
}

# 1. Tools
$ok = $true
$ok = (Need "git" "Install Git for Windows.") -and $ok
$ok = (Need "bun" "Install Bun: powershell -c `"irm bun.sh/install.ps1 | iex`"") -and $ok
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Write-Host "uv is not installed. Installing it now..." -ForegroundColor Yellow
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
}
$ok = (Need "uv" "Open a new PowerShell window and run this script again.") -and $ok
if (-not $ok) { exit 1 }
git config --global --add safe.directory ($root -replace '\\', '/')
Write-Host ("bun " + (bun --version) + " | " + (uv --version) + " | " + (git --version))

# 2. TypeScript workspaces
Step "bun install" { bun install }
Step "typecheck, lint and tests (TypeScript)" { bun run check }

# 3. API
Step "API: install (uv sync)" { Set-Location apps\api; uv sync }
Step "API: lint" { Set-Location apps\api; uv run ruff check . }
Step "API: formatting" { Set-Location apps\api; uv run ruff format --check . }
Step "API: types (pyright)" { Set-Location apps\api; uv run pyright }
Step "API: tests" { Set-Location apps\api; uv run pytest }

# 4. Physics validation
Step "validation: install" { Set-Location validation; uv sync }
Step "validation: tests" { Set-Location validation; uv run pytest }

# 5. Local databases (optional)
if (Get-Command psql -ErrorAction SilentlyContinue) {
  $answer = Read-Host "Create the local dev and test databases on PostgreSQL 18 now? (y/n)"
  if ($answer -eq "y") {
    Step "create databases" { Set-Location apps\api; & .\scripts\create-dev-databases.ps1 }
  }
} else {
  Write-Host ""
  Write-Host "psql is not on PATH, so the database step was skipped." -ForegroundColor Yellow
  Write-Host "Add your PostgreSQL 18 bin folder (usually C:\Program Files\PostgreSQL\18\bin) to PATH and run apps\api\scripts\create-dev-databases.ps1."
}

# 6. Commit the lockfiles
Step "commit lockfiles" {
  git add bun.lock apps/api/uv.lock validation/uv.lock
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m "chore: add lockfiles from the first install on Windows"
  } else {
    $global:LASTEXITCODE = 0
    Write-Host "   lockfiles already committed"
  }
}

Write-Host ""
Write-Host "Summary" -ForegroundColor Cyan
$results.GetEnumerator() | ForEach-Object { "{0,-42} {1}" -f $_.Key, $_.Value }
if ($results.Values -match "FAILED") {
  Write-Host ""
  Write-Host "Some steps failed. Copy this window's text into the chat and Claude will fix them." -ForegroundColor Yellow
  exit 1
}
Write-Host ""
Write-Host "All done. Start the apps with: bun run dev" -ForegroundColor Green
