@echo off
title ExpenseFlow Pro - Clean Start
color 0A

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - CLEAN START
echo ==========================================
echo.

echo [1/4] Killing existing processes...
taskkill /f /im node.exe >nul 2>&1

echo [2/4] Starting backend server (Port 4001)...
start "Backend" /min cmd /k "node simple-server.js"

echo [3/4] Starting frontend server (Port 4000)...
cd frontend
start "Frontend" /min cmd /k "set PORT=4000 && npm run dev"

echo [4/4] Opening browser...
timeout /t 10 /nobreak >nul
start http://localhost:4000

echo.
echo ==========================================
echo          CLEAN START COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:4001
echo Frontend: http://localhost:4000
echo Login:    http://localhost:4000/auth/login
echo.
echo NOTES:
echo - All processes killed and restarted
echo - Using clean ports 4000/4001
echo - Login with any email/password
echo.
pause 