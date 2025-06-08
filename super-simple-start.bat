@echo off
cls
echo ================================================
echo ExpenseFlow Pro - SUPER SIMPLE STARTUP
echo No complex features, fastest possible start
echo ================================================

echo.
echo [1/4] Killing any existing processes...
taskkill /F /IM node.exe 2>nul >nul

echo.
echo [2/4] Starting Backend (Simple Server)...
start "ExpenseFlow Backend" cmd /k "echo Starting Backend... && node simple-server.js"

echo.
echo [3/4] Waiting 5 seconds for backend...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Starting Frontend (Simple Mode)...
cd frontend

REM Backup original config and use simple one
if exist next.config.js (
    copy next.config.js next.config.backup.js >nul 2>&1
)
copy next.config.simple.js next.config.js >nul 2>&1

start "ExpenseFlow Frontend" cmd /k "echo Starting Simple Frontend... && set NEXT_TELEMETRY_DISABLED=1 && set TURBO_TELEMETRY_DISABLED=1 && npm run dev"

echo.
echo ================================================
echo SUPER SIMPLE STARTUP COMPLETE!
echo Backend: http://localhost:3002
echo Frontend: http://localhost:3000 (Simple Mode)
echo ================================================
echo.
echo Both services are starting in separate windows.
echo Check each window for status messages.
echo.
pause 