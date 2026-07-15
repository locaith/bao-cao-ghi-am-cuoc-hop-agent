$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

Push-Location $root
try {
  npm install
  if (-not (Test-Path $python)) {
    py -3.11 -m venv (Join-Path $backend ".venv")
  }
  & $python -m pip install --disable-pip-version-check -r (Join-Path $backend "requirements.txt")
  if (-not (Test-Path (Join-Path $root ".env.local"))) {
    Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env.local")
  }
  if (-not (Test-Path (Join-Path $backend ".env"))) {
    Copy-Item (Join-Path $backend ".env.example") (Join-Path $backend ".env")
  }
  Write-Host "MemoAI đã sẵn sàng. Điền API vào .env.local và backend/.env, sau đó chạy scripts/start-backend.ps1 và npm run dev."
} finally {
  Pop-Location
}
