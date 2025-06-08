@echo off
title ExpenseFlow Pro - Quick Fix
color 0B

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - QUICK FIX
echo ==========================================
echo.

REM Kill all Node processes
echo [1/5] Killing all Node processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 3 /nobreak >nul

REM Backup current config and use simplified one
echo [2/5] Using simplified Next.js configuration...
cd frontend
if exist next.config.js (
    copy next.config.js next.config.js.backup >nul 2>&1
)
copy next.config.simple-fix.js next.config.js >nul 2>&1
cd ..

REM Start backend
echo [3/5] Starting backend on port 4005...
start "Backend" cmd /k "title ExpenseFlow Backend && echo Backend starting... && set PORT=4005 && node simple-server.js"

REM Wait for backend
timeout /t 6 /nobreak >nul

REM Start frontend with simplified config
echo [4/5] Starting frontend with simplified config...
start "Frontend" cmd /k "title ExpenseFlow Frontend && echo Frontend starting with simplified config... && cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && npm run dev"

REM Wait and test
echo [5/5] Waiting for services to start...
timeout /t 20 /nobreak >nul

echo.
echo Testing services...
curl -s http://localhost:4005/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is responding
) else (
    echo ❌ Backend not responding
)

curl -s http://localhost:4000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding
    echo.
    echo 🎉 SUCCESS! Opening browser...
    start http://localhost:4000
) else (
    echo ❌ Frontend not responding yet
    echo.
    echo ⏳ Frontend may still be starting...
    echo Check the Frontend window for progress
    echo Try opening http://localhost:4000 manually in a few minutes
)

echo.
echo ==========================================
echo          QUICK FIX COMPLETE!
echo ==========================================
echo.
echo Backend:  http://localhost:4005/api/health
echo Frontend: http://localhost:4000
echo.
echo If frontend is still starting:
echo 1. Wait 2-3 more minutes
echo 2. Check the Frontend terminal window
echo 3. Try refreshing http://localhost:4000
echo.
echo Press any key to close...
pause >nul 