@echo off
title ExpenseFlow Pro - Working Start
color 0A

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - WORKING START
echo ==========================================
echo.

REM Kill existing processes
echo [1/4] Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start backend in new window
echo [2/4] Starting backend server...
start "ExpenseFlow Backend - Port 4005" cmd /k "title Backend Server && echo Starting ExpenseFlow Backend... && echo. && set PORT=4005 && node simple-server.js"

REM Wait for backend to start
echo [3/4] Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

REM Start frontend in new window
echo [4/4] Starting frontend server...
start "ExpenseFlow Frontend - Port 4000" cmd /k "title Frontend Server && echo Starting ExpenseFlow Frontend... && echo Connecting to backend on port 4005... && echo. && cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && npm run dev"

REM Wait and open browser
echo.
echo Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo ==========================================
echo          STARTUP COMPLETE!
echo ==========================================
echo.
echo Two new windows should have opened:
echo 1. Backend Server (Port 4005)
echo 2. Frontend Server (Port 4000)
echo.
echo Opening browser...
start http://localhost:4000

echo.
echo IMPORTANT:
echo - Backend: http://localhost:4005/api/health
echo - Frontend: http://localhost:4000
echo - Login with any email/password
echo.
echo If you see errors in the server windows:
echo 1. Check the Backend window for port conflicts
echo 2. Check the Frontend window for dependency issues
echo 3. Try refreshing the browser after both servers start
echo.
echo Press any key to close this window...
pause >nul 