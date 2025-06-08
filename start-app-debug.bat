@echo off
cls
echo ========================================
echo   ExpenseFlow Pro - Debug Startup
echo ========================================
echo.

REM Kill existing processes
echo Cleaning up existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend Server...
echo.
start "Backend" cmd /c "echo Backend Starting on Port 4001... && node simple-server.js && pause"

timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server...
echo.
start "Frontend" cmd /c "echo Frontend Starting on Port 4000... && cd frontend && npm run dev -- --port 4000 && pause"

timeout /t 10 /nobreak >nul

echo.
echo Checking server status...
netstat -an | findstr ":4000\|:4001"

echo.
echo Testing backend API...
curl -s http://localhost:4001/api/auth/me

echo.
echo Opening application...
start http://localhost:4000

echo.
echo Debug startup complete!
echo Check the Backend and Frontend windows for any error messages.
echo.
pause 