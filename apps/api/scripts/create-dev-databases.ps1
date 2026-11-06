# Creates the pa_app role and the dev and test databases on your local PostgreSQL 18.
# Usage (from apps/api):  .\scripts\create-dev-databases.ps1
$password = Read-Host "Choose a password for the pa_app role" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
psql -U postgres -v app_password="$plain" -f "$PSScriptRoot\create-dev-databases.sql"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done. Put the same password in apps/api/.env (copy it from .env.example)."
}
