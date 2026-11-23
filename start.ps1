# PowerShell Launcher for Bloomberg MARS Risk Analytics
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " BLOOMBERG MARS // Multi-Asset Risk Analytics Engine" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$pyExe = "python"
if (Test-Path "$scriptDir\backend\venv\Scripts\python.exe") {
    $pyExe = "$scriptDir\backend\venv\Scripts\python.exe"
}

Write-Host "[1/2] Starting Backend API (FastAPI) on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; & '$pyExe' run.py"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend UI (React + Vite) on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\frontend'; npm run dev"

Write-Host "`nAll services active!" -ForegroundColor Yellow
Write-Host "  Dashboard:  http://localhost:3000" -ForegroundColor White
Write-Host "  API Docs:   http://localhost:8000/docs`n" -ForegroundColor White
