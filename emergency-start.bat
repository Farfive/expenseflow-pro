@echo off
title ExpenseFlow Pro - Emergency Start
color 0E

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - EMERGENCY START
echo ==========================================
echo.

REM Kill ALL Node processes aggressively
echo [1/6] Aggressively cleaning up all processes...
wmic process where "name='node.exe'" delete >nul 2>&1
wmic process where "name='npm.exe'" delete >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

REM Kill processes on all potential ports
echo [2/6] Freeing up all ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4003') do taskkill /f /pid %%a >nul 2>&1

REM Wait for cleanup
timeout /t 5 /nobreak >nul

REM Find available port for backend
echo [3/6] Finding available port for backend...
set BACKEND_PORT=4002
netstat -ano | findstr :4002 >nul && set BACKEND_PORT=4003
netstat -ano | findstr :4003 >nul && set BACKEND_PORT=4004
netstat -ano | findstr :4004 >nul && set BACKEND_PORT=4005

echo Using backend port: %BACKEND_PORT%

REM Find available port for frontend
echo [4/6] Finding available port for frontend...
set FRONTEND_PORT=4000
netstat -ano | findstr :4000 >nul && set FRONTEND_PORT=4010
netstat -ano | findstr :4010 >nul && set FRONTEND_PORT=4020

echo Using frontend port: %FRONTEND_PORT%

REM Start backend
echo [5/6] Starting backend on port %BACKEND_PORT%...
start "ExpenseFlow Backend" cmd /k "echo Backend starting on port %BACKEND_PORT%... && set PORT=%BACKEND_PORT% && node simple-server.js"

REM Wait for backend
timeout /t 8 /nobreak >nul

REM Update frontend configuration and start
echo [6/6] Starting frontend on port %FRONTEND_PORT%...
cd frontend

REM Create temporary environment file
echo PORT=%FRONTEND_PORT% > .env.local.temp
echo NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT% >> .env.local.temp
echo NEXT_PUBLIC_APP_URL=http://localhost:%FRONTEND_PORT% >> .env.local.temp

REM Start frontend with updated config
start "ExpenseFlow Frontend" cmd /k "echo Frontend starting on port %FRONTEND_PORT%... && set PORT=%FRONTEND_PORT% && set NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT% && npm run dev"

REM Wait and open browser
timeout /t 12 /nobreak >nul
start http://localhost:%FRONTEND_PORT%

echo.
echo ==========================================
echo          EMERGENCY START COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:%BACKEND_PORT%/api/health
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo If you see any errors:
echo 1. Check the backend terminal window
echo 2. Check the frontend terminal window
echo 3. Try refreshing the browser
echo.
echo Press any key to close this window...
pause >nul 