@echo off
title ExpenseFlow Pro - Fix and Start
color 0A

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - FIX AND START
echo ==========================================
echo.

REM Force kill all Node processes
echo [1/6] Cleaning up all Node processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
timeout /t 3 /nobreak >nul

REM Clear any port conflicts
echo [2/6] Clearing port conflicts...
netsh interface portproxy delete v4tov4 listenport=3000 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=4000 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=4001 >nul 2>&1

REM Verify dependencies
echo [3/6] Verifying dependencies...
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install --silent
)
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install --silent
    cd ..
)

REM Start backend with explicit port
echo [4/6] Starting backend server on port 4001...
start "ExpenseFlow Backend" cmd /k "set PORT=4001 && set NODE_ENV=development && node simple-server.js"

REM Wait for backend to fully start
echo [5/6] Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

REM Verify backend is running
curl -s http://localhost:4001/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Backend failed to start on port 4001
    pause
    exit /b 1
)

REM Start frontend with explicit port
echo [6/6] Starting frontend server on port 4000...
cd frontend
start "ExpenseFlow Frontend" cmd /k "set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4001 && npm run dev"

REM Wait and open browser
timeout /t 10 /nobreak >nul
start http://localhost:4000

echo.
echo ==========================================
echo          STARTUP COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:4001/api/health
echo Frontend: http://localhost:4000
echo.
echo CONFIGURATION:
echo - Backend runs on port 4001
echo - Frontend runs on port 4000
echo - API calls proxied from frontend to backend
echo - CORS configured for cross-origin requests
echo.
echo TROUBLESHOOTING:
echo - If frontend shows connection errors, check backend logs
echo - If ports are in use, run this script again
echo - Use any email/password combination to login
echo.
echo Press any key to close this window...
pause >nul 