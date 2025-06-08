@echo off
echo ExpenseFlow Pro - Starting Services...
echo.

REM Kill any existing Node processes
taskkill /f /im node.exe 2>nul || echo No Node processes to kill

REM Wait a moment
timeout /t 2 /nobreak >nul

echo Starting Backend on port 4001...
start "ExpenseFlow Backend" cmd /c "set PORT=4001 && node simple-server.js"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

echo Starting Frontend on port 4000...
cd frontend
start "ExpenseFlow Frontend" cmd /c "npm run dev -- --port 4000"

echo.
echo Services are starting...
echo Backend: http://localhost:4001
echo Frontend: http://localhost:4000
echo.
echo Wait a few seconds and then open http://localhost:4000 in your browser
echo.
pause 