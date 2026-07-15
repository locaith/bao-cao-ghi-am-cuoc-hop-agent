$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Push-Location $root
try {
  npm install
  if (-not (Test-Path (Join-Path $root ".env.local"))) {
    Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env.local")
  }
  Write-Host "Hop Xong frontend da san sang. Dien bien moi truong va chay npm run dev."
} finally {
  Pop-Location
}
