param(
  [string]$TargetRoot = 'C:\locaith\bao-cao-ghi-am-cuoc-hop-agent',
  [string]$RepositoryUrl = 'https://github.com/locaith/bao-cao-ghi-am-cuoc-hop-agent.git',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$targetParent = Split-Path -Parent $TargetRoot

if (-not (Test-Path -LiteralPath $targetParent)) {
  New-Item -ItemType Directory -Path $targetParent | Out-Null
}

if (-not (Test-Path -LiteralPath (Join-Path $TargetRoot '.git'))) {
  git clone --branch $Branch --single-branch $RepositoryUrl $TargetRoot
  if ($LASTEXITCODE -ne 0) { throw 'Không thể clone MemoAI production checkout.' }
} else {
  $dirty = git -C $TargetRoot status --porcelain
  if ($dirty) { throw "Production checkout có thay đổi chưa commit: $TargetRoot" }
  git -C $TargetRoot fetch origin $Branch
  git -C $TargetRoot checkout $Branch
  git -C $TargetRoot pull --ff-only origin $Branch
  if ($LASTEXITCODE -ne 0) { throw 'Không thể cập nhật MemoAI production checkout.' }
}

$backend = Join-Path $TargetRoot 'backend'
$python = Join-Path $backend '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
  py -3.11 -m venv (Join-Path $backend '.venv')
}
& $python -m pip install --disable-pip-version-check -r (Join-Path $backend 'requirements.txt')

$envFile = Join-Path $backend '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
  Copy-Item -LiteralPath (Join-Path $backend '.env.example') -Destination $envFile
  Write-Warning "Đã tạo $envFile. Hãy điền Google/Supabase secret trước khi restart_all.ps1."
}

Write-Host "MemoAI production checkout sẵn sàng tại $TargetRoot" -ForegroundColor Green
Write-Host 'Khởi động bằng C:\locaith\locaith-ai-v2\backend\restart_all.ps1' -ForegroundColor Green
