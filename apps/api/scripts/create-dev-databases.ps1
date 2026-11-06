# Creates the pa_app role and the dev and test databases on your local PostgreSQL 18,
# then writes apps/api/.env (git-ignored) with the matching connection string.
# Usage (from apps/api):  .\scripts\create-dev-databases.ps1
# psql asks for the postgres superuser password itself; this script never sees it.

$ErrorActionPreference = "Stop"
$api = Split-Path -Parent $PSScriptRoot
$secure = Read-Host "Choose a password for the new pa_app role" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

psql -U postgres -v app_password="$plain" -f "$PSScriptRoot\create-dev-databases.sql"
if ($LASTEXITCODE -ne 0) { throw "psql failed (exit code $LASTEXITCODE)" }

$envFile = Join-Path $api ".env"
if (Test-Path $envFile) {
  Write-Host "apps/api/.env already exists; leaving it unchanged. Make sure its DATABASE_URL uses the same password."
} else {
  $encoded = [Uri]::EscapeDataString($plain)
  $lines = @(
    "ENVIRONMENT=local",
    "DATABASE_URL=postgresql+asyncpg://pa_app:$encoded@localhost:5432/physics_anatomy_dev",
    "WEB_ORIGIN=http://localhost:3000"
  )
  # WriteAllLines writes UTF-8 without a byte-order mark, which .env readers expect.
  [IO.File]::WriteAllLines($envFile, [string[]]$lines)
  Write-Host "Wrote apps/api/.env (git-ignored)."
}
Write-Host "Done: role pa_app, databases physics_anatomy_dev and physics_anatomy_test, extensions citext and pg_trgm."
