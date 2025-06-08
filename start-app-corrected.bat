@echo off
title ExpenseFlow Pro - Corrected Startup
color 0A

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - CORRECTED START
echo ==========================================
echo.

REM Kill any existing Node processes
echo [0/4] Cleaning up existing processes...
taskkill /f /im node.exe 2>nul || echo No Node processes to kill
timeout /t 2 /nobreak >nul

echo [1/4] Starting backend server on port 4001...
start "ExpenseFlow Backend" cmd /k "set PORT=4001 && node simple-server.js"

REM Wait for backend to start
echo [2/4] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo [3/4] Starting frontend server on port 4000...
cd frontend
start "ExpenseFlow Frontend" cmd /k "set PORT=4000 && npm run dev"

echo [4/4] Opening browser...
timeout /t 8 /nobreak >nul
start http://localhost:4000

echo.
echo ==========================================
echo          STARTUP COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:4001/api
echo Frontend: http://localhost:4000
echo.
echo NOTES:
echo - Backend runs on port 4001
echo - Frontend runs on port 4000
echo - Frontend proxies API calls to backend
echo - Use any email/password to login
echo.
echo Press any key to close this window...
pause >nul 