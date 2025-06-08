@echo off
echo ================================================
echo ExpenseFlow Pro - Alternative Startup Method 1
echo Starting Backend First, Then Frontend
echo ================================================

echo.
echo [1/3] Starting Backend Server on Port 3002...
start "Backend Server" cmd /k "cd /d %~dp0 && node simple-server.js"

echo.
echo [2/3] Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak

echo.
echo [3/3] Starting Frontend with Dev Server...
cd frontend
start "Frontend Dev" cmd /k "npm run dev"

echo.
echo ================================================
echo Both services starting in separate windows!
echo Backend: http://localhost:3002
echo Frontend: http://localhost:3000
echo ================================================
echo.
echo Close this window when done testing.
pause 