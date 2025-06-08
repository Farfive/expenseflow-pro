@echo off
title ExpenseFlow Pro - Fast Start
color 0D

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - FAST START
echo ==========================================
echo.

REM Kill all Node processes
echo [1/4] Cleaning up processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start backend
echo [2/4] Starting backend (port 4005)...
start "Backend" cmd /k "title Backend Server && echo Starting backend... && set PORT=4005 && node simple-server.js"

REM Wait for backend
timeout /t 5 /nobreak >nul

REM Start frontend with turbo mode
echo [3/4] Starting frontend with TURBO mode (port 4000)...
start "Frontend" cmd /k "title Frontend Server && echo Starting frontend with TURBO... && cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && npm run dev:fast"

REM Wait and open browser
echo [4/4] Waiting for frontend to compile...
echo.
echo ⏳ Frontend is starting with Turbo mode (faster compilation)
echo ⏳ This may take 30-60 seconds for first startup
echo.

timeout /t 30 /nobreak >nul

echo Opening browser...
start http://localhost:4000

echo.
echo ==========================================
echo          FAST START COMPLETE!
echo ==========================================
echo.
echo Services:
echo ✅ Backend:  http://localhost:4005/api/health
echo ⏳ Frontend: http://localhost:4000 (may still be compiling)
echo.
echo IMPORTANT:
echo - Frontend uses Turbo mode for faster compilation
echo - First startup may take 1-2 minutes
echo - Check the Frontend window for "Local: http://localhost:4000"
echo - If page shows error, wait and refresh in 1 minute
echo.
echo Troubleshooting:
echo 1. Wait for "Ready" message in Frontend window
echo 2. Refresh browser if you see compilation errors
echo 3. Check both terminal windows for errors
echo.
echo Press any key to close...
pause >nul 