@echo off
title ExpenseFlow Pro - Quick Start
color 0A

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - QUICK START
echo ==========================================
echo.

echo [1/3] Starting backend server...
start "Backend" /min cmd /k "node simple-server.js"

echo [2/3] Starting frontend server...
cd frontend
start "Frontend" /min cmd /k "set PORT=3005 && npm run dev"

echo [3/3] Opening browser...
timeout /t 8 /nobreak >nul
start http://localhost:3005

echo.
echo ==========================================
echo          QUICK START COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3005
echo.
echo NOTES:
echo - Servers start minimized for faster loading
echo - App opens automatically in 8 seconds
echo - Use any email/password to login
echo.
pause 