$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Virtual environment not found. Run scripts/setup-backend.ps1 first."
}

Set-Location $backend
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

