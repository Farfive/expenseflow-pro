@echo off
title ExpenseFlow Pro - Unified Startup
color 0A

echo ==========================================
echo     EXPENSEFLOW PRO - UNIFIED STARTUP
echo ==========================================
echo.

:: Set Node.js paths
set NODE_EXE=C:\Program Files\nodejs\node.exe
set NPM_EXE=C:\Program Files\nodejs\npm.exe

:: Set environment variables to prevent blocking
set NODE_ENV=development
set PORT=3002
set NEXT_PUBLIC_API_URL=http://localhost:3002
set NEXT_PUBLIC_APP_URL=http://localhost:3000

:: Verify Node.js
if not exist "%NODE_EXE%" (
    echo ERROR: Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Cleaning up existing processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
timeout /t 2 >nul

echo [2/5] Installing dependencies...
if not exist "node_modules" (
    echo Installing backend dependencies...
    "%NPM_EXE%" install --silent
)
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    "%NPM_EXE%" install --silent
    cd ..
)

echo [3/5] Setting up environment...
:: Create minimal .env file if it doesn't exist
if not exist ".env" (
    echo NODE_ENV=development > .env
    echo PORT=3002 >> .env
    echo CORS_ORIGINS=http://localhost:3000 >> .env
)

:: Create minimal frontend .env.local if it doesn't exist
if not exist "frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:3002 > frontend\.env.local
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000 >> frontend\.env.local
)

echo [4/5] Starting backend server...
echo Backend starting on http://localhost:3002
start "ExpenseFlow Backend" cmd /k "title ExpenseFlow Backend && echo Backend Server && echo ================== && echo Starting simple server (no database required)... && "%NODE_EXE%" simple-server.js"
timeout /t 5 >nul

echo [5/5] Starting frontend server...
echo Frontend starting on http://localhost:3000
echo This may take 30-60 seconds for compilation...
cd frontend
start "ExpenseFlow Frontend" cmd /k "title ExpenseFlow Frontend && echo Frontend Server && echo ================== && echo Starting Next.js development server... && set NODE_OPTIONS=--max-old-space-size=4096 && "%NPM_EXE%" run dev"
cd ..

echo.
echo ==========================================
echo           STARTUP COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:3002
echo Frontend: http://localhost:3000
echo Health:   http://localhost:3002/api/health
echo.
echo IMPORTANT NOTES:
echo - Backend uses simple-server.js (no database required)
echo - Frontend may take 30-60 seconds to compile
echo - Both servers run in separate windows
echo - Use any email/password to login
echo.
echo Opening browser in 10 seconds...
timeout /t 10 >nul
start http://localhost:3000

echo.
echo Press any key to close this startup window...
echo (The servers will continue running in their own windows)
pause >nul 