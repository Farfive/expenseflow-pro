@echo off
title ExpenseFlow Pro - Server Startup
color 0A

echo.
echo ==========================================
echo    STARTING EXPENSEFLOW PRO SERVERS
echo ==========================================
echo.

echo [1/4] Killing existing processes...
taskkill /f /im node.exe >nul 2>&1

echo [2/4] Starting backend server...
start "Backend" cmd /c "echo Starting backend on port 4001... && node test-backend.js && pause"

echo [3/4] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [4/4] Testing backend...
curl http://localhost:4001/api/health

echo.
echo Backend should be running on http://localhost:4001
echo.
echo Now start frontend manually with:
echo cd frontend
echo set PORT=4000 && npm run dev
echo.
pause 