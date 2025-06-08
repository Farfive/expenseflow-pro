@echo off
echo ExpenseFlow Pro - Debug Mode Startup
echo =====================================
echo.

REM Kill any existing processes
echo Stopping existing Node processes...
taskkill /f /im node.exe 2>nul || echo No Node processes to kill
timeout /t 2 /nobreak >nul

REM Clear PORT environment variable
set PORT=

echo.
echo Starting Backend on port 4001...
echo ================================
start "Backend Debug" cmd /k "echo Starting Backend... && set PORT=4001 && node simple-server.js"

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo Starting Frontend on port 4000...
echo =================================
cd frontend
start "Frontend Debug" cmd /k "echo Starting Frontend... && npm run dev -- --port 4000"

echo.
echo Debug windows opened!
echo Backend: Check "Backend Debug" window
echo Frontend: Check "Frontend Debug" window
echo.
echo After both services start:
echo - Open http://localhost:4000 in browser
echo - Check console logs in debug windows
echo.

REM Test backend after delay
timeout /t 10 /nobreak >nul
echo Testing backend connection...
curl -s http://localhost:4001/api/health && echo Backend API is responding! || echo Backend API failed!

echo.
echo Press any key to continue monitoring...
pause 