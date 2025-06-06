@echo off
title ExpenseFlow Pro - Fast Startup
echo.
echo ⚡ FAST STARTUP MODE - ExpenseFlow Pro
echo =============================================
echo.

:: Kill any existing processes quickly
echo 🧹 Cleaning up processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

:: Start backend (fastest)
echo 🚀 Starting backend server...
start /B "Backend" cmd /c "node working-server.js"

:: Wait just 2 seconds for backend
timeout /t 2 /nobreak >nul

:: Clear Next.js cache for faster compilation
echo ⚡ Clearing cache for faster startup...
if exist frontend\.next rmdir /S /Q frontend\.next >nul 2>&1

:: Start frontend with fast options
echo 🎯 Starting optimized frontend...
start /B "Frontend" cmd /c "cd frontend && set NODE_OPTIONS=--max-old-space-size=4096 && npm run dev"

:: Open browser immediately (don't wait)
echo 🌐 Opening browser...
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ✅ ExpenseFlow Pro starting in FAST MODE!
echo.
echo 📍 URLs:
echo    Frontend: http://localhost:3000 (optimized)
echo    Backend:  http://localhost:3002
echo    Status:   http://localhost:3000/quick-test
echo.
echo 💡 The new interface loads INSTANTLY!
echo    No more waiting for heavy dependencies.
echo.
echo Press any key to close this window...
pause >nul 