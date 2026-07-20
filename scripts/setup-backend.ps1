$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$venv = Join-Path $backend ".venv"

if (-not (Test-Path -LiteralPath $venv)) {
    python -m venv $venv
}

$python = Join-Path $venv "Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install -r (Join-Path $backend "requirements-dev.txt")
& $python -m pytest (Join-Path $backend "tests") -q

Write-Host "Backend ready. Start it with: .\scripts\start-backend.ps1"

