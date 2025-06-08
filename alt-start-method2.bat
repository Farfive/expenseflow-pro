@echo off
echo ================================================
echo ExpenseFlow Pro - Alternative Startup Method 2
echo Using Production-Like Settings
echo ================================================

echo.
echo [1/4] Setting environment variables...
set NODE_ENV=development
set NEXT_TELEMETRY_DISABLED=1
set TURBO_TELEMETRY_DISABLED=1

echo.
echo [2/4] Starting Backend with PM2-like approach...
start "Backend Production" cmd /k "cd /d %~dp0 && echo Starting ExpenseFlow Backend... && node simple-server.js"

echo.
echo [3/4] Waiting 4 seconds for backend...
timeout /t 4 /nobreak

echo.
echo [4/4] Starting Frontend with Build Mode...
cd frontend
start "Frontend Build" cmd /k "npm run build && npm start"

echo.
echo ================================================
echo Services starting with production-like settings!
echo This may take longer but will be more stable.
echo ================================================
pause 