@echo off
title BLOOMBERG MARS // Risk Analytics Engine
echo =====================================================================
echo  BLOOMBERG MARS // Multi-Asset Risk Analytics Engine
echo =====================================================================

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%backend"

REM Check for virtual environment python or system python
if exist "%SCRIPT_DIR%backend\venv\Scripts\python.exe" (
    set PY_EXE="%SCRIPT_DIR%backend\venv\Scripts\python.exe"
) else (
    set PY_EXE=python
)

echo [1/2] Starting Backend API (FastAPI) on http://127.0.0.1:8000 ...
start "MARS Backend API" cmd /k "cd /d "%SCRIPT_DIR%backend" && %PY_EXE% run.py"

echo Waiting 3 seconds for Backend API to initialize...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend UI (React + Vite) on http://localhost:3000 ...
start "MARS Frontend UI" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

echo.
echo =====================================================================
echo  Services launched successfully!
echo  - Frontend Dashboard:  http://localhost:3000
echo  - Backend Swagger API: http://localhost:8000/docs
echo =====================================================================
