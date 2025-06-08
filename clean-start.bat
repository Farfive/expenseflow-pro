@echo off
title ExpenseFlow Pro - Clean Start
color 0C

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - CLEAN START
echo ==========================================
echo.

REM Kill ALL Node processes aggressively
echo [1/7] Aggressively cleaning up all Node processes...
wmic process where "name='node.exe'" delete >nul 2>&1
wmic process where "name='npm.exe'" delete >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
timeout /t 3 /nobreak >nul

REM Kill processes on specific ports
echo [2/7] Freeing up ports 3000, 4000, 4001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4001') do taskkill /f /pid %%a >nul 2>&1
timeout /t 2 /nobreak >nul

REM Verify ports are free
echo [3/7] Verifying ports are free...
netstat -ano | findstr :3000 >nul && echo WARNING: Port 3000 still in use
netstat -ano | findstr :4000 >nul && echo WARNING: Port 4000 still in use  
netstat -ano | findstr :4001 >nul && echo WARNING: Port 4001 still in use

REM Check dependencies
echo [4/7] Checking dependencies...
if not exist "node_modules\express" (
    echo Installing backend dependencies...
    npm install
)
if not exist "frontend\node_modules\next" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

REM Start backend with explicit configuration
echo [5/7] Starting backend server (simple-server.js) on port 4001...
echo Starting backend with: set PORT=4001 ^&^& node simple-server.js
start "ExpenseFlow Backend" cmd /k "echo Backend Starting... && set PORT=4001 && set NODE_ENV=development && node simple-server.js"

REM Wait longer for backend to start
echo [6/7] Waiting for backend to fully initialize...
timeout /t 10 /nobreak >nul

REM Test backend connectivity
echo Testing backend connectivity...
curl -s http://localhost:4001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is responding on port 4001
) else (
    echo ❌ Backend is not responding on port 4001
    echo Checking if it started on a different port...
    curl -s http://localhost:3000/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo ⚠️ Backend is running on port 3000 instead of 4001
        echo This indicates a configuration issue
    )
)

REM Start frontend
echo [7/7] Starting frontend server on port 4000...
cd frontend
echo Starting frontend with: set PORT=4000 ^&^& npm run dev
start "ExpenseFlow Frontend" cmd /k "echo Frontend Starting... && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4001 && npm run dev"

REM Wait and open browser
echo Waiting for frontend to start...
timeout /t 12 /nobreak >nul
start http://localhost:4000

echo.
echo ==========================================
echo          STARTUP COMPLETE!
echo ==========================================
echo.
echo Expected Configuration:
echo Backend:  http://localhost:4001/api/health
echo Frontend: http://localhost:4000
echo.
echo If you see errors:
echo 1. Check the backend terminal window for errors
echo 2. Check the frontend terminal window for errors
echo 3. Verify ports in browser: 
echo    - http://localhost:4001/api/health (should show backend status)
echo    - http://localhost:4000 (should show frontend)
echo.
echo Press any key to close this window...
pause >nul 