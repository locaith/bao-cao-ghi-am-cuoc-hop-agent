$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$utf8 = [System.Text.UTF8Encoding]::new($false, $true)
$extensions = @(".ts", ".tsx", ".css", ".json", ".md", ".py", ".sql", ".ps1", ".example")
$excluded = @("node_modules", ".git", ".next", ".venv")
$bad = @()

Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
  $path = $_.FullName
  ($extensions -contains $_.Extension -or $_.Name.EndsWith(".env.example")) -and
  -not ($excluded | Where-Object { $path -like "*\$_\*" })
} | ForEach-Object {
  try { $null = $utf8.GetString([System.IO.File]::ReadAllBytes($_.FullName)) }
  catch { $bad += $_.FullName }
}

if ($bad.Count -gt 0) {
  $bad | ForEach-Object { Write-Error "UTF-8 khong hop le: $_" }
  exit 1
}
Write-Host "UTF-8 validation passed."
